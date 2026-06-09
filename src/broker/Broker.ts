import { AgentRegistry } from "./AgentRegistry";
import { MessageBus } from "./MessageBus";
import { TaskRouter } from "./TaskRouter";
import { TaskQueue } from "../utils/TaskQueue";
import { RevisionHistory } from "../utils/RevisionHistory";
import { TaskProcessor } from "./TaskProcessor";
import { GraphOperations } from "./GraphOperations";
import { AgentGraph } from "../graph/AgentGraph";
import { AgentAdapter, TaskCreateOptions, Task, AgentProfile } from "../types";

/**
 * Broker — thin orchestrator.
 * Delegates all processing to TaskProcessor and GraphOperations.
 */
export class Broker {
  readonly registry: AgentRegistry;
  readonly bus: MessageBus;
  readonly router: TaskRouter;
  readonly queue: TaskQueue;
  readonly history: RevisionHistory;
  readonly graph: AgentGraph;
  readonly processor: TaskProcessor;
  readonly graphOps: GraphOperations;

  private dryRun = false;
  private running = false;
  private graphMode = false;

  constructor() {
    this.registry = new AgentRegistry();
    this.bus = new MessageBus();
    this.router = new TaskRouter(this.registry);
    this.queue = new TaskQueue();
    this.history = new RevisionHistory();
    this.graph = new AgentGraph();
    this.graphOps = new GraphOperations(this.graph, this.registry);
    this.processor = new TaskProcessor(this.registry, this.bus, this.router, this.queue, this.history, this.graphOps);
  }

  setDryRun(v: boolean): void { this.dryRun = v; }
  isGraphMode(): boolean { return this.graphMode; }
  enableGraphMode(): void { this.graphMode = true; }

  async registerAdapter(adapter: AgentAdapter) {
    const installed = await adapter.detect();
    const entry = await this.registry.register(adapter, installed);
    if (this.graphMode && installed) this.graphOps.registerRuntime(adapter);
    console.log(`  [registry] ${entry.name}: installed=${entry.installed}`);
    return entry;
  }

  async healthCheck(name: string): Promise<boolean> {
    const adapter = this.registry.getAdapter(name);
    if (!adapter) { console.log(`  [health] Unknown adapter: ${name}`); return false; }
    try {
      const ok = await adapter.health();
      const entry = this.registry.getEntry(name);
      if (entry) entry.healthy = ok;
      if (ok) this.graphOps.getCircuitBreaker().recordSuccess(name);
      return ok;
    } catch { return false; }
  }

  submit(opts: TaskCreateOptions): Task {
    const task = this.queue.create(opts);
    console.log(`  [queue] Task created: ${task.id}`);
    console.log(`          instruction: "${task.instruction}"`);
    console.log(`          executor: ${task.executor} → reviewer: ${task.reviewer}`);
    console.log(`          workingDirectory: ${task.workingDirectory}`);
    return task;
  }

  async run(): Promise<void> {
    this.running = true;
    const mode = this.dryRun ? "DRY-RUN" : "LIVE";
    const graphInfo = this.graphMode ? " (graph mode)" : " (v1.1 compat)";
    console.log(`\n  [broker] Started processing queue (${mode})${graphInfo}...\n`);

    while (this.running) {
      const task = this.queue.nextPending();
      if (!task) { console.log("  [broker] Queue empty. Done."); break; }
      await this.processor.process(task, this.graphMode);
    }
    this.running = false;
  }

  stop(): void { this.running = false; }

  migrateFromRegistry(): void {
    const entries = this.registry.all();
    const reportsToMap = new Map<string, string>();
    for (const entry of entries) {
      if (entry.reportsTo) reportsToMap.set(entry.name, entry.reportsTo);
    }
    if (reportsToMap.size > 0) {
      this.graph.migrateFromV1(reportsToMap);
      this.graphMode = true;
      console.log(`  [migrate] Converted ${reportsToMap.size} reportsTo link(s) to graph edges`);
    }
  }

  addAgentProfile(profile: AgentProfile): void {
    this.graph.addAgent(profile);
    if (!this.graphMode) this.graphMode = true;
  }

  addGraphEdge(from: string, to: string, relation: any, weight: number = 10): void {
    this.graph.addEdge({ from, to, relation, weight });
  }

  getGraph(): AgentGraph { return this.graph; }
  getConversations() { return this.graphOps.getConversations(); }
  getSafetyStatus() { return this.graphOps.getSafetyStatus(); }
  listTasks(): Task[] { return this.queue.all(); }
}

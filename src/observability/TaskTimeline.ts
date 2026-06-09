import * as fs from "fs";
import * as path from "path";

const TRACES_DIR = path.resolve(process.cwd(), ".agent-hive/traces");

export interface TimelineEvent {
  type: string;
  timestamp: number;
  data?: Record<string, any>;
}

export interface TaskTrace {
  taskId: string;
  status: string;
  events: TimelineEvent[];
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
}

export class TaskTimeline {
  private traces: Map<string, TaskTrace> = new Map();

  constructor() {
    fs.mkdirSync(TRACES_DIR, { recursive: true });
    this.loadPersisted();
  }

  start(taskId: string): TaskTrace {
    const trace: TaskTrace = {
      taskId,
      status: "started",
      events: [{ type: "created", timestamp: Date.now() }],
      startedAt: Date.now(),
    };
    this.traces.set(taskId, trace);
    this.persist(trace);
    return trace;
  }

  event(taskId: string, type: string, data?: Record<string, any>): void {
    const trace = this.traces.get(taskId);
    if (!trace) return;
    trace.events.push({ type, timestamp: Date.now(), data });
    this.persist(trace);
  }

  complete(taskId: string, status: string): void {
    const trace = this.traces.get(taskId);
    if (!trace) return;
    trace.status = status;
    trace.completedAt = Date.now();
    trace.durationMs = trace.completedAt - trace.startedAt;
    trace.events.push({ type: "completed", timestamp: Date.now(), data: { status } });
    this.persist(trace);
  }

  get(taskId: string): TaskTrace | undefined {
    return this.traces.get(taskId);
  }

  all(): TaskTrace[] {
    return Array.from(this.traces.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  format(taskId: string): string {
    const trace = this.traces.get(taskId);
    if (!trace) return `No trace found for ${taskId}`;

    const lines: string[] = [];
    lines.push(`Task: ${trace.taskId}`);
    lines.push(`Status: ${trace.status}`);
    lines.push(`Duration: ${trace.durationMs ?? "ongoing"}ms`);
    lines.push(`Events:`);

    for (const event of trace.events) {
      const relTime = event.timestamp - trace.startedAt;
      const dataStr = event.data ? ` ${JSON.stringify(event.data)}` : "";
      lines.push(`  +${relTime}ms  ${event.type}${dataStr}`);
    }

    return lines.join("\n");
  }

  private persist(trace: TaskTrace): void {
    const fp = path.join(TRACES_DIR, `task-${trace.taskId}.json`);
    fs.writeFileSync(fp, JSON.stringify(trace, null, 2));
  }

  private loadPersisted(): void {
    if (!fs.existsSync(TRACES_DIR)) return;
    for (const f of fs.readdirSync(TRACES_DIR)) {
      if (!f.startsWith("task-") || !f.endsWith(".json")) continue;
      try {
        const trace = JSON.parse(fs.readFileSync(path.join(TRACES_DIR, f), "utf-8"));
        this.traces.set(trace.taskId, trace);
      } catch {}
    }
  }
}

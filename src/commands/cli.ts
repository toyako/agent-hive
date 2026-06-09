#!/usr/bin/env node
import { Broker } from "../broker/Broker";
import { getAllAdapters, getMockAdapters, getAdapterNames } from "../adapters/registry";
import { GraphValidator } from "../graph/GraphValidator";
import { TopologyTemplates } from "../graph/TopologyTemplates";
import { TaskIntentClassifier } from "../product/TaskIntentClassifier";
import { AutoTopologySelector } from "../product/AutoTopologySelector";
import * as fs from "fs";
import * as path from "path";

const ARGS = process.argv.slice(2);
const CMD = ARGS[0];

async function main() {
  const broker = new Broker();

  switch (CMD) {
    case "setup": return cmdSetup();
    case "init": return cmdInit();
    case "detect": return cmdDetect(broker, ARGS);
    case "agents": return cmdAgents(broker);
    case "link": return cmdLink(broker, ARGS[1], ARGS[2]);
    case "graph": return cmdGraph(broker);
    case "graph-template": return cmdGraphTemplate(broker, ARGS);
    case "graph-validate": return cmdGraphValidate(broker);
    case "graph-migrate": return cmdGraphMigrate(broker);
    case "task": return cmdTask(broker, ARGS);
    case "run": return cmdRun(broker, ARGS);
    case "dashboard": return cmdDashboard();
    case "doctor": return cmdDoctor(broker);
    case "version": return cmdVersion();
    case "health": return cmdHealth(broker);
    case "history": return cmdHistory(broker, ARGS);
    case "help": return printUsage();
    default: printUsage();
  }
}

function cmdInit() {
  const base = path.resolve(process.cwd(), ".hive");
  const dirs = ["tasks", "messages", "logs", "memory", "history", "conversations", "traces", "metrics", "benchmark", "reports"];
  for (const d of dirs) fs.mkdirSync(path.join(base, d), { recursive: true });
  console.log("  ✓ Agent Hive initialized (v1.0)");
  console.log(`    ${base}/`);
  dirs.forEach((d) => console.log(`    ├── ${d}/`));
}

async function cmdDetect(broker: Broker, args: string[]) {
  const dryRun = args.includes("--dry-run");
  const healthCheck = args.includes("--health");

  console.log("\n  Scanning for agent runtimes...\n");

  const adapters = dryRun ? getMockAdapters() : getAllAdapters();
  for (const adapter of adapters) {
    await broker.registerAdapter(adapter);
  }

  if (healthCheck && !dryRun) {
    console.log("\n  Running health checks...\n");
    for (const name of getAdapterNames()) {
      const ok = await broker.healthCheck(name);
      console.log(`    ${name}: ${ok ? "✓ responsive" : "✗ not responding"}`);
    }
    console.log("\n  Note: Agent Hive does not manage Provider config.");
  }

  broker.migrateFromRegistry();
  console.log("\n  Scan complete.");
}

function cmdAgents(broker: Broker) {
  const entries = broker.registry.all();
  if (entries.length === 0) { console.log("\n  No agents registered. Run: hive detect\n"); return; }
  console.log("\n  Registered Agents:\n");
  for (const e of entries) {
    const status = e.healthy ? "✓" : "✗";
    const reports = e.reportsTo ? ` → ${e.reportsTo}` : "";
    console.log(`    ${status} ${e.name} [${e.role}]${reports}`);
    console.log(`      capabilities: ${e.capabilities.join(", ")}`);
  }
}

function cmdLink(broker: Broker, from?: string, to?: string) {
  if (!from || !to) { console.log("  Usage: hive link <from> <to>"); return; }
  broker.registry.link(from, to);
  console.log(`  ✓ Linked: ${from} → ${to}`);
}

function cmdGraph(broker: Broker) {
  const graph = broker.getGraph();
  const agents = graph.allAgents();
  const edges = graph.allEdges();
  if (agents.length === 0) { console.log("\n  No agents in graph.\n"); return; }
  console.log("\n  Graph:\n");
  console.log(`  Agents: ${agents.map(a => a.id).join(", ")}`);
  console.log(`  Edges: ${edges.length}`);
}

function cmdGraphTemplate(broker: Broker, args: string[]) {
  const template = args[1];
  const runtimes = args.slice(2);
  if (!template) { console.log("  Usage: hive graph-template <name> [runtimes...]"); return; }
  let result;
  switch (template) {
    case "simpleChain": result = TopologyTemplates.simpleChain(runtimes[0] || "executor", runtimes[1] || "reviewer"); break;
    case "planExecuteReview": result = TopologyTemplates.planExecuteReview(runtimes[0] || "planner", runtimes[1] || "executor", runtimes[2] || "reviewer"); break;
    case "pipeline": result = TopologyTemplates.pipeline(runtimes.length >= 2 ? runtimes : ["stage-1", "stage-2", "stage-3"]); break;
    case "peerReview": result = TopologyTemplates.peerReview(runtimes[0] || "agent-a", runtimes[1] || "agent-b"); break;
    case "fanOutReview": result = TopologyTemplates.fanOutReview(runtimes[0] || "executor", runtimes.slice(1).length ? runtimes.slice(1) : ["r1", "r2", "r3"]); break;
    default: console.log(`  Unknown template: ${template}`); return;
  }
  TopologyTemplates.apply(broker.getGraph(), result);
  broker.enableGraphMode();
  console.log(`  ✓ Applied template: ${result.description}`);
}

function cmdGraphValidate(broker: Broker) {
  const validator = new GraphValidator();
  const report = validator.validate(broker.getGraph());
  console.log("\n  Graph Validation:\n");
  console.log(`  Cycles: ${report.cycles.length}`);
  console.log(`  Review loops: ${report.reviewLoops.length}`);
  console.log(`  Isolated agents: ${report.isolatedAgents.length}`);
  if (report.isValid) console.log("  ✓ Graph is valid");
  else console.log("  ✗ Graph has issues");
}

function cmdGraphMigrate(broker: Broker) {
  broker.migrateFromRegistry();
}

function cmdTask(broker: Broker, args: string[]) {
  const executor = getArg(args, "--executor") || getAdapterNames()[0];
  const reviewer = getArg(args, "--reviewer") || getAdapterNames()[0];
  const instruction = getArg(args, "--instruction") || args.slice(1).join(" ");
  const workDir = getArg(args, "--dir") || process.cwd();
  const maxRevision = parseInt(getArg(args, "--max-revision") || "3", 10);
  if (!instruction) { console.log('  Usage: hive task --instruction "do something" [--dir /path]'); return; }
  broker.submit({ instruction, executor, reviewer, workingDirectory: workDir, maxRevision });
}

async function cmdRun(broker: Broker, args: string[]) {
  const task = getArg(args, "--task");
  const dryRun = args.includes("--dry-run");
  const workDir = getArg(args, "--dir") || process.cwd();
  const maxRevision = parseInt(getArg(args, "--max-revision") || "3", 10);

  // Clean stale tasks
  cleanTasks();

  // Register adapters
  if (dryRun) {
    console.log("  [mode] DRY-RUN (using mock adapters)\n");
    broker.setDryRun(true);
    await cmdDetect(broker, ["--dry-run"]);
  } else {
    console.log("  [mode] LIVE (using real agent runtimes)\n");
    await cmdDetect(broker, []);
  }

  if (task) {
    // Unified entry: auto-classify and select topology
    const classifier = new TaskIntentClassifier();
    const adapters = broker.registry.all().map(e => {
      const adapter = broker.registry.getAdapter(e.name);
      return adapter!;
    }).filter(Boolean);
    const selector = new AutoTopologySelector(adapters);

    const classification = classifier.classify(task);
    const selection = selector.select(classification.intent);

    console.log(`\n  [classify] Intent: ${classification.intent} (confidence: ${classification.confidence})`);
    console.log(`  [classify] Keywords: ${classification.keywords.join(", ")}`);
    console.log(`  [select]   ${selection.reason}`);
    console.log(`  [select]   Topology: ${selection.topology}\n`);

    // Build graph
    broker.addAgentProfile({ id: selection.executor, runtimeId: selection.executor, role: "executor", maxConcurrency: 1, status: "idle" });
    broker.addAgentProfile({ id: selection.reviewer, runtimeId: selection.reviewer, role: "reviewer", maxConcurrency: 1, status: "idle" });
    broker.addGraphEdge(selection.executor, selection.reviewer, "reviews", 10);
    broker.addGraphEdge(selection.reviewer, selection.executor, "escalates", 5);
    broker.enableGraphMode();

    broker.submit({
      instruction: task,
      executor: selection.executor,
      reviewer: selection.reviewer,
      workingDirectory: workDir,
      maxRevision,
    });
  }

  await broker.run();

  // Print results
  const tasks = broker.listTasks();
  if (tasks.length > 0) {
    const t = tasks[0];
    const history = broker.history.get(t.id);
    const lastReview = history[history.length - 1];
    console.log(`\n  ┌─────────────────────────────────────┐`);
    console.log(`  │ Result                               │`);
    console.log(`  ├─────────────────────────────────────┤`);
    console.log(`  │ Status:    ${t.status.padEnd(24)}│`);
    console.log(`  │ Revisions: ${String(t.revisionCount).padEnd(24)}│`);
    console.log(`  │ Score:     ${String(lastReview?.score || "N/A").padEnd(24)}│`);
    console.log(`  │ Decision:  ${String(lastReview?.decision || "N/A").padEnd(24)}│`);
    console.log(`  └─────────────────────────────────────┘`);
  }
}

function cleanTasks() {
  const tasksDir = path.resolve(process.cwd(), ".hive/tasks");
  if (fs.existsSync(tasksDir)) {
    for (const f of fs.readdirSync(tasksDir).filter(f => f.endsWith(".json"))) {
      fs.unlinkSync(path.join(tasksDir, f));
    }
  }
}

function cmdHistory(broker: Broker, args: string[]) {
  const taskId = args[1];
  if (taskId) {
    const records = broker.history.get(taskId);
    if (records.length === 0) { console.log(`  No history for ${taskId}`); return; }
    console.log(`\n  Revision History for ${taskId}:\n`);
    for (const r of records) {
      console.log(`    #${r.attempt} ${r.decision} (score=${r.score}) ${r.timestamp}`);
      if (r.issues.length) console.log(`      issues: ${r.issues.join(", ")}`);
    }
  } else {
    const all = broker.history.all();
    if (all.length === 0) { console.log("  No revision history."); return; }
    console.log(`\n  Revision History (${all.length} records):\n`);
    for (const r of all) console.log(`    ${r.taskId} #${r.attempt} ${r.decision} (score=${r.score})`);
  }
}

async function cmdSetup() {
  const readline = require("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>(resolve => rl.question(q, resolve));

  console.log("\n  🐝 Welcome to Agent Hive Setup\n");

  const baseUrl = await ask("  Base URL (e.g., https://api.openai.com/v1): ");
  const apiKey = await ask("  API Key: ");

  console.log("\n  Probing available models...");

  // Try to fetch models
  let models: string[] = [];
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json() as any;
      models = (data.data || []).map((m: any) => m.id).slice(0, 10);
    }
  } catch {}

  let model = "gpt-4";
  if (models.length > 0) {
    console.log("\n  Available models:");
    models.forEach((m, i) => console.log(`    ${i + 1}. ${m}`));
    const choice = await ask("\n  Select model (number or name): ");
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < models.length) {
      model = models[idx];
    } else if (choice) {
      model = choice;
    }
  } else {
    model = await ask("  Model name (e.g., gpt-4): ") || "gpt-4";
  }

  rl.close();

  // Save config
  const configDir = path.resolve(process.cwd(), ".agent-hive");
  fs.mkdirSync(configDir, { recursive: true });

  const config = {
    provider: "openai-compatible",
    baseUrl,
    apiKey,
    model,
  };
  fs.writeFileSync(path.join(configDir, "config.json"), JSON.stringify(config, null, 2));

  // Also update runtime.json for backward compatibility
  const runtimeConfig: any = {};
  for (const name of ["codex", "claude", "hermes"]) {
    runtimeConfig[name] = {
      binary: "openai-sdk",
      model,
      env: {
        OPENAI_API_KEY: apiKey,
        OPENAI_BASE_URL: baseUrl,
      },
    };
  }
  fs.writeFileSync("runtime.json", JSON.stringify(runtimeConfig, null, 2));

  console.log(`\n  ✓ Configuration saved to .agent-hive/config.json`);
  console.log(`  ✓ Runtime config saved to runtime.json`);
  console.log(`  ✓ Model: ${model}`);
  console.log(`\n  Run: hive run --task "your first task"\n`);
}

function cmdVersion() {
  console.log(`
  Agent Hive v1.0.0
  TypeScript: 5.8.3
  Node.js: ${process.version}
  Platform: ${process.platform} ${process.arch}
  `);
}

async function cmdDoctor(broker: Broker) {
  console.log("\n  Agent Hive Doctor\n");

  // 1. Check .agent-hive directory
  const base = path.resolve(process.cwd(), ".hive");
  const requiredDirs = ["tasks", "messages", "logs", "memory", "history", "conversations", "traces", "metrics", "benchmark", "reports"];
  let dirOk = true;
  for (const d of requiredDirs) {
    const exists = fs.existsSync(path.join(base, d));
    if (!exists) { console.log(`  ✗ Missing: .hive/${d}`); dirOk = false; }
  }
  if (dirOk) console.log("  ✓ .agent-hive directory structure OK");

  // 2. Check runtime.json
  const runtimePath = path.resolve(process.cwd(), "runtime.json");
  if (fs.existsSync(runtimePath)) {
    const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf-8"));
    const runtimes = Object.keys(runtime);
    console.log(`  ✓ runtime.json found (${runtimes.join(", ")})`);

    // Check API keys
    for (const [name, cfg] of Object.entries(runtime)) {
      const r = cfg as any;
      const hasKey = r.env?.OPENAI_API_KEY || r.env?.ANTHROPIC_API_KEY;
      console.log(`    ${hasKey ? "✓" : "✗"} ${name}: API key ${hasKey ? "configured" : "MISSING"}`);
    }
  } else {
    console.log("  ✗ runtime.json not found");
  }

  // 3. Detect runtimes
  console.log("\n  Runtime Detection:\n");
  await cmdDetect(broker, []);

  // 4. Summary
  console.log("\n  ┌─────────────────────────────────────┐");
  console.log("  │ Doctor Summary                       │");
  console.log("  ├─────────────────────────────────────┤");
  console.log(`  │ Directories: ${dirOk ? "✓ OK" : "✗ Missing"}              │`);
  console.log(`  │ Runtimes:    ${broker.registry.all().length} detected             │`);
  console.log("  └─────────────────────────────────────┘\n");
}

async function cmdHealth(broker: Broker) {
  console.log("\n  Health Check\n");
  await cmdDetect(broker, []);

  console.log("\n  Running health checks...\n");
  for (const entry of broker.registry.all()) {
    const ok = await broker.healthCheck(entry.name);
    const status = ok ? "✓ healthy" : "✗ unhealthy";
    console.log(`    ${entry.name}: ${status}`);
  }
  console.log("");
}

function cmdDashboard() {
  const { execSync } = require("child_process");
  // generate-dashboard.js is a plain JS file in src/ (not compiled)
  const script = path.resolve(__dirname, "../../src/commands/generate-dashboard.js");
  try {
    execSync(`node ${script}`, { stdio: "inherit" });
  } catch {
    console.log("  ✗ Failed to generate dashboard");
  }
}

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  return args[idx + 1];
}

function printUsage() {
  console.log(`
  Agent Hive v1.0

  Quick Start:
    hive setup                        First-time setup
    hive run --task "Build a landing page"     Auto-select everything

  Commands:
    setup                             First-time setup wizard
    init                              Initialize .agent-hive directory
    detect [--dry-run] [--health]     Scan for agent runtimes
    agents                            List registered agents
    link <from> <to>                  Link two agents
    graph                             Show agent graph
    graph-template <name> [runtimes]  Apply topology template
    graph-validate                    Validate graph structure
    graph-migrate                     Migrate v1.1 registry to graph
    task --instruction "..."          Submit a task (manual)
      --executor <name>                 Executor agent
      --reviewer <name>                 Reviewer agent
      --dir /path/to/project            Working directory
      --max-revision 3                  Max revision attempts
    run --task "..."                  Unified entry (auto everything)
      --dir /path/to/project            Working directory
      --max-revision 3                  Max revision attempts
      --dry-run                         Use mock adapters
    dashboard                         Generate visual dashboard
    doctor                            Check system health
    version                           Show version info
    health                            Check runtime health
    history [task-id]                 View revision history
  `);
}

main().then(() => { process.exit(0); }).catch((err) => { console.error("Fatal:", err); process.exit(1); });

// Force exit — OpenAI SDK HTTP agent keeps event loop alive
// Use a long timeout so real API calls can complete
setTimeout(() => process.exit(0), 600_000);

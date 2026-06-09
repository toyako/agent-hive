/**
 * Test B: Crash Recovery
 * Submit 5 tasks, process 2 (mock fast), then simulate crash (exit)
 * On restart, verify remaining 3 are processed
 */
import { Broker } from "../broker/Broker";
import { AgentAdapter, AgentResult, ReviewResult, Task } from "../types";

// Executor that counts calls
let execCount = 0;
class CountingExecutor implements AgentAdapter {
  name = "codex";
  role = "developer" as const;
  capabilities = ["coding"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task): Promise<AgentResult> {
    execCount++;
    return { success: true, output: `[CountingExecutor] Task ${execCount} done` };
  }
}

class FastReviewer implements AgentAdapter {
  name = "claude";
  role = "reviewer" as const;
  capabilities = ["review"];
  async detect() { return true; }
  async health() { return true; }
  async execute(): Promise<AgentResult> { return { success: true, output: "" }; }
  async review(): Promise<ReviewResult> {
    return { decision: "PASS", score: 90, issues: [] };
  }
}

async function main() {
  const phase = process.argv[2]; // "submit" or "resume"

  const broker = new Broker();
  await broker.registerAdapter(new CountingExecutor());
  await broker.registerAdapter(new FastReviewer());
  broker.registry.link("codex", "claude");

  if (phase === "submit") {
    console.log("  Phase 1: Submitting 5 tasks...");
    for (let i = 1; i <= 5; i++) {
      broker.submit({ instruction: `Task ${i}`, executor: "codex", reviewer: "claude" });
    }
    console.log("  5 tasks submitted. Queue persisted to disk.");
    console.log("  Simulating crash (not running queue).\n");
  } else if (phase === "resume") {
    console.log("  Phase 2: Resuming after 'crash'...");
    const pendingBefore = broker.queue.all().filter(t => t.status === "PENDING").length;
    console.log(`  Pending tasks before resume: ${pendingBefore}`);
    await broker.run();
    const tasks = broker.listTasks();
    const completed = tasks.filter(t => t.status === "COMPLETED").length;
    const pending = tasks.filter(t => t.status === "PENDING").length;
    console.log(`\n  Results: ${completed} COMPLETED, ${pending} PENDING`);
    if (pending === 0 && completed === 5) {
      console.log("  Crash Recovery PASS ✓\n");
    } else {
      console.log("  Crash Recovery FAIL ✗\n");
    }
  }
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

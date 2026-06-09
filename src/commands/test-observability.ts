import { TaskTimeline } from "../observability/TaskTimeline";
import { ConversationTrace } from "../observability/ConversationTrace";
import { RuntimeMetrics } from "../observability/RuntimeMetrics";
import { DecisionRecorder } from "../observability/DecisionRecorder";
import * as fs from "fs";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { console.log(`    ✓ ${msg}`); passed++; }
  else { console.log(`    ✗ ${msg}`); failed++; }
}

function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  try { fs.rmSync(".agent-hive", { recursive: true, force: true }); } catch {}
  fs.mkdirSync(".agent-hive", { recursive: true });

  console.log("═══════════════════════════════════════════");
  console.log("  Test Suite: Observability (v2.1.6)");
  console.log("═══════════════════════════════════════════\n");

  // Test 1: TaskTimeline
  console.log("  [Test 1] TaskTimeline");
  console.log("  ────────────────────────────────────");
  {
    const tl = new TaskTimeline();
    tl.start("task-001");
    await sleep(5);
    tl.event("task-001", "routed", { executor: "codex" });
    await sleep(5);
    tl.event("task-001", "runtime-selected", { runtime: "codex" });
    await sleep(5);
    tl.event("task-001", "execute-start", {});
    await sleep(5);
    tl.event("task-001", "execute-done", { success: true });
    await sleep(5);
    tl.event("task-001", "review", { score: 88, decision: "PASS" });
    await sleep(5);
    tl.complete("task-001", "COMPLETED");

    const t = tl.get("task-001");
    assert(t !== undefined, "Trace exists");
    assert(t!.status === "COMPLETED", "Status: COMPLETED");
    assert(t!.events.length >= 7, "Events: " + t!.events.length);
    assert(t!.durationMs! > 0, "Duration: " + t!.durationMs + "ms");

    const fmt = tl.format("task-001");
    assert(fmt.includes("task-001"), "Format has task ID");
    assert(fmt.includes("COMPLETED"), "Format has status");
    assert(fs.existsSync(".agent-hive/traces/task-task-001.json"), "Trace file persisted");
    console.log("  Test 1: PASS ✓\n");
  }

  // Test 2: ConversationTrace
  console.log("  [Test 2] ConversationTrace");
  console.log("  ────────────────────────────────────");
  {
    const ct = new ConversationTrace();
    ct.start("conv-001", "task-002");
    await sleep(5);
    ct.record("conv-001", { from: "broker", to: "planner", type: "TASK", payload: "Design API", timestamp: Date.now() });
    await sleep(5);
    ct.record("conv-001", { from: "planner", to: "executor", type: "DELEGATE", payload: "Build /users", timestamp: Date.now() });
    await sleep(5);
    ct.record("conv-001", { from: "executor", to: "reviewer", type: "RESULT", payload: "Code done", timestamp: Date.now() });
    await sleep(5);
    ct.record("conv-001", { from: "reviewer", to: "executor", type: "REVIEW", payload: "PASS score=90", timestamp: Date.now() });

    const t = ct.get("conv-001");
    assert(t !== undefined, "Conversation trace exists");
    assert(t!.messages.length === 4, "Messages: " + t!.messages.length);

    const byTask = ct.getByTaskId("task-002");
    assert(byTask !== undefined, "Found by taskId");

    const fmt = ct.format("conv-001");
    assert(fmt.includes("planner → executor"), "Format shows flow");
    assert(fs.existsSync(".agent-hive/traces/conversation-conv-001.json"), "Trace persisted");
    console.log("  Test 2: PASS ✓\n");
  }

  // Test 3: RuntimeMetrics
  console.log("  [Test 3] RuntimeMetrics");
  console.log("  ────────────────────────────────────");
  {
    const m = new RuntimeMetrics();
    m.record("claude", { success: true, latencyMs: 3000, reviewScore: 90 });
    m.record("claude", { success: true, latencyMs: 5000, reviewScore: 85 });
    m.record("claude", { success: false, latencyMs: 10000, reviewScore: 40 });
    m.record("codex", { success: true, latencyMs: 2000, reviewScore: 88 });
    m.record("hermes", { success: true, latencyMs: 1500, reviewScore: 75 });

    const c = m.get("claude");
    assert(c !== undefined, "Claude metrics exist");
    assert(c!.taskCount === 3, "Task count: " + c!.taskCount);
    assert(Math.abs(c!.successRate - 2/3) < 0.01, "Success rate: " + c!.successRate.toFixed(2));
    assert(c!.avgLatency === 6000, "Avg latency: " + c!.avgLatency);

    const fmt = m.format();
    assert(fmt.includes("claude"), "Format includes claude");
    assert(fmt.includes("codex"), "Format includes codex");
    assert(fs.existsSync(".agent-hive/metrics/runtime.json"), "Metrics persisted");
    console.log("  Test 3: PASS ✓\n");
  }

  // Test 4: DecisionRecorder
  console.log("  [Test 4] DecisionRecorder");
  console.log("  ────────────────────────────────────");
  {
    const dr = new DecisionRecorder();
    dr.runtimeSelection("task-003", "codex", ["codex", "claude", "hermes"], "highest score for coding");
    dr.escalation("task-003", "executor", "senior-executor", "maxRevisionReached");
    dr.consensus("task-003", "majority", 1, 2, "FAIL");

    const d = dr.get("task-003");
    assert(d.length === 3, "Decisions: " + d.length);

    const fmt = dr.format("task-003");
    assert(fmt.includes("runtime-selection"), "Has runtime-selection");
    assert(fmt.includes("escalation"), "Has escalation");
    assert(fmt.includes("consensus"), "Has consensus");
    assert(fmt.includes("majority"), "Has strategy");
    assert(fs.existsSync(".agent-hive/traces/decisions-task-003.jsonl"), "Decisions persisted");
    console.log("  Test 4: PASS ✓\n");
  }

  console.log("═══════════════════════════════════════════");
  console.log("  Results: " + passed + " passed, " + failed + " failed");
  console.log("═══════════════════════════════════════════");

  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

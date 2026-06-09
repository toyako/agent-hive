/**
 * Test: V2.0 Integration — Phase B Features
 *
 * Verifies:
 * 1. Multi-agent graph task (Planner→Executor→Reviewer)
 * 2. Escalation policy: executor fails → escalate to senior reviewer
 * 3. Multi-reviewer consensus: 2 reviewers majority voting
 * 4. Safety layer: hop limit + message dedup + circuit breaker
 * 5. v1.1 backward compatibility: old format task runs normally
 */
import { Broker } from "../broker/Broker";
import { ReviewConsensus, ReviewConsensusConfig } from "../review/ReviewConsensus";
import { CircuitBreaker } from "../safety/CircuitBreaker";
import { HopCounter } from "../safety/HopCounter";
import { MessageDeduplicator } from "../safety/MessageDeduplicator";
import * as fs from "fs";
import {
  AgentAdapter, AgentResult, ReviewResult, Task,
  AgentProfile, MessageEnvelope, EscalationPolicy,
} from "../types";

function cleanupBrokerState() {
  try { fs.rmSync(".agent-hive", { recursive: true, force: true }); } catch {}
}

// ─── Mock Adapters ────────────────────────────────────

class MockPlanner implements AgentAdapter {
  name = "planner";
  role = "planner" as const;
  capabilities = ["planning"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task): Promise<AgentResult> {
    await this.sleep(50);
    return { success: true, output: `[Planner] Plan: \"${task.instruction}\" → 3 steps` };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

class MockExecutor implements AgentAdapter {
  name = "executor";
  role = "developer" as const;
  capabilities = ["coding"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    await this.sleep(100);
    return { success: true, output: `[Executor] Completed: \"${instruction || task.instruction}\"` };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

class FailExecutor implements AgentAdapter {
  name = "fail-executor";
  role = "developer" as const;
  capabilities = ["coding"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    await this.sleep(50);
    return { success: true, output: `[FailExecutor] Buggy output for: \"${instruction || task.instruction}\"` };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

class SeniorExecutor implements AgentAdapter {
  name = "senior-executor";
  role = "developer" as const;
  capabilities = ["coding", "review"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    await this.sleep(100);
    return { success: true, output: `[SeniorExecutor] High quality: \"${instruction || task.instruction}\"` };
  }
  async review(task: Task): Promise<ReviewResult> {
    await this.sleep(50);
    return { decision: "PASS", score: 95, issues: [] };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

class MockReviewer implements AgentAdapter {
  name = "reviewer";
  role = "reviewer" as const;
  capabilities = ["review"];
  private failCount: number;
  private callCount = 0;
  constructor(opts?: { failCount?: number }) { this.failCount = opts?.failCount ?? 0; }
  async detect() { return true; }
  async health() { return true; }
  async execute(): Promise<AgentResult> { return { success: true, output: "" }; }
  async review(task: Task): Promise<ReviewResult> {
    await this.sleep(50);
    this.callCount++;
    if (this.callCount <= this.failCount) {
      return { decision: "FAIL", score: 40, issues: ["Mock issue: needs improvement"] };
    }
    return { decision: "PASS", score: 90, issues: [] };
  }
  getCallCount() { return this.callCount; }
  reset() { this.callCount = 0; }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

class StrictReviewer implements AgentAdapter {
  name = "strict-reviewer";
  role = "reviewer" as const;
  capabilities = ["review"];
  private callCount = 0;
  private failUntilCall: number;
  constructor(opts?: { failUntilCall?: number }) { this.failUntilCall = opts?.failUntilCall ?? Infinity; }
  async detect() { return true; }
  async health() { return true; }
  async execute(): Promise<AgentResult> { return { success: true, output: "" }; }
  async review(task: Task): Promise<ReviewResult> {
    this.callCount++;
    if (this.callCount <= this.failUntilCall) {
      return {
        decision: "FAIL",
        score: 20,
        issues: ["Critical: missing error handling", "Major: no unit tests"],
      };
    }
    return { decision: "PASS", score: 90, issues: [] };
  }
  getCallCount() { return this.callCount; }
  reset() { this.callCount = 0; }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

class LenientReviewer implements AgentAdapter {
  name = "lenient-reviewer";
  role = "reviewer" as const;
  capabilities = ["review"];
  private callCount = 0;
  async detect() { return true; }
  async health() { return true; }
  async execute(): Promise<AgentResult> { return { success: true, output: "" }; }
  async review(task: Task): Promise<ReviewResult> {
    this.callCount++;
    return {
      decision: "PASS",
      score: 75,
      issues: ["Minor: could add more comments"],
    };
  }
  getCallCount() { return this.callCount; }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

// ─── Test 1: Multi-agent graph task ───────────────────

async function test1_MultiAgentGraphTask(): Promise<boolean> {
  console.log("\n  [Test 1] Multi-Agent Graph Task (Planner→Executor→Reviewer)");
  console.log("  ─────────────────────────────────────────────────────────────");

  cleanupBrokerState();
  const broker = new Broker();
  let pass = true;

  // Register adapters
  await broker.registerAdapter(new MockPlanner());
  await broker.registerAdapter(new MockExecutor());
  await broker.registerAdapter(new MockReviewer());

  // Set up graph: planner → executor → reviewer
  broker.addAgentProfile({ id: "planner", runtimeId: "planner", role: "planner", maxConcurrency: 1, status: "idle" });
  broker.addAgentProfile({ id: "executor", runtimeId: "executor", role: "executor", maxConcurrency: 1, status: "idle" });
  broker.addAgentProfile({ id: "reviewer", runtimeId: "reviewer", role: "reviewer", maxConcurrency: 1, status: "idle" });
  broker.addGraphEdge("planner", "executor", "delegates", 10);
  broker.addGraphEdge("executor", "reviewer", "reviews", 10);
  broker.enableGraphMode();

  // Submit task
  broker.submit({
    instruction: "Create a REST API with Express",
    executor: "executor",
    reviewer: "reviewer",
  });

  await broker.run();

  const tasks = broker.listTasks();
  if (tasks.length !== 1) { console.log(`    ✗ Task count: ${tasks.length}`); pass = false; }
  else if (tasks[0].status !== "COMPLETED") { console.log(`    ✗ Task status: ${tasks[0].status}`); pass = false; }
  else console.log("    ✓ Task completed via multi-agent graph");

  // Verify graph has all agents
  const graph = broker.getGraph();
  if (graph.allAgents().length < 3) { console.log(`    ✗ Graph agents: ${graph.allAgents().length}`); pass = false; }
  else console.log("    ✓ Graph has 3+ agents");

  console.log(`\n  Test 1: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

// ─── Test 2: Escalation policy — escalate ─────────────

async function test2_EscalationPolicy(): Promise<boolean> {
  console.log("\n  [Test 2] Escalation Policy: executor fails → escalate to senior");
  console.log("  ─────────────────────────────────────────────────────────────");

  cleanupBrokerState();
  const broker = new Broker();
  let pass = true;

  // Register adapters
  await broker.registerAdapter(new FailExecutor());
  await broker.registerAdapter(new SeniorExecutor());
  await broker.registerAdapter(new StrictReviewer({ failUntilCall: 3 }));

  // Set up graph
  broker.addAgentProfile({ id: "fail-executor", runtimeId: "fail-executor", role: "executor", maxConcurrency: 1, status: "idle" });
  broker.addAgentProfile({ id: "senior-executor", runtimeId: "senior-executor", role: "executor", maxConcurrency: 1, status: "idle" });
  broker.addAgentProfile({ id: "strict-reviewer", runtimeId: "strict-reviewer", role: "reviewer", maxConcurrency: 1, status: "idle" });
  broker.addGraphEdge("fail-executor", "strict-reviewer", "reviews", 10);
  broker.addGraphEdge("senior-executor", "strict-reviewer", "reviews", 10);
  broker.enableGraphMode();

  // Submit with escalation policy
  broker.submit({
    instruction: "Create a secure authentication module",
    executor: "fail-executor",
    reviewer: "strict-reviewer",
    maxRevision: 2,
    escalationPolicy: {
      onMaxRevisionReached: "escalate",
      escalateTo: "senior-executor",
    },
  });

  await broker.run();

  const tasks = broker.listTasks();
  if (tasks.length !== 1) { console.log(`    ✗ Task count: ${tasks.length}`); pass = false; }
  else if (tasks[0].status !== "COMPLETED") { console.log(`    ✗ Task status: ${tasks[0].status} (expected COMPLETED)`); pass = false; }
  else console.log("    ✓ Task completed after escalation");

  // Verify the task executor was changed to senior-executor
  if (tasks[0].executor !== "senior-executor") {
    console.log(`    ✗ Executor not changed: ${tasks[0].executor}`);
    pass = false;
  } else {
    console.log("    ✓ Executor changed to senior-executor");
  }

  // Verify revision count was reset (should be 0 since senior-executor passed on first try)
  if (tasks[0].revisionCount !== 0) {
    console.log(`    ✗ Revision count not reset: ${tasks[0].revisionCount}`);
    pass = false;
  } else {
    console.log("    ✓ Revision count reset to 0 after escalation");
  }

  console.log(`\n  Test 2: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

// ─── Test 3: Multi-reviewer consensus ─────────────────

async function test3_MultiReviewerConsensus(): Promise<boolean> {
  console.log("\n  [Test 3] Multi-Reviewer Consensus (majority voting)");
  console.log("  ─────────────────────────────────────────────────────");

  let pass = true;

  // Scenario A: Majority — 2 PASS, 1 FAIL → PASS
  console.log("\n    [3a] Majority: 2 PASS + 1 FAIL → PASS");
  const consensusA = new ReviewConsensus({
    minReviewers: 2,
    consensusStrategy: "majority",
    onDisagreement: "highest-score",
  });

  const votesA = [
    { reviewerId: "reviewer-1", result: { decision: "PASS" as const, score: 85, issues: [] }, timestamp: Date.now() },
    { reviewerId: "reviewer-2", result: { decision: "PASS" as const, score: 80, issues: ["minor style issue"] }, timestamp: Date.now() },
    { reviewerId: "reviewer-3", result: { decision: "FAIL" as const, score: 50, issues: ["missing tests"] }, timestamp: Date.now() },
  ];

  const resultA = consensusA.resolve(votesA);
  if (resultA.finalDecision !== "PASS") {
    console.log(`      ✗ Expected PASS, got ${resultA.finalDecision}`);
    pass = false;
  } else {
    console.log(`      ✓ Majority PASS (${resultA.strategy})`);
  }

  // Scenario B: Majority — 1 PASS, 2 FAIL → FAIL
  console.log("\n    [3b] Majority: 1 PASS + 2 FAIL → FAIL");
  const consensusB = new ReviewConsensus({
    minReviewers: 2,
    consensusStrategy: "majority",
    onDisagreement: "highest-score",
  });

  const votesB = [
    { reviewerId: "reviewer-1", result: { decision: "PASS" as const, score: 70, issues: [] }, timestamp: Date.now() },
    { reviewerId: "reviewer-2", result: { decision: "FAIL" as const, score: 40, issues: ["critical bug"] }, timestamp: Date.now() },
    { reviewerId: "reviewer-3", result: { decision: "FAIL" as const, score: 30, issues: ["security hole"] }, timestamp: Date.now() },
  ];

  const resultB = consensusB.resolve(votesB);
  if (resultB.finalDecision !== "FAIL") {
    console.log(`      ✗ Expected FAIL, got ${resultB.finalDecision}`);
    pass = false;
  } else {
    console.log(`      ✓ Majority FAIL (${resultB.strategy})`);
  }

  // Scenario C: Unanimous — all PASS → PASS
  console.log("\n    [3c] Unanimous: all PASS → PASS");
  const consensusC = new ReviewConsensus({
    minReviewers: 2,
    consensusStrategy: "unanimous",
    onDisagreement: "highest-score",
  });

  const votesC = [
    { reviewerId: "reviewer-1", result: { decision: "PASS" as const, score: 90, issues: [] }, timestamp: Date.now() },
    { reviewerId: "reviewer-2", result: { decision: "PASS" as const, score: 85, issues: [] }, timestamp: Date.now() },
  ];

  const resultC = consensusC.resolve(votesC);
  if (resultC.finalDecision !== "PASS") {
    console.log(`      ✗ Expected PASS, got ${resultC.finalDecision}`);
    pass = false;
  } else {
    console.log(`      ✓ Unanimous PASS`);
  }

  // Scenario D: Unanimous — mixed → FAIL
  console.log("\n    [3d] Unanimous: mixed votes → FAIL");
  const votesD = [
    { reviewerId: "reviewer-1", result: { decision: "PASS" as const, score: 90, issues: [] }, timestamp: Date.now() },
    { reviewerId: "reviewer-2", result: { decision: "FAIL" as const, score: 40, issues: ["issue"] }, timestamp: Date.now() },
  ];

  const resultD = consensusC.resolve(votesD);
  if (resultD.finalDecision !== "FAIL") {
    console.log(`      ✗ Expected FAIL, got ${resultD.finalDecision}`);
    pass = false;
  } else {
    console.log(`      ✓ Unanimous FAIL (mixed votes)`);
  }

  // Scenario E: Best-score — highest score 80 → PASS
  console.log("\n    [3e] Best-score: highest 80 → PASS");
  const consensusE = new ReviewConsensus({
    minReviewers: 1,
    consensusStrategy: "best-score",
    onDisagreement: "highest-score",
  });

  const votesE = [
    { reviewerId: "reviewer-1", result: { decision: "FAIL" as const, score: 40, issues: ["bug"] }, timestamp: Date.now() },
    { reviewerId: "reviewer-2", result: { decision: "PASS" as const, score: 80, issues: [] }, timestamp: Date.now() },
  ];

  const resultE = consensusE.resolve(votesE);
  if (resultE.finalDecision !== "PASS") {
    console.log(`      ✗ Expected PASS, got ${resultE.finalDecision}`);
    pass = false;
  } else {
    console.log(`      ✓ Best-score PASS (score: ${resultE.score})`);
  }

  // Scenario F: Disagreement resolution via highest-score
  console.log("\n    [3f] Disagreement: 1 PASS + 1 FAIL, highest-score resolution");
  const consensusF = new ReviewConsensus({
    minReviewers: 2,
    consensusStrategy: "majority",
    onDisagreement: "highest-score",
  });

  const votesF = [
    { reviewerId: "reviewer-1", result: { decision: "PASS" as const, score: 75, issues: [] }, timestamp: Date.now() },
    { reviewerId: "reviewer-2", result: { decision: "FAIL" as const, score: 50, issues: ["issue"] }, timestamp: Date.now() },
  ];

  const resultF = consensusF.resolve(votesF);
  if (resultF.finalDecision !== "PASS") {
    console.log(`      ✗ Expected PASS (higher score), got ${resultF.finalDecision}`);
    pass = false;
  } else {
    console.log(`      ✓ Disagreement resolved via highest-score: PASS`);
  }

  // Scenario G: Disagreement via escalate
  console.log("\n    [3g] Disagreement: escalate resolution");
  const consensusG = new ReviewConsensus({
    minReviewers: 2,
    consensusStrategy: "majority",
    onDisagreement: "escalate",
  });

  const votesG = [
    { reviewerId: "reviewer-1", result: { decision: "PASS" as const, score: 70, issues: [] }, timestamp: Date.now() },
    { reviewerId: "reviewer-2", result: { decision: "FAIL" as const, score: 65, issues: ["issue"] }, timestamp: Date.now() },
  ];

  const resultG = consensusG.resolve(votesG);
  if (!resultG.resolution?.includes("escalated")) {
    console.log(`      ✗ Expected escalation resolution, got: ${resultG.resolution}`);
    pass = false;
  } else {
    console.log(`      ✓ Disagreement escalated (resolved via highest-score fallback)`);
  }

  console.log(`\n  Test 3: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

// ─── Test 4: Safety layer integration ─────────────────

async function test4_SafetyLayerIntegration(): Promise<boolean> {
  console.log("\n  [Test 4] Safety Layer Integration");
  console.log("  ─────────────────────────────────────────────────────");

  let pass = true;

  // 4a: HopCounter
  console.log("\n    [4a] HopCounter: message hop limit");
  const hc = new HopCounter(3);
  const msg: MessageEnvelope = {
    id: "test-msg-1",
    taskId: "task-1",
    conversationId: "conv-1",
    from: "agent-a",
    to: "agent-b",
    type: "TASK",
    payload: {},
    metadata: { hopCount: 0, maxHops: 3, priority: 5, routingPath: ["agent-a"] },
    timestamp: Date.now(),
  };

  if (hc.isExceeded(msg)) { console.log("      ✗ Should not be exceeded at hop 0"); pass = false; }
  else console.log("      ✓ Not exceeded at hop 0");

  let current = hc.increment(msg);
  current = hc.increment(current);
  current = hc.increment(current); // hop 3

  if (!hc.isExceeded(current)) { console.log("      ✗ Should be exceeded at hop 3"); pass = false; }
  else console.log("      ✓ Exceeded at hop 3 (limit reached)");

  // Cycle detection
  const msgWithPath: MessageEnvelope = {
    id: "test-msg-2",
    taskId: "task-1",
    conversationId: "conv-1",
    from: "agent-a",
    to: "agent-b",
    type: "TASK",
    payload: {},
    metadata: { hopCount: 1, maxHops: 10, priority: 5, routingPath: ["agent-a", "agent-b", "agent-c"] },
    timestamp: Date.now(),
  };

  if (!hc.wouldCreateCycle(msgWithPath, "agent-b")) { console.log("      ✗ Cycle not detected"); pass = false; }
  else console.log("      ✓ Cycle detection works");

  // 4b: MessageDeduplicator
  console.log("\n    [4b] MessageDeduplicator: duplicate detection");
  const dedup = new MessageDeduplicator(5000);

  const dup1 = makeEnvelope("a", "b", "t1", "c1", "TASK", { data: "hello" });
  const dup2 = makeEnvelope("a", "b", "t1", "c1", "TASK", { data: "hello" });
  const diff = makeEnvelope("a", "b", "t1", "c1", "TASK", { data: "world" });

  if (dedup.isDuplicate(dup1)) { console.log("      ✗ First message flagged as dup"); pass = false; }
  else console.log("      ✓ First message not duplicate");

  if (!dedup.isDuplicate(dup2)) { console.log("      ✗ Duplicate not detected"); pass = false; }
  else console.log("      ✓ Duplicate detected");

  if (dedup.isDuplicate(diff)) { console.log("      ✗ Different message flagged as dup"); pass = false; }
  else console.log("      ✓ Different message not duplicate");

  // 4c: CircuitBreaker
  console.log("\n    [4c] CircuitBreaker: state transitions");
  const cb = new CircuitBreaker({ threshold: 3, cooldownMs: 100 });

  if (!cb.isAvailable("agent-1")) { console.log("      ✗ Should be available initially"); pass = false; }
  else console.log("      ✓ Initially available (closed)");

  cb.recordFailure("agent-1");
  cb.recordFailure("agent-1");
  if (!cb.isAvailable("agent-1")) { console.log("      ✗ Should still be available after 2 failures"); pass = false; }
  else console.log("      ✓ Still available after 2 failures");

  cb.recordFailure("agent-1"); // 3rd → open
  if (cb.isAvailable("agent-1")) { console.log("      ✗ Should be unavailable after 3 failures"); pass = false; }
  else console.log("      ✓ Unavailable after threshold (open)");

  cb.recordSuccess("agent-1");
  if (!cb.isAvailable("agent-1")) { console.log("      ✗ Should be available after success"); pass = false; }
  else console.log("      ✓ Available after success (closed)");

  // 4d: Broker safety integration
  console.log("\n    [4d] Broker safety status");
  cleanupBrokerState();
  const broker = new Broker();
  await broker.registerAdapter(new MockExecutor());
  await broker.registerAdapter(new MockReviewer());
  broker.addAgentProfile({ id: "executor", runtimeId: "executor", role: "executor", maxConcurrency: 1, status: "idle" });
  broker.addAgentProfile({ id: "reviewer", runtimeId: "reviewer", role: "reviewer", maxConcurrency: 1, status: "idle" });
  broker.addGraphEdge("executor", "reviewer", "reviews", 10);
  broker.enableGraphMode();

  const safety = broker.getSafetyStatus();
  if (!safety.circuitBreaker || !safety.hopCounter || !safety.deduplicator) {
    console.log("      ✗ Safety status incomplete");
    pass = false;
  } else {
    console.log("      ✓ Broker safety status available");
  }

  console.log(`\n  Test 4: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

// ─── Test 5: v1.1 backward compatibility ──────────────

async function test5_V11BackwardCompat(): Promise<boolean> {
  console.log("\n  [Test 5] V1.1 Backward Compatibility");
  console.log("  ─────────────────────────────────────────────────────");

  cleanupBrokerState();
  const broker = new Broker();
  let pass = true;

  // Register adapters (v1.1 style — no graph mode)
  await broker.registerAdapter(new MockExecutor());
  await broker.registerAdapter(new MockReviewer());

  // Link v1.1 style
  broker.registry.link("executor", "reviewer");

  // Should NOT be in graph mode
  if (broker.isGraphMode()) { console.log("    ✗ Should not be in graph mode"); pass = false; }
  else console.log("    ✓ Not in graph mode (v1.1 compat)");

  // Submit and run v1.1 style
  broker.submit({
    instruction: "Create a utility function",
    executor: "executor",
    reviewer: "reviewer",
  });

  await broker.run();

  const tasks = broker.listTasks();
  if (tasks.length !== 1) { console.log(`    ✗ Task count: ${tasks.length}`); pass = false; }
  else if (tasks[0].status !== "COMPLETED") { console.log(`    ✗ Task status: ${tasks[0].status}`); pass = false; }
  else console.log("    ✓ Task completed via v1.1 path");

  // Verify no graph artifacts
  const convs = broker.getConversations().all();
  if (convs.length !== 0) { console.log(`    ✗ Conversations created in v1.1 mode: ${convs.length}`); pass = false; }
  else console.log("    ✓ No conversations in v1.1 mode");

  console.log(`\n  Test 5: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

// ─── Helper ───────────────────────────────────────────

function makeEnvelope(
  from: string, to: string, taskId: string, convId: string,
  type: MessageEnvelope["type"], payload: any
): MessageEnvelope {
  return {
    id: `env-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    taskId,
    conversationId: convId,
    from,
    to,
    type,
    payload,
    metadata: { hopCount: 0, maxHops: 10, priority: 5, routingPath: [from] },
    timestamp: Date.now(),
  };
}

// ─── Main ──────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Test Suite: V2.0 Integration (Phase B)");
  console.log("═══════════════════════════════════════════");

  const results: boolean[] = [];
  results.push(await test1_MultiAgentGraphTask());
  results.push(await test2_EscalationPolicy());
  results.push(await test3_MultiReviewerConsensus());
  results.push(await test4_SafetyLayerIntegration());
  results.push(await test5_V11BackwardCompat());

  // Cleanup
  cleanupBrokerState();

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed}/${total} passed`);
  console.log("═══════════════════════════════════════════\n");

  if (passed < total) process.exit(1);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

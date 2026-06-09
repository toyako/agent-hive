/**
 * Test: Graph Workflow — Multi-Agent Graph-Based Task Processing
 *
 * Verifies:
 * 1. AgentGraph setup with multiple agents and edges
 * 2. TopologyTemplates (simpleChain, planExecuteReview, pipeline)
 * 3. GraphValidator (cycle detection, isolation detection)
 * 4. MessageRouter routing through graph
 * 5. Broker v2.0 graph-mode task processing
 * 6. v1.1 → v2.0 migration (reportsTo → graph edges)
 */
import { Broker } from "../broker/Broker";
import { AgentGraph } from "../graph/AgentGraph";
import { GraphValidator } from "../graph/GraphValidator";
import { TopologyTemplates } from "../graph/TopologyTemplates";
import { MessageRouter } from "../broker/MessageRouter";
import * as fs from "fs";
import { AgentAdapter, AgentResult, ReviewResult, Task, AgentProfile, GraphEdge } from "../types";

function cleanupBrokerState() {
  try { fs.rmSync(".agent-hive", { recursive: true, force: true }); } catch {}
}

// ─── Mock Adapters ────────────────────────────────────

class MockExecutor implements AgentAdapter {
  name = "codex";
  role = "developer" as const;
  capabilities = ["coding"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    await this.sleep(100);
    return { success: true, output: `[MockExecutor] Completed: "${instruction || task.instruction}"` };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

class MockReviewer implements AgentAdapter {
  name = "claude";
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

class MockPlanner implements AgentAdapter {
  name = "planner";
  role = "planner" as const;
  capabilities = ["planning"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task): Promise<AgentResult> {
    await this.sleep(50);
    return { success: true, output: `[MockPlanner] Plan: "${task.instruction}" → 3 steps` };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

// ─── Test Functions ────────────────────────────────────

function test1_AgentGraphBasics(): boolean {
  console.log("\n  [Test 1] AgentGraph Basics");
  console.log("  ────────────────────────────────────");

  const graph = new AgentGraph("/tmp/test-graph-1");
  let pass = true;

  // Add agents
  graph.addAgent({ id: "executor", runtimeId: "codex", role: "executor", maxConcurrency: 1, status: "idle" });
  graph.addAgent({ id: "reviewer", runtimeId: "claude", role: "reviewer", maxConcurrency: 1, status: "idle" });
  graph.addAgent({ id: "planner", runtimeId: "planner", role: "planner", maxConcurrency: 1, status: "idle" });

  if (graph.allAgents().length !== 3) { console.log("    ✗ Agent count wrong"); pass = false; }
  else console.log("    ✓ 3 agents added");

  // Add edges
  graph.addEdge({ from: "planner", to: "executor", relation: "delegates", weight: 10 });
  graph.addEdge({ from: "executor", to: "reviewer", relation: "reviews", weight: 10 });
  graph.addEdge({ from: "reviewer", to: "executor", relation: "escalates", weight: 5 });

  if (graph.allEdges().length !== 3) { console.log("    ✗ Edge count wrong"); pass = false; }
  else console.log("    ✓ 3 edges added");

  // Test findReviewer
  const reviewer = graph.findReviewer("executor");
  if (reviewer !== "reviewer") { console.log(`    ✗ findReviewer returned: ${reviewer}`); pass = false; }
  else console.log("    ✓ findReviewer works");

  // Test findEscalationTarget
  const escTarget = graph.findEscalationTarget("reviewer");
  if (escTarget !== "executor") { console.log(`    ✗ findEscalationTarget returned: ${escTarget}`); pass = false; }
  else console.log("    ✓ findEscalationTarget works");

  // Test findPath
  const path = graph.findPath("planner", "reviewer");
  if (!path || path.length !== 3) { console.log(`    ✗ findPath returned: ${JSON.stringify(path)}`); pass = false; }
  else console.log("    ✓ findPath works (planner → executor → reviewer)");

  // Test getNextAgents
  const next = graph.getNextAgents("executor", "reviews");
  if (next.length !== 1 || next[0].to !== "reviewer") { console.log("    ✗ getNextAgents failed"); pass = false; }
  else console.log("    ✓ getNextAgents works");

  // Test toString
  const str = graph.toString();
  if (!str.includes("Agent Graph:") || !str.includes("executor")) { console.log("    ✗ toString failed"); pass = false; }
  else console.log("    ✓ toString works");

  console.log(`\n  Test 1: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

function test2_GraphValidator(): boolean {
  console.log("\n  [Test 2] GraphValidator");
  console.log("  ────────────────────────────────────");

  const graph = new AgentGraph("/tmp/test-graph-validator-" + Date.now());
  const validator = new GraphValidator();
  let pass = true;

  // Build a graph with a cycle
  graph.addAgent({ id: "a", runtimeId: "a", role: "executor", maxConcurrency: 1, status: "idle" });
  graph.addAgent({ id: "b", runtimeId: "b", role: "executor", maxConcurrency: 1, status: "idle" });
  graph.addAgent({ id: "c", runtimeId: "c", role: "reviewer", maxConcurrency: 1, status: "idle" });
  graph.addAgent({ id: "isolated", runtimeId: "iso", role: "executor", maxConcurrency: 1, status: "idle" });

  graph.addEdge({ from: "a", to: "b", relation: "delegates", weight: 10 });
  graph.addEdge({ from: "b", to: "c", relation: "reviews", weight: 10 });
  graph.addEdge({ from: "c", to: "a", relation: "escalates", weight: 5 });

  // Cycle detection
  const cycles = validator.detectCycles(graph);
  if (cycles.length === 0) { console.log("    ✗ Cycle not detected"); pass = false; }
  else console.log(`    ✓ Cycle detected: ${cycles.length} cycle(s)`);

  // Review loop detection: needs reviews + escalates between same pair
  // b→c (reviews) and c→b (escalates) = review loop
  const graph2 = new AgentGraph("/tmp/test-graph-reviewloop-" + Date.now());
  graph2.addAgent({ id: "executor", runtimeId: "ex", role: "executor", maxConcurrency: 1, status: "idle" });
  graph2.addAgent({ id: "reviewer", runtimeId: "rv", role: "reviewer", maxConcurrency: 1, status: "idle" });
  graph2.addEdge({ from: "executor", to: "reviewer", relation: "reviews", weight: 10 });
  graph2.addEdge({ from: "reviewer", to: "executor", relation: "escalates", weight: 5 });

  const loops = validator.detectReviewLoops(graph2);
  if (loops.length !== 1) { console.log(`    ✗ Review loop not detected (got ${loops.length})`); pass = false; }
  else console.log(`    ✓ Review loop detected: ${loops.length} loop(s)`);

  // Isolation detection
  const isolated = validator.findIsolatedAgents(graph);
  if (isolated.length !== 1 || isolated[0] !== "isolated") {
    console.log(`    ✗ Isolated agents: ${JSON.stringify(isolated)}`);
    pass = false;
  } else console.log("    ✓ Isolated agent detected");

  // Full validation
  const report = validator.validate(graph);
  if (report.cycles.length === 0 || report.isolatedAgents.length === 0) {
    console.log("    ✗ Full validation report incomplete");
    pass = false;
  } else console.log("    ✓ Full validation report generated");

  console.log(`\n  Test 2: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

function test3_TopologyTemplates(): boolean {
  console.log("\n  [Test 3] TopologyTemplates");
  console.log("  ────────────────────────────────────");

  let pass = true;

  // Simple chain
  const chain = TopologyTemplates.simpleChain("codex", "claude");
  if (chain.agents.length !== 2 || chain.edges.length !== 2) {
    console.log("    ✗ simpleChain wrong dimensions");
    pass = false;
  } else console.log("    ✓ simpleChain: 2 agents, 2 edges");

  // Plan-Execute-Review
  const per = TopologyTemplates.planExecuteReview("planner", "codex", "claude");
  if (per.agents.length !== 3 || per.edges.length !== 4) {
    console.log("    ✗ planExecuteReview wrong dimensions");
    pass = false;
  } else console.log("    ✓ planExecuteReview: 3 agents, 4 edges");

  // Pipeline
  const pipe = TopologyTemplates.pipeline(["codex", "claude", "codex"]);
  if (pipe.agents.length !== 3 || pipe.edges.length !== 2) {
    console.log("    ✗ pipeline wrong dimensions");
    pass = false;
  } else console.log("    ✓ pipeline: 3 stages, 2 edges");

  // Fan-out
  const fan = TopologyTemplates.fanOutReview("codex", ["claude", "codex", "claude"]);
  if (fan.agents.length !== 4 || fan.edges.length !== 3) {
    console.log("    ✗ fanOutReview wrong dimensions");
    pass = false;
  } else console.log("    ✓ fanOutReview: 4 agents, 3 edges");

  // Peer review
  const peer = TopologyTemplates.peerReview("codex", "claude");
  if (peer.agents.length !== 2 || peer.edges.length !== 4) {
    console.log("    ✗ peerReview wrong dimensions");
    pass = false;
  } else console.log("    ✓ peerReview: 2 agents, 4 edges");

  // Apply template to graph
  const graph = new AgentGraph("/tmp/test-graph-3");
  TopologyTemplates.apply(graph, chain);
  if (graph.allAgents().length !== 2) {
    console.log("    ✗ apply template failed");
    pass = false;
  } else console.log("    ✓ Template applied to graph");

  console.log(`\n  Test 3: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

function test4_MessageRouter(): boolean {
  console.log("\n  [Test 4] MessageRouter");
  console.log("  ────────────────────────────────────");

  const graph = new AgentGraph("/tmp/test-graph-4");
  const router = new MessageRouter(graph);
  let pass = true;

  graph.addAgent({ id: "executor", runtimeId: "codex", role: "executor", maxConcurrency: 1, status: "idle" });
  graph.addAgent({ id: "reviewer", runtimeId: "claude", role: "reviewer", maxConcurrency: 1, status: "idle" });
  graph.addEdge({ from: "executor", to: "reviewer", relation: "reviews", weight: 10 });

  // Direct resolution
  const direct = router.resolve("executor");
  if (direct !== "executor") { console.log("    ✗ Direct resolution failed"); pass = false; }
  else console.log("    ✓ Direct agent id resolution");

  // Role resolution
  const roleResolved = router.resolve("role:reviewer");
  if (roleResolved !== "reviewer") { console.log(`    ✗ Role resolution: ${roleResolved}`); pass = false; }
  else console.log("    ✓ Role tag resolution");

  // findReviewer
  const reviewer = router.findReviewer("executor");
  if (reviewer !== "reviewer") { console.log(`    ✗ findReviewer: ${reviewer}`); pass = false; }
  else console.log("    ✓ findReviewer via graph");

  // validateRoute
  const errors = router.validateRoute("executor", "reviewer");
  if (errors.length !== 0) { console.log(`    ✗ validateRoute errors: ${errors}`); pass = false; }
  else console.log("    ✓ validateRoute passes");

  const badErrors = router.validateRoute("nonexistent", "reviewer");
  if (badErrors.length === 0) { console.log("    ✗ validateRoute should fail for nonexistent"); pass = false; }
  else console.log("    ✓ validateRoute catches missing agent");

  console.log(`\n  Test 4: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

function test5_V1Migration(): boolean {
  console.log("\n  [Test 5] V1.1 → V2.0 Migration");
  console.log("  ────────────────────────────────────");

  const graph = new AgentGraph("/tmp/test-graph-5");
  let pass = true;

  // Simulate v1.1 reportsTo map
  const reportsToMap = new Map<string, string>();
  reportsToMap.set("codex", "claude");

  graph.migrateFromV1(reportsToMap);

  if (graph.allAgents().length !== 2) {
    console.log(`    ✗ Migration agent count: ${graph.allAgents().length}`);
    pass = false;
  } else console.log("    ✓ 2 agents migrated");

  // Should have reviews edge and escalation edge
  if (graph.allEdges().length !== 2) {
    console.log(`    ✗ Migration edge count: ${graph.allEdges().length}`);
    pass = false;
  } else console.log("    ✓ 2 edges created (reviews + escalates)");

  // Verify edge directions
  const reviewEdges = graph.getEdgesByRelation("reviews");
  if (reviewEdges.length !== 1 || reviewEdges[0].from !== "codex" || reviewEdges[0].to !== "claude") {
    console.log("    ✗ Review edge wrong");
    pass = false;
  } else console.log("    ✓ Review edge: codex → claude");

  console.log(`\n  Test 5: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

async function test6_BrokerGraphMode(): Promise<boolean> {
  console.log("\n  [Test 6] Broker Graph Mode Task Processing");
  console.log("  ────────────────────────────────────");

  // Clean state
  cleanupBrokerState();

  const broker = new Broker();
  let pass = true;

  // Register mock adapters
  await broker.registerAdapter(new MockExecutor());
  await broker.registerAdapter(new MockReviewer());

  // Set up graph
  broker.addAgentProfile({ id: "codex", runtimeId: "codex", role: "executor", maxConcurrency: 1, status: "idle" });
  broker.addAgentProfile({ id: "claude", runtimeId: "claude", role: "reviewer", maxConcurrency: 1, status: "idle" });
  broker.addGraphEdge("codex", "claude", "reviews", 10);
  broker.enableGraphMode();

  if (!broker.isGraphMode()) { console.log("    ✗ Graph mode not enabled"); pass = false; }
  else console.log("    ✓ Graph mode enabled");

  // Submit and run a task
  broker.submit({
    instruction: "Create a hello world function",
    executor: "codex",
    reviewer: "claude",
  });

  await broker.run();

  const tasks = broker.listTasks();
  if (tasks.length !== 1) { console.log(`    ✗ Task count: ${tasks.length} (expected 1)`); pass = false; }
  else if (tasks[0].status !== "COMPLETED") { console.log(`    ✗ Task status: ${tasks[0].status}`); pass = false; }
  else console.log("    ✓ Task completed via graph mode");

  // Verify conversation was created
  const convs = broker.getConversations().all();
  if (convs.length === 0) { console.log("    ✗ No conversation created"); pass = false; }
  else console.log(`    ✓ Conversation created: ${convs[0].id}`);

  // Verify safety status
  const safety = broker.getSafetyStatus();
  if (!safety.circuitBreaker) { console.log("    ✗ Safety status missing"); pass = false; }
  else console.log("    ✓ Safety status available");

  console.log(`\n  Test 6: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

async function test7_BrokerV11Compat(): Promise<boolean> {
  console.log("\n  [Test 7] Broker V1.1 Backward Compatibility");
  console.log("  ────────────────────────────────────");

  // Clean state
  cleanupBrokerState();

  const broker = new Broker();
  let pass = true;

  // Register mock adapters (v1.1 style)
  await broker.registerAdapter(new MockExecutor());
  await broker.registerAdapter(new MockReviewer());

  // Link via v1.1 style
  broker.registry.link("codex", "claude");

  // Should NOT be in graph mode
  if (broker.isGraphMode()) { console.log("    ✗ Should not be in graph mode yet"); pass = false; }
  else console.log("    ✓ Not in graph mode (v1.1 compat)");

  // Submit and run v1.1 style
  broker.submit({
    instruction: "Create a utility function",
    executor: "codex",
    reviewer: "claude",
  });

  await broker.run();

  const tasks = broker.listTasks();
  if (tasks.length !== 1) { console.log(`    ✗ Task count: ${tasks.length}`); pass = false; }
  else if (tasks[0].status !== "COMPLETED") { console.log(`    ✗ Task status: ${tasks[0].status}`); pass = false; }
  else console.log("    ✓ Task completed via v1.1 path");

  console.log(`\n  Test 7: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

async function test8_BrokerAutoMigration(): Promise<boolean> {
  console.log("\n  [Test 8] Broker Auto-Migration (reportsTo → graph)");
  console.log("  ────────────────────────────────────");

  const broker = new Broker();
  let pass = true;

  // Register and link v1.1 style
  await broker.registerAdapter(new MockExecutor());
  await broker.registerAdapter(new MockReviewer());
  broker.registry.link("codex", "claude");

  // Auto-migrate: Broker should detect reportsTo and build graph
  broker.migrateFromRegistry();

  // Now graph should have agents and edges
  const agents = broker.getGraph().allAgents();
  const edges = broker.getGraph().allEdges();

  if (agents.length < 2) {
    console.log(`    ✗ After migration, agents: ${agents.length}`);
    pass = false;
  } else console.log(`    ✓ ${agents.length} agents in graph after migration`);

  if (edges.length < 1) {
    console.log(`    ✗ After migration, edges: ${edges.length}`);
    pass = false;
  } else console.log(`    ✓ ${edges.length} edges in graph after migration`);

  if (broker.isGraphMode()) {
    console.log("    ✓ Graph mode auto-enabled after migration");
  } else {
    console.log("    ⚠ Graph mode not auto-enabled (acceptable)");
  }

  console.log(`\n  Test 8: ${pass ? "PASS ✓" : "FAIL ✗"}`);
  return pass;
}

// ─── Main ──────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Test Suite: Graph Workflow (Phase 2)");
  console.log("═══════════════════════════════════════════");

  const results: boolean[] = [];
  results.push(test1_AgentGraphBasics());
  results.push(test2_GraphValidator());
  results.push(test3_TopologyTemplates());
  results.push(test4_MessageRouter());
  results.push(test5_V1Migration());
  results.push(await test6_BrokerGraphMode());
  results.push(await test7_BrokerV11Compat());
  results.push(await test8_BrokerAutoMigration());

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed}/${total} passed`);
  console.log("═══════════════════════════════════════════\n");

  if (passed < total) process.exit(1);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

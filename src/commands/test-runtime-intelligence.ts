/**
 * Test: Runtime Intelligence (v2.1.5)
 */
import { CapabilityDiscovery } from "../runtime/CapabilityDiscovery";
import { RuntimeScoreManager } from "../runtime/RuntimeScoreManager";
import { RuntimeSelector } from "../runtime/RuntimeSelector";
import { Broker } from "../broker/Broker";
import { AgentAdapter, AgentResult, ReviewResult, Task } from "../types";
import * as fs from "fs";

// ─── Mock Adapters with DISTINCT capabilities ────────

class MockPlannerAdapter implements AgentAdapter {
  name = "hermes";
  role = "planner" as const;
  capabilities = ["planning", "research"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task): Promise<AgentResult> {
    return { success: true, output: `{"capabilities": ["planning", "research"]}` };
  }
}

class MockCodingAdapter implements AgentAdapter {
  name = "codex";
  role = "developer" as const;
  capabilities = ["coding", "refactor"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task): Promise<AgentResult> {
    return { success: true, output: `{"capabilities": ["coding", "refactor"]}` };
  }
}

class MockReviewAdapter implements AgentAdapter {
  name = "claude";
  role = "reviewer" as const;
  capabilities = ["review", "architecture"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task): Promise<AgentResult> {
    return { success: true, output: `{"capabilities": ["review", "architecture"]}` };
  }
  async review(task: Task): Promise<ReviewResult> {
    return { decision: "PASS", score: 90, issues: [] };
  }
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`    ✓ ${msg}`);
    passed++;
  } else {
    console.log(`    ✗ ${msg}`);
    failed++;
  }
}

async function main() {
  // Clean persisted state
  try { fs.rmSync(".agent-hive", { recursive: true, force: true }); } catch {}
  fs.mkdirSync(".agent-hive", { recursive: true });

  console.log("═══════════════════════════════════════════");
  console.log("  Test Suite: Runtime Intelligence (v2.1.5)");
  console.log("═══════════════════════════════════════════\n");

  // ── Test 1: Capability Discovery ──
  console.log("  [Test 1] Capability Discovery");
  console.log("  ────────────────────────────────────");
  {
    const discovery = new CapabilityDiscovery();

    const r1 = await discovery.discover(new MockPlannerAdapter());
    assert(r1.capabilities.includes("planning"), "Planner has 'planning'");
    assert(r1.capabilities.includes("research"), "Planner has 'research'");
    assert(r1.confidence >= 0.8, `Confidence: ${r1.confidence}`);
    assert(r1.source === "merged", `Source: ${r1.source}`);

    const r2 = await discovery.discover(new MockCodingAdapter());
    assert(r2.capabilities.includes("coding"), "Coder has 'coding'");
    assert(r2.capabilities.includes("refactor"), "Coder has 'refactor'");

    const r3 = await discovery.discover(new MockReviewAdapter());
    assert(r3.capabilities.includes("review"), "Reviewer has 'review'");

    const coders = discovery.findByCapability("coding");
    assert(coders.length === 1, `Only 1 runtime with 'coding': ${coders.map(c=>c.runtimeId)}`);

    const planners = discovery.findByCapability("planning");
    assert(planners.length === 1, `Only 1 runtime with 'planning': ${planners.map(c=>c.runtimeId)}`);

    console.log("  Test 1: PASS ✓\n");
  }

  // ── Test 2: Runtime Score System ──
  console.log("  [Test 2] Runtime Score System");
  console.log("  ────────────────────────────────────");
  {
    const scoreManager = new RuntimeScoreManager();

    scoreManager.record({ runtimeId: "claude", role: "executor", success: true, latencyMs: 3000, reviewScore: 90, revisionCount: 0 });
    scoreManager.record({ runtimeId: "claude", role: "executor", success: true, latencyMs: 5000, reviewScore: 85, revisionCount: 1 });
    scoreManager.record({ runtimeId: "claude", role: "executor", success: false, latencyMs: 10000, reviewScore: 40, revisionCount: 3 });

    scoreManager.record({ runtimeId: "hermes", role: "executor", success: true, latencyMs: 2000, reviewScore: 88, revisionCount: 0 });
    scoreManager.record({ runtimeId: "hermes", role: "executor", success: true, latencyMs: 4000, reviewScore: 82, revisionCount: 0 });

    const claudeStats = scoreManager.get("claude");
    assert(claudeStats !== undefined, "Claude stats exist");
    assert(claudeStats!.taskCount === 3, `Claude task count: ${claudeStats!.taskCount}`);
    assert(Math.abs(claudeStats!.successRate - 2/3) < 0.01, `Claude success rate: ${claudeStats!.successRate.toFixed(2)}`);

    const hermesStats = scoreManager.get("hermes");
    assert(hermesStats!.successRate === 1.0, `Hermes success rate: ${hermesStats!.successRate}`);

    const claudeScore = scoreManager.getScore("claude");
    const hermesScore = scoreManager.getScore("hermes");
    assert(hermesScore > claudeScore, `Hermes (${hermesScore.toFixed(2)}) > Claude (${claudeScore.toFixed(2)})`);

    console.log("  Test 2: PASS ✓\n");
  }

  // ── Test 3: Auto Runtime Selection ──
  console.log("  [Test 3] Auto Runtime Selection");
  console.log("  ────────────────────────────────────");
  {
    const discovery = new CapabilityDiscovery();
    const scoreManager = new RuntimeScoreManager();
    const broker = new Broker();

    await broker.registerAdapter(new MockCodingAdapter());
    await broker.registerAdapter(new MockReviewAdapter());
    await broker.registerAdapter(new MockPlannerAdapter());

    await discovery.discover(new MockCodingAdapter());
    await discovery.discover(new MockReviewAdapter());
    await discovery.discover(new MockPlannerAdapter());

    scoreManager.record({ runtimeId: "codex", role: "executor", success: true, latencyMs: 2000, reviewScore: 85 });
    scoreManager.record({ runtimeId: "claude", role: "executor", success: true, latencyMs: 4000, reviewScore: 90 });
    scoreManager.record({ runtimeId: "hermes", role: "executor", success: true, latencyMs: 3000, reviewScore: 80 });

    const selector = new RuntimeSelector(discovery, scoreManager, broker.registry);

    const codingResult = selector.select({ taskType: "coding" });
    assert(codingResult !== null, "Coding selection returned result");
    assert(codingResult!.runtimeId === "codex", `coding → ${codingResult!.runtimeId}`);

    const reviewResult = selector.select({ taskType: "review" });
    assert(reviewResult !== null, "Review selection returned result");
    assert(reviewResult!.runtimeId === "claude", `review → ${reviewResult!.runtimeId}`);

    const planningResult = selector.select({ taskType: "planning" });
    assert(planningResult !== null, "Planning selection returned result");
    assert(planningResult!.runtimeId === "hermes", `planning → ${planningResult!.runtimeId}`);

    console.log("  Test 3: PASS ✓\n");
  }

  // ── Test 4: Capability Routing ──
  console.log("  [Test 4] Capability Routing");
  console.log("  ────────────────────────────────────");
  {
    const discovery = new CapabilityDiscovery();
    const scoreManager = new RuntimeScoreManager();
    const broker = new Broker();

    await broker.registerAdapter(new MockCodingAdapter());
    await broker.registerAdapter(new MockReviewAdapter());
    await broker.registerAdapter(new MockPlannerAdapter());

    await discovery.discover(new MockCodingAdapter());
    await discovery.discover(new MockReviewAdapter());
    await discovery.discover(new MockPlannerAdapter());

    scoreManager.record({ runtimeId: "codex", role: "executor", success: true, latencyMs: 2000 });
    scoreManager.record({ runtimeId: "claude", role: "executor", success: true, latencyMs: 4000 });
    scoreManager.record({ runtimeId: "hermes", role: "executor", success: true, latencyMs: 3000 });

    const selector = new RuntimeSelector(discovery, scoreManager, broker.registry);

    const r1 = selector.select({ taskType: "coding" });
    assert(r1 !== null && r1.runtimeId === "codex", `cap:coding → ${r1?.runtimeId}`);

    const r2 = selector.select({ taskType: "review" });
    assert(r2 !== null && r2.runtimeId === "claude", `cap:review → ${r2?.runtimeId}`);

    const r3 = selector.select({ taskType: "planning" });
    assert(r3 !== null && r3.runtimeId === "hermes", `cap:planning → ${r3?.runtimeId}`);

    console.log("  Test 4: PASS ✓\n");
  }

  // ── Test 5: Failover ──
  console.log("  [Test 5] Failover");
  console.log("  ────────────────────────────────────");
  {
    const discovery = new CapabilityDiscovery();
    const scoreManager = new RuntimeScoreManager();
    const broker = new Broker();

    await broker.registerAdapter(new MockCodingAdapter());
    await broker.registerAdapter(new MockReviewAdapter());

    await discovery.discover(new MockCodingAdapter());
    await discovery.discover(new MockReviewAdapter());

    scoreManager.record({ runtimeId: "codex", role: "executor", success: true, latencyMs: 2000 });
    scoreManager.record({ runtimeId: "claude", role: "executor", success: true, latencyMs: 4000 });

    const selector = new RuntimeSelector(discovery, scoreManager, broker.registry);

    const normal = selector.select({ taskType: "coding" });
    assert(normal !== null && normal.runtimeId === "codex", `Normal: coding → ${normal?.runtimeId}`);

    const failover = selector.select({ taskType: "coding", exclude: ["codex"] });
    assert(failover !== null, "Failover selection works");
    // After excluding codex, should fall back to claude (which also has coding from probe)
    assert(failover!.runtimeId === "claude", `Failover: coding → ${failover!.runtimeId}`);

    console.log("  Test 5: PASS ✓\n");
  }

  console.log("═══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════");

  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

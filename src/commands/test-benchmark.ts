import { BenchmarkDataset } from "../benchmark/BenchmarkDataset";
import { BenchmarkRunner } from "../benchmark/BenchmarkRunner";
import { BenchmarkReport } from "../benchmark/BenchmarkReport";
import { BENCHMARK_CASES, BenchmarkResult } from "../benchmark/BenchmarkSuite";
import { RuntimeSelector } from "../runtime/RuntimeSelector";
import { CapabilityDiscovery } from "../runtime/CapabilityDiscovery";
import { RuntimeScoreManager } from "../runtime/RuntimeScoreManager";
import { Broker } from "../broker/Broker";
import { TaskTimeline } from "../observability/TaskTimeline";
import { RuntimeMetrics } from "../observability/RuntimeMetrics";
import { DecisionRecorder } from "../observability/DecisionRecorder";
import { AgentAdapter, AgentResult, Task } from "../types";
import * as fs from "fs";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) { console.log(`    ✓ ${msg}`); passed++; }
  else { console.log(`    ✗ ${msg}`); failed++; }
}

// Mock runtimes with different strengths
class StrongCoderAdapter implements AgentAdapter {
  name = "codex";
  role = "developer" as const;
  capabilities = ["coding", "refactor"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task): Promise<AgentResult> {
    return { success: true, output: "function greet(name) { return 'Hello, ' + name + '!'; }" };
  }
}

class StrongReviewerAdapter implements AgentAdapter {
  name = "claude";
  role = "reviewer" as const;
  capabilities = ["review", "architecture", "coding"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task): Promise<AgentResult> {
    return { success: true, output: "SQL injection vulnerability found. Use parameterized queries." };
  }
}

class StrongPlannerAdapter implements AgentAdapter {
  name = "hermes";
  role = "planner" as const;
  capabilities = ["planning", "research"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task): Promise<AgentResult> {
    return { success: true, output: "Components: API gateway, database, cache, message queue. Flow: request → gateway → service → db → response." };
  }
}

async function main() {
  try { fs.rmSync(".agent-hive", { recursive: true, force: true }); } catch {}
  fs.mkdirSync(".agent-hive", { recursive: true });

  console.log("═══════════════════════════════════════════");
  console.log("  Test Suite: Benchmark (v2.1.7)");
  console.log("═══════════════════════════════════════════\n");

  // Test 1: BenchmarkDataset
  console.log("  [Test 1] BenchmarkDataset");
  console.log("  ────────────────────────────────────");
  {
    const ds = new BenchmarkDataset();
    ds.set({ runtimeId: "codex", coding: 97, review: 88, planning: 82, reasoning: 90, latency: 1500, successRate: 1.0, updatedAt: Date.now() });
    ds.set({ runtimeId: "claude", coding: 92, review: 96, planning: 94, reasoning: 95, latency: 3000, successRate: 1.0, updatedAt: Date.now() });

    const codex = ds.get("codex");
    assert(codex !== undefined, "Codex exists");
    assert(codex!.coding === 97, "Codex coding: " + codex!.coding);
    assert(ds.all().length === 2, "Total: " + ds.all().length);
    assert(ds.getCategoryScore("codex", "coding") === 97, "Category score works");
    assert(ds.getOverallScore("codex") > 0, "Overall score: " + ds.getOverallScore("codex").toFixed(1));
    assert(fs.existsSync(".agent-hive/benchmark/runtime-benchmark.json"), "Persisted");
    console.log("  Test 1: PASS ✓\n");
  }

  // Test 2: BenchmarkRunner
  console.log("  [Test 2] BenchmarkRunner");
  console.log("  ────────────────────────────────────");
  {
    const ds = new BenchmarkDataset();
    const tl = new TaskTimeline();
    const m = new RuntimeMetrics();
    const dr = new DecisionRecorder();
    const runner = new BenchmarkRunner(ds, tl, m, dr);

    const coder = new StrongCoderAdapter();
    const results = await runner.runRuntime(coder);

    assert(results.length === BENCHMARK_CASES.length, "Results: " + results.length + "/" + BENCHMARK_CASES.length);
    assert(results.every(r => r.success), "All succeeded");
    assert(results.some(r => r.score > 0), "Some scored > 0");

    // Aggregate
    const benchmark = runner.aggregate("codex", results);
    assert(benchmark.runtimeId === "codex", "Runtime: " + benchmark.runtimeId);
    assert(benchmark.coding > 0, "Coding score: " + benchmark.coding);
    assert(benchmark.successRate === 1.0, "Success rate: " + benchmark.successRate);

    console.log("  Test 2: PASS ✓\n");
  }

  // Test 3: BenchmarkReport
  console.log("  [Test 3] BenchmarkReport");
  console.log("  ────────────────────────────────────");
  {
    const ds = new BenchmarkDataset();
    const tl = new TaskTimeline();
    const m = new RuntimeMetrics();
    const dr = new DecisionRecorder();
    const runner = new BenchmarkRunner(ds, tl, m, dr);

    // Run benchmarks for 3 runtimes
    const allResults = new Map<string, BenchmarkResult[]>();
    for (const adapter of [new StrongCoderAdapter(), new StrongReviewerAdapter(), new StrongPlannerAdapter()]) {
      const results = await runner.runRuntime(adapter);
      runner.aggregate(adapter.name, results);
      allResults.set(adapter.name, results);
    }

    const report = new BenchmarkReport(ds);

    // JSON report
    const json = report.generateJSON(allResults);
    assert(json !== null, "JSON report generated");
    assert(fs.existsSync(".agent-hive/reports/benchmark-report.json"), "JSON persisted");

    // Markdown report
    const md = report.generateMarkdown();
    assert(md.includes("Runtime Benchmark Report"), "MD has title");
    assert(md.includes("codex"), "MD has codex");
    assert(fs.existsSync(".agent-hive/reports/benchmark-report.md"), "MD persisted");

    // Rankings
    const rankings = report.getRankings();
    assert(rankings.overall.length === 3, "Overall ranking: " + rankings.overall.length);
    assert(rankings.coding.length === 3, "Coding ranking: " + rankings.coding.length);

    const formatted = report.formatRankings();
    assert(formatted.includes("codex"), "Formatted has codex");

    console.log("  Test 3: PASS ✓\n");
  }

  // Test 4: RuntimeSelector Integration
  console.log("  [Test 4] RuntimeSelector Integration");
  console.log("  ────────────────────────────────────");
  {
    const ds = new BenchmarkDataset();
    // Set benchmark data
    ds.set({ runtimeId: "codex", coding: 97, review: 88, planning: 82, reasoning: 90, latency: 1500, successRate: 1.0, updatedAt: Date.now() });
    ds.set({ runtimeId: "claude", coding: 92, review: 96, planning: 94, reasoning: 95, latency: 3000, successRate: 1.0, updatedAt: Date.now() });
    ds.set({ runtimeId: "hermes", coding: 80, review: 90, planning: 96, reasoning: 92, latency: 2000, successRate: 1.0, updatedAt: Date.now() });

    // Verify benchmark data influences selection
    const codexCoding = ds.getCategoryScore("codex", "coding");
    const claudeCoding = ds.getCategoryScore("claude", "coding");
    const hermesPlanning = ds.getCategoryScore("hermes", "planning");

    assert(codexCoding > claudeCoding, "Codex coding > Claude coding: " + codexCoding + " > " + claudeCoding);
    assert(hermesPlanning > ds.getCategoryScore("codex", "planning"), "Hermes planning > Codex planning: " + hermesPlanning + " > " + ds.getCategoryScore("codex", "planning"));

    // Overall scores
    const codexOverall = ds.getOverallScore("codex");
    const claudeOverall = ds.getOverallScore("claude");
    assert(codexOverall > 0 && claudeOverall > 0, "Overall scores calculated");

    console.log("  Test 4: PASS ✓\n");
  }

  // Test 5: Observability Integration
  console.log("  [Test 5] Observability Integration");
  console.log("  ────────────────────────────────────");
  {
    const ds = new BenchmarkDataset();
    const tl = new TaskTimeline();
    const m = new RuntimeMetrics();
    const dr = new DecisionRecorder();
    const runner = new BenchmarkRunner(ds, tl, m, dr);

    await runner.runRuntime(new StrongCoderAdapter());

    // Timeline should have records
    const allTraces = tl.all();
    assert(allTraces.length > 0, "Timeline has " + allTraces.length + " traces");

    // Metrics should have records
    const codexMetrics = m.get("codex");
    assert(codexMetrics !== undefined, "Metrics recorded for codex");
    assert(codexMetrics!.taskCount > 0, "Task count: " + codexMetrics!.taskCount);

    console.log("  Test 5: PASS ✓\n");
  }

  console.log("═══════════════════════════════════════════");
  console.log("  Results: " + passed + " passed, " + failed + " failed");
  console.log("═══════════════════════════════════════════");

  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

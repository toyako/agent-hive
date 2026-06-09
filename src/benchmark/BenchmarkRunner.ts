import { AgentAdapter, Task } from "../types";
import { BenchmarkDataset, RuntimeBenchmark } from "./BenchmarkDataset";
import { BenchmarkCase, BenchmarkResult, BENCHMARK_CASES } from "./BenchmarkSuite";
import { TaskTimeline } from "../observability/TaskTimeline";
import { RuntimeMetrics } from "../observability/RuntimeMetrics";
import { DecisionRecorder } from "../observability/DecisionRecorder";

export class BenchmarkRunner {
  private dataset: BenchmarkDataset;
  private timeline: TaskTimeline;
  private metrics: RuntimeMetrics;
  private decisions: DecisionRecorder;

  constructor(
    dataset: BenchmarkDataset,
    timeline: TaskTimeline,
    metrics: RuntimeMetrics,
    decisions: DecisionRecorder
  ) {
    this.dataset = dataset;
    this.timeline = timeline;
    this.metrics = metrics;
    this.decisions = decisions;
  }

  /**
   * Run all benchmark cases against a single runtime.
   */
  async runRuntime(adapter: AgentAdapter, cases?: BenchmarkCase[]): Promise<BenchmarkResult[]> {
    const testCases = cases || BENCHMARK_CASES;
    const results: BenchmarkResult[] = [];

    for (const bc of testCases) {
      const result = await this.runCase(adapter, bc);
      results.push(result);
    }

    return results;
  }

  /**
   * Run all benchmark cases against all provided runtimes.
   */
  async runAll(adapters: AgentAdapter[]): Promise<Map<string, BenchmarkResult[]>> {
    const allResults = new Map<string, BenchmarkResult[]>();

    for (const adapter of adapters) {
      const results = await this.runRuntime(adapter);
      allResults.set(adapter.name, results);
    }

    return allResults;
  }

  /**
   * Run a single benchmark case against a runtime.
   */
  async runCase(adapter: AgentAdapter, bc: BenchmarkCase): Promise<BenchmarkResult> {
    const taskId = `bench-${adapter.name}-${bc.id}`;
    this.timeline.start(taskId);
    this.timeline.event(taskId, "benchmark-start", { runtime: adapter.name, case: bc.id });

    const task: Task = {
      id: taskId,
      instruction: bc.instruction,
      executor: adapter.name,
      reviewer: "",
      status: "EXECUTING",
      revisionCount: 0,
      maxRevision: 1,
      timeout: 60_000,
      workingDirectory: process.cwd(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const start = Date.now();
    let success = false;
    let output = "";
    let score = 0;

    try {
      const result = await adapter.execute(task);
      success = result.success;
      output = result.output || "";

      if (success) {
        score = bc.evaluate(output);
      }
    } catch (err: any) {
      output = err.message;
    }

    const latencyMs = Date.now() - start;

    this.timeline.event(taskId, "benchmark-done", { success, score, latencyMs });
    this.timeline.complete(taskId, success ? "COMPLETED" : "FAILED");

    this.metrics.record(adapter.name, { success, latencyMs, reviewScore: score });

    return {
      caseId: bc.id,
      category: bc.category,
      runtimeId: adapter.name,
      success,
      score,
      latencyMs,
      output,
    };
  }

  /**
   * Aggregate results into a RuntimeBenchmark.
   */
  aggregate(runtimeId: string, results: BenchmarkResult[]): RuntimeBenchmark {
    const byCategory = (cat: string) => results.filter(r => r.category === cat);

    const avgScore = (items: BenchmarkResult[]) =>
      items.length > 0 ? items.reduce((s, r) => s + r.score, 0) / items.length : 0;

    const avgLatency = results.length > 0
      ? results.reduce((s, r) => s + r.latencyMs, 0) / results.length
      : 0;

    const successRate = results.length > 0
      ? results.filter(r => r.success).length / results.length
      : 0;

    const benchmark: RuntimeBenchmark = {
      runtimeId,
      coding: Math.round(avgScore(byCategory("coding"))),
      review: Math.round(avgScore(byCategory("review"))),
      planning: Math.round(avgScore(byCategory("planning"))),
      reasoning: Math.round(avgScore(byCategory("reasoning"))),
      latency: Math.round(avgLatency),
      successRate: Math.round(successRate * 100) / 100,
      updatedAt: Date.now(),
    };

    this.dataset.set(benchmark);
    return benchmark;
  }
}

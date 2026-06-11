/**
 * ValidationRunner — runs benchmarks and produces validation reports.
 */
import { BenchmarkTask, BENCHMARK_DATASET } from "./GroundTruthDataset";
import { EvaluationMetricsCollector, EvaluationMetrics } from "./EvaluationMetrics";
import { Planner } from "../orchestration/Planner";
import { AgentRouter } from "../orchestration/AgentRouter";
import { AgentRegistry } from "../orchestration/registry/AgentRegistry";
import { EventBus } from "../runtime/EventBus";
import { DAGExecutor } from "../orchestration/DAGExecutor";
import { ReviewerAgent } from "../orchestration/ReviewerAgent";
import { JudgeAgent } from "../orchestration/JudgeAgent";
import { Agent, Task, TaskResult, ReviewResult, JudgeResult } from "../orchestration/contracts/Agent";

export interface ValidationResult {
  taskId: string;
  category: string;
  task: string;
  plannerScore: number;
  routerScore: number;
  reviewScore: number;
  judgeScore: number;
  passed: boolean;
  durationMs: number;
}

export interface ValidationReport {
  timestamp: string;
  totalTasks: number;
  passed: number;
  failed: number;
  metrics: EvaluationMetrics;
  results: ValidationResult[];
}

export class ValidationRunner {
  private planner: Planner;
  private router: AgentRouter;
  private dag: DAGExecutor;
  private reviewer: ReviewerAgent;
  private judge: JudgeAgent;
  private metrics: EvaluationMetricsCollector;

  constructor(agents: Map<string, Agent>, registry: AgentRegistry, eventBus: EventBus) {
    this.planner = new Planner();
    this.router = new AgentRouter(registry);
    this.dag = new DAGExecutor(this.router, agents, eventBus);
    this.reviewer = new ReviewerAgent();
    this.judge = new JudgeAgent();
    this.metrics = new EvaluationMetricsCollector();
  }

  /** Run a single benchmark task */
  async runTask(benchmark: BenchmarkTask): Promise<ValidationResult> {
    const startTime = Date.now();

    // 1. Plan
    const plan = this.planner.plan(benchmark.task);
    const plannerScore = this.evaluatePlan(plan, benchmark);

    // 2. Route
    let routerScore = 100;
    for (const task of plan) {
      const route = this.router.route(task);
      if (!route.assignedAgent) routerScore -= 20;
    }
    routerScore = Math.max(0, routerScore);

    // 3. Execute (simulated)
    const execResults = new Map<string, TaskResult>();
    for (const task of plan) {
      execResults.set(task.id, {
        taskId: task.id,
        agentId: "simulated",
        success: true,
        output: `Simulated output for: ${task.title}`,
        durationMs: 10,
      });
    }

    // 4. Review
    const firstResult = Array.from(execResults.values())[0];
    const review = await this.reviewer.review(firstResult);
    const reviewScore = review.score;

    // 5. Judge
    const judgeResult = this.judge.judge(firstResult, review);
    const judgeScore = judgeResult.score;

    const durationMs = Date.now() - startTime;
    const passed = judgeResult.accepted && plannerScore >= 50;

    // Record metrics
    this.metrics.record({
      completed: true,
      success: passed,
      reviewCorrect: reviewScore >= benchmark.expected.minScore,
      judgeCorrect: judgeResult.accepted === passed,
      reviewFP: !passed && review.approved,
      reviewFN: passed && !review.approved,
      judgeIndependent: judgeResult.accepted !== review.approved,
      retried: false,
      failed: !passed,
      executionTime: durationMs,
    });

    return {
      taskId: benchmark.id,
      category: benchmark.category,
      task: benchmark.task,
      plannerScore,
      routerScore,
      reviewScore,
      judgeScore,
      passed,
      durationMs,
    };
  }

  /** Run all benchmarks */
  async runAll(): Promise<ValidationReport> {
    const results: ValidationResult[] = [];
    for (const benchmark of BENCHMARK_DATASET) {
      results.push(await this.runTask(benchmark));
    }

    return {
      timestamp: new Date().toISOString(),
      totalTasks: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      metrics: this.metrics.compute(),
      results,
    };
  }

  private evaluatePlan(plan: Task[], benchmark: BenchmarkTask): number {
    let score = 100;

    // Over-splitting penalty
    if (plan.length > 6) score -= (plan.length - 6) * 10;

    // Under-splitting penalty
    if (plan.length === 1 && benchmark.task.length > 50) score -= 30;

    // Dependency correctness
    const hasDeps = plan.some(t => t.dependencies.length > 0);
    if (!hasDeps && plan.length > 1) score -= 20;

    // Unique IDs
    const ids = new Set(plan.map(t => t.id));
    if (ids.size !== plan.length) score -= 30;

    return Math.max(0, score);
  }
}

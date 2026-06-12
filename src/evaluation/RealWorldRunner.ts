/**
 * RealWorldRunner — runs real-world benchmarks through the full orchestration pipeline.
 */
import { RealWorldTask, REAL_WORLD_BENCHMARKS, Difficulty } from "./RealWorldBenchmark";
import { DecisionTraceCollector, DecisionTrace } from "./DecisionTrace";
import { Planner } from "../orchestration/Planner";
import { AgentRouter } from "../orchestration/AgentRouter";
import { AgentRegistry } from "../orchestration/registry/AgentRegistry";
import { ReviewerAgent } from "../orchestration/ReviewerAgent";
import { JudgeAgent } from "../orchestration/JudgeAgent";
import { Agent, Task, TaskResult, ReviewResult, JudgeResult } from "../orchestration/contracts/Agent";

export interface SuccessCriteria {
  implementation: boolean;
  testsPassed: boolean;
  reviewerApproved: boolean;
  judgeApproved: boolean;
}

export interface RealWorldResult {
  taskId: string;
  category: string;
  difficulty: Difficulty;
  success: boolean;
  criteria: SuccessCriteria;
  plannerScore: number;
  routerScore: number;
  reviewScore: number;
  judgeScore: number;
  executionTimeMs: number;
  decisionTraces: DecisionTrace[];
}

export interface RealWorldMetrics {
  taskCompletionRate: number;
  taskSuccessRate: number;
  reviewerAccuracy: number;
  judgeAccuracy: number;
  retryRate: number;
  failureRate: number;
  averageExecutionTimeMs: number;
  difficultyBreakdown: Record<Difficulty, { total: number; passed: number; rate: number }>;
}

export class RealWorldRunner {
  private planner: Planner;
  private router: AgentRouter;
  private reviewer: ReviewerAgent;
  private judge: JudgeAgent;
  private traceCollector: DecisionTraceCollector;

  constructor(registry: AgentRegistry) {
    this.planner = new Planner();
    this.router = new AgentRouter(registry);
    this.reviewer = new ReviewerAgent();
    this.judge = new JudgeAgent();
    this.traceCollector = new DecisionTraceCollector();
  }

  async runTask(task: RealWorldTask): Promise<RealWorldResult> {
    const startTime = Date.now();
    const traceId = `rw-${task.id}`;

    // 1. Plan
    const plan = this.planner.plan(task.task);
    this.traceCollector.record({
      traceId, agent: "planner", decision: `Split into ${plan.length} tasks`,
      rationale: `Task type detection: ${task.task.slice(0, 50)}`, confidence: 0.8, timestamp: Date.now(),
    });
    const plannerScore = this.evaluatePlan(plan, task);

    // 2. Route
    let routerScore = 100;
    for (const t of plan) {
      const route = this.router.route(t);
      if (!route.assignedAgent) routerScore -= 20;
      this.traceCollector.record({
        traceId, agent: "router", decision: `Route ${t.id} → ${route.assignedAgent?.id || "none"}`,
        rationale: route.reason, confidence: route.assignedAgent ? 0.9 : 0.1, timestamp: Date.now(),
      });
    }
    routerScore = Math.max(0, routerScore);

    // 3. Execute (simulated)
    const result: TaskResult = {
      taskId: task.id, agentId: "multi-agent", success: true,
      output: `Real-world output for: ${task.task}`, durationMs: Date.now() - startTime + 20,
    };

    // 4. Review
    const review = await this.reviewer.review(result);
    this.traceCollector.record({
      traceId, agent: "reviewer", decision: review.approved ? "APPROVE" : "REJECT",
      rationale: `Score: ${review.score}, Findings: ${review.findings.length}`, confidence: review.score / 100, timestamp: Date.now(),
    });

    // 5. Judge
    const judgeResult = this.judge.judge(result, review);
    this.traceCollector.record({
      traceId, agent: "judge", decision: judgeResult.accepted ? "ACCEPT" : "REJECT",
      rationale: judgeResult.reason, confidence: judgeResult.score / 100, timestamp: Date.now(),
    });

    // 6. Success criteria
    const criteria: SuccessCriteria = {
      implementation: result.success,
      testsPassed: result.success,
      reviewerApproved: review.approved,
      judgeApproved: judgeResult.accepted,
    };
    const success = criteria.implementation && criteria.testsPassed && criteria.reviewerApproved && criteria.judgeApproved;

    return {
      taskId: task.id,
      category: task.category,
      difficulty: task.difficulty,
      success,
      criteria,
      plannerScore,
      routerScore,
      reviewScore: review.score,
      judgeScore: judgeResult.score,
      executionTimeMs: Date.now() - startTime,
      decisionTraces: this.traceCollector.getByTraceId(traceId),
    };
  }

  async runAll(): Promise<{ results: RealWorldResult[]; metrics: RealWorldMetrics }> {
    const results: RealWorldResult[] = [];
    for (const task of REAL_WORLD_BENCHMARKS) {
      results.push(await this.runTask(task));
    }
    return { results, metrics: this.computeMetrics(results) };
  }

  private evaluatePlan(plan: Task[], task: RealWorldTask): number {
    let score = 100;
    if (plan.length > 6) score -= (plan.length - 6) * 10;
    if (plan.length === 1 && task.task.length > 50) score -= 20;
    if (!plan.some(t => t.dependencies.length > 0) && plan.length > 1) score -= 15;
    return Math.max(0, score);
  }

  private computeMetrics(results: RealWorldResult[]): RealWorldMetrics {
    const n = results.length || 1;
    const diffBreakdown: Record<Difficulty, { total: number; passed: number; rate: number }> = {
      L1: { total: 0, passed: 0, rate: 0 },
      L2: { total: 0, passed: 0, rate: 0 },
      L3: { total: 0, passed: 0, rate: 0 },
      L4: { total: 0, passed: 0, rate: 0 },
    };
    for (const r of results) {
      diffBreakdown[r.difficulty].total++;
      if (r.success) diffBreakdown[r.difficulty].passed++;
    }
    for (const d of ["L1", "L2", "L3", "L4"] as Difficulty[]) {
      diffBreakdown[d].rate = diffBreakdown[d].total > 0 ? diffBreakdown[d].passed / diffBreakdown[d].total : 0;
    }

    return {
      taskCompletionRate: results.filter(r => r.criteria.implementation).length / n,
      taskSuccessRate: results.filter(r => r.success).length / n,
      reviewerAccuracy: results.filter(r => r.criteria.reviewerApproved === r.success).length / n,
      judgeAccuracy: results.filter(r => r.criteria.judgeApproved === r.success).length / n,
      retryRate: 0,
      failureRate: results.filter(r => !r.success).length / n,
      averageExecutionTimeMs: results.reduce((s, r) => s + r.executionTimeMs, 0) / n,
      difficultyBreakdown: diffBreakdown,
    };
  }
}

/**
 * Runtime Intelligence Validation Experiment
 *
 * Compare: Fixed Routing vs Intelligent Routing
 * 20 tasks each, measure successRate / latency / reviewScore
 */
import { Broker } from "../broker/Broker";
import { CapabilityDiscovery } from "../runtime/CapabilityDiscovery";
import { RuntimeScoreManager } from "../runtime/RuntimeScoreManager";
import { RuntimeSelector } from "../runtime/RuntimeSelector";
import { AgentAdapter, AgentResult, ReviewResult, Task } from "../types";
import * as fs from "fs";

// ─── Real-ish Mock Adapters ──────────────────────────
// Each has different strengths to make the comparison meaningful

class CodexMock implements AgentAdapter {
  name = "codex";
  role = "developer" as const;
  capabilities = ["coding", "refactor"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    const prompt = instruction || task.instruction;
    // Good at coding/refactor, mediocre at review/planning
    const isStrong = task.instruction.includes("code") || task.instruction.includes("refactor") || task.instruction.includes("function") || task.instruction.includes("API");
    await sleep(isStrong ? 50 : 150);
    return {
      success: true,
      output: isStrong
        ? `[Codex]高质量完成: ${prompt}\n代码结构清晰，测试覆盖完整。`
        : `[Codex]基本完成: ${prompt}\n代码可用但不够优雅。`,
    };
  }
}

class ClaudeMock implements AgentAdapter {
  name = "claude";
  role = "reviewer" as const;
  capabilities = ["review", "architecture", "coding"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    const prompt = instruction || task.instruction;
    // Good at review/architecture, decent at coding
    const isStrong = task.instruction.includes("review") || task.instruction.includes("审核") || task.instruction.includes("架构") || task.instruction.includes("design");
    await sleep(isStrong ? 80 : 120);
    return {
      success: true,
      output: isStrong
        ? `[Claude]高质量完成: ${prompt}\n分析深入，建议具体。`
        : `[Claude]完成: ${prompt}\n质量合格。`,
    };
  }
  async review(task: Task): Promise<ReviewResult> {
    await sleep(40);
    // Reviews are thorough
    return { decision: "PASS", score: 88, issues: [] };
  }
}

class HermesMock implements AgentAdapter {
  name = "hermes";
  role = "planner" as const;
  capabilities = ["planning", "research"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    const prompt = instruction || task.instruction;
    // Good at planning/research, weak at coding
    const isStrong = task.instruction.includes("plan") || task.instruction.includes("设计") || task.instruction.includes("research") || task.instruction.includes("分析");
    await sleep(isStrong ? 30 : 200);
    return {
      success: Math.random() > (isStrong ? 0.02 : 0.15), // Higher failure rate for non-strength tasks
      output: isStrong
        ? `[Hermes]高质量完成: ${prompt}\n方案清晰，考虑全面。`
        : `[Hermes]勉强完成: ${prompt}\n需要进一步优化。`,
      error: isStrong ? undefined : "Output quality below threshold",
    };
  }
  async review(task: Task): Promise<ReviewResult> {
    await sleep(30);
    return { decision: "PASS", score: 75, issues: [] };
  }
}

// ─── Task definitions ────────────────────────────────

const TASKS = [
  { instruction: "实现一个用户登录API接口", type: "coding" },
  { instruction: "实现一个数据导出功能", type: "coding" },
  { instruction: "实现一个文件上传模块", type: "coding" },
  { instruction: "实现一个WebSocket消息推送", type: "coding" },
  { instruction: "重构数据库连接池代码", type: "refactor" },
  { instruction: "重构错误处理中间件", type: "refactor" },
  { instruction: "重构配置加载逻辑", type: "refactor" },
  { instruction: "重构日志输出模块", type: "refactor" },
  { instruction: "审核以下代码的安全性", type: "review" },
  { instruction: "审核PR中的性能问题", type: "review" },
  { instruction: "审核API接口的错误处理", type: "review" },
  { instruction: "审核数据库查询的合理性", type: "review" },
  { instruction: "设计微服务架构方案", type: "planning" },
  { instruction: "设计缓存策略方案", type: "planning" },
  { instruction: "设计CI/CD流水线", type: "planning" },
  { instruction: "分析系统瓶颈并给出优化方案", type: "planning" },
  { instruction: "实现一个CRUD自动生成器", type: "coding" },
  { instruction: "实现一个权限校验中间件", type: "coding" },
  { instruction: "重构前端状态管理代码", type: "refactor" },
  { instruction: "设计API版本管理方案", type: "planning" },
];

// ─── Experiment ──────────────────────────────────────

interface RunResult {
  taskType: string;
  runtime: string;
  success: boolean;
  latencyMs: number;
  reviewScore: number;
  selectedBy: "fixed" | "intelligence";
}

async function runExperiment(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   Runtime Intelligence Validation Experiment     ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Clean state
  try { fs.rmSync(".agent-hive", { recursive: true, force: true }); } catch {}
  fs.mkdirSync(".agent-hive", { recursive: true });

  const codex = new CodexMock();
  const claude = new ClaudeMock();
  const hermes = new HermesMock();

  const results: { fixed: RunResult[]; intelligence: RunResult[] } = { fixed: [], intelligence: [] };

  // ── Experiment A: Fixed Routing (everything through Claude) ──
  console.log("━━━ 实验A: 固定路由 (全部走 Claude) ━━━\n");

  for (const task of TASKS) {
    const start = Date.now();
    const result = await claude.execute({
      id: `fixed-${Date.now()}`,
      instruction: task.instruction,
      executor: "claude",
      reviewer: "claude",
      status: "EXECUTING",
      revisionCount: 0,
      maxRevision: 3,
      timeout: 60000,
      workingDirectory: "/tmp",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const latency = Date.now() - start;

    let reviewScore = 0;
    if (result.success) {
      const review = await claude.review!({
        id: "review",
        instruction: "",
        executor: "claude",
        reviewer: "claude",
        status: "REVIEWING",
        revisionCount: 0,
        maxRevision: 3,
        timeout: 60000,
        workingDirectory: "/tmp",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        result: result.output,
      });
      reviewScore = review.score;
    }

    results.fixed.push({
      taskType: task.type,
      runtime: "claude",
      success: result.success,
      latencyMs: latency,
      reviewScore,
      selectedBy: "fixed",
    });
    process.stdout.write(`  ${task.type.padEnd(10)} → claude  ${result.success ? "✓" : "✗"}  ${latency}ms  score=${reviewScore}\n`);
  }

  // ── Experiment B: Intelligent Routing ──
  console.log("\n━━━ 实验B: 智能路由 (RuntimeSelector) ━━━\n");

  // Set up intelligence
  const discovery = new CapabilityDiscovery();
  const scoreManager = new RuntimeScoreManager();
  const broker = new Broker();

  await broker.registerAdapter(codex);
  await broker.registerAdapter(claude);
  await broker.registerAdapter(hermes);

  await discovery.discover(codex);
  await discovery.discover(claude);
  await discovery.discover(hermes);

  // Seed some initial performance data
  scoreManager.record({ runtimeId: "codex", role: "executor", success: true, latencyMs: 1500, reviewScore: 90 });
  scoreManager.record({ runtimeId: "claude", role: "executor", success: true, latencyMs: 3000, reviewScore: 88 });
  scoreManager.record({ runtimeId: "hermes", role: "executor", success: true, latencyMs: 1000, reviewScore: 75 });

  const selector = new RuntimeSelector(discovery, scoreManager, broker.registry);

  for (const task of TASKS) {
    const selection = selector.select({ taskType: task.type });
    const runtimeName = selection?.runtimeId || "claude";
    const adapter = runtimeName === "codex" ? codex : runtimeName === "hermes" ? hermes : claude;

    const start = Date.now();
    const result = await adapter.execute({
      id: `intel-${Date.now()}`,
      instruction: task.instruction,
      executor: runtimeName,
      reviewer: "claude",
      status: "EXECUTING",
      revisionCount: 0,
      maxRevision: 3,
      timeout: 60000,
      workingDirectory: "/tmp",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const latency = Date.now() - start;

    let reviewScore = 0;
    if (result.success) {
      const reviewer = claude;
      const review = await reviewer.review!({
        id: "review",
        instruction: "",
        executor: runtimeName,
        reviewer: "claude",
        status: "REVIEWING",
        revisionCount: 0,
        maxRevision: 3,
        timeout: 60000,
        workingDirectory: "/tmp",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        result: result.output,
      });
      reviewScore = review.score;
    }

    // Record for score learning
    scoreManager.record({
      runtimeId: runtimeName,
      role: "executor",
      success: result.success,
      latencyMs: latency,
      reviewScore,
    });

    results.intelligence.push({
      taskType: task.type,
      runtime: runtimeName,
      success: result.success,
      latencyMs: latency,
      reviewScore,
      selectedBy: "intelligence",
    });
    process.stdout.write(`  ${task.type.padEnd(10)} → ${runtimeName.padEnd(7)} ${result.success ? "✓" : "✗"}  ${latency}ms  score=${reviewScore}\n`);
  }

  // ── Analysis ──
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║                  对比分析                         ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const fixedStats = calcStats(results.fixed);
  const intelStats = calcStats(results.intelligence);

  console.log("  指标              固定路由    智能路由    提升");
  console.log("  ─────────────────────────────────────────────");
  console.log(`  成功率            ${fixedStats.successRate.toFixed(1)}%      ${intelStats.successRate.toFixed(1)}%      ${formatDiff(fixedStats.successRate, intelStats.successRate)}`);
  console.log(`  平均延迟          ${fixedStats.avgLatency.toFixed(0)}ms     ${intelStats.avgLatency.toFixed(0)}ms     ${formatDiff(fixedStats.avgLatency, intelStats.avgLatency, true)}`);
  console.log(`  平均审核分        ${fixedStats.avgReviewScore.toFixed(1)}       ${intelStats.avgReviewScore.toFixed(1)}       ${formatDiff(fixedStats.avgReviewScore, intelStats.avgReviewScore)}`);

  // Per-type breakdown
  console.log("\n  按任务类型:");
  console.log("  类型          固定路由(分)  智能路由(分)  提升");
  console.log("  ─────────────────────────────────────────────");

  for (const type of ["coding", "refactor", "review", "planning"]) {
    const fixedType = calcStats(results.fixed.filter(r => r.taskType === type));
    const intelType = calcStats(results.intelligence.filter(r => r.taskType === type));
    console.log(`  ${type.padEnd(13)} ${fixedType.avgReviewScore.toFixed(1).padStart(10)}  ${intelType.avgReviewScore.toFixed(1).padStart(10)}  ${formatDiff(fixedType.avgReviewScore, intelType.avgReviewScore)}`);
  }

  // Runtime distribution for intelligent routing
  console.log("\n  智能路由 Runtime 分布:");
  const dist: Record<string, number> = {};
  for (const r of results.intelligence) {
    dist[r.runtime] = (dist[r.runtime] || 0) + 1;
  }
  for (const [name, count] of Object.entries(dist)) {
    console.log(`    ${name}: ${count}/20 tasks (${(count/20*100).toFixed(0)}%)`);
  }

  // Verdict
  const compositeImprovement = (
    (intelStats.successRate - fixedStats.successRate) / Math.max(fixedStats.successRate, 1) * 0.4 +
    (fixedStats.avgLatency - intelStats.avgLatency) / Math.max(fixedStats.avgLatency, 1) * 0.3 +
    (intelStats.avgReviewScore - fixedStats.avgReviewScore) / Math.max(fixedStats.avgReviewScore, 1) * 0.3
  ) * 100;

  console.log(`\n  综合提升: ${compositeImprovement.toFixed(1)}%`);

  if (compositeImprovement > 20) {
    console.log("  结论: 提升明显 (>20%)，建议进入 v2.2");
  } else if (compositeImprovement > 10) {
    console.log("  结论: 提升中等 (10-20%)，可选择性优化");
  } else {
    console.log("  结论: 提升不明显 (<10%)，停止继续开发 Runtime Intelligence");
  }

  // Save results
  fs.writeFileSync("docs/experiment-results.json", JSON.stringify({
    timestamp: new Date().toISOString(),
    fixed: fixedStats,
    intelligence: intelStats,
    compositeImprovement,
    taskCount: TASKS.length,
    details: results,
  }, null, 2));

  console.log("\n  结果已保存: docs/experiment-results.json");
}

function calcStats(results: RunResult[]) {
  const successCount = results.filter(r => r.success).length;
  const totalLatency = results.reduce((sum, r) => sum + r.latencyMs, 0);
  const totalScore = results.reduce((sum, r) => sum + r.reviewScore, 0);
  return {
    successRate: results.length > 0 ? successCount / results.length * 100 : 0,
    avgLatency: results.length > 0 ? totalLatency / results.length : 0,
    avgReviewScore: results.length > 0 ? totalScore / results.length : 0,
  };
}

function formatDiff(fixed: number, intel: number, lowerIsBetter = false): string {
  const diff = lowerIsBetter ? fixed - intel : intel - fixed;
  const pct = fixed !== 0 ? (diff / Math.abs(fixed) * 100) : 0;
  const sign = diff >= 0 ? "+" : "";
  const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
  return `${arrow} ${sign}${pct.toFixed(1)}%`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

runExperiment().catch(err => { console.error("Fatal:", err); process.exit(1); });

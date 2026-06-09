/**
 * Test C: Runtime Timeout — Detailed Evidence
 */
import { Broker } from "../broker/Broker";
import { AgentAdapter, AgentResult, ReviewResult, Task } from "../types";

class SlowExecutorAdapter implements AgentAdapter {
  name = "slow-executor";
  role = "developer" as const;
  capabilities = ["coding"];
  private delay: number;
  constructor(delay: number) { this.delay = delay; }
  async detect() { return true; }
  async health() { return true; }
  async execute(): Promise<AgentResult> {
    await this.sleep(this.delay);
    return { success: true, output: "slow result" };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

class SlowReviewerAdapter implements AgentAdapter {
  name = "slow-reviewer";
  role = "reviewer" as const;
  capabilities = ["review"];
  private delay: number;
  constructor(delay: number) { this.delay = delay; }
  async detect() { return true; }
  async health() { return true; }
  async execute(): Promise<AgentResult> { return { success: true, output: "" }; }
  async review(): Promise<ReviewResult> {
    await this.sleep(this.delay);
    return { decision: "PASS", score: 90, issues: [] };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Test C: Runtime Timeout — Evidence");
  console.log("═══════════════════════════════════════════\n");

  const results: { name: string; pass: boolean; detail: string }[] = [];

  // ── C1: Executor timeout ──
  console.log("  ── C1: Executor Timeout ──");
  console.log("  Config: executor_delay=10000ms, task_timeout=2000ms");
  {
    const broker = new Broker();
    await broker.registerAdapter(new SlowExecutorAdapter(10_000));
    await broker.registerAdapter(new SlowReviewerAdapter(0));
    broker.registry.link("slow-executor", "slow-reviewer");

    const task = broker.submit({
      instruction: "test executor timeout",
      executor: "slow-executor",
      reviewer: "slow-reviewer",
      timeout: 2000,
    });
    console.log(`  Task: ${task.id}, timeout=${task.timeout}ms`);

    const start = Date.now();
    await broker.run();
    const elapsed = Date.now() - start;

    const t = broker.listTasks()[0];
    console.log(`  Elapsed: ${elapsed}ms (should be ~2000ms, not 10000ms)`);
    console.log(`  Final status: ${t.status}`);
    console.log(`  State: PENDING → EXECUTING → TIMEOUT → ${t.status}`);

    const pass = t.status === "FAILED" && elapsed < 5000;
    results.push({ name: "C1 Executor Timeout", pass, detail: `status=${t.status}, elapsed=${elapsed}ms` });
    console.log(`  Result: ${pass ? "PASS ✓" : "FAIL ✗"}\n`);
  }

  // ── C2: Reviewer timeout ──
  console.log("  ── C2: Reviewer Timeout ──");
  console.log("  Config: reviewer_delay=10000ms, task_timeout=2000ms");
  {
    const broker = new Broker();
    await broker.registerAdapter(new SlowExecutorAdapter(0));
    await broker.registerAdapter(new SlowReviewerAdapter(10_000));
    broker.registry.link("slow-executor", "slow-reviewer");

    const task = broker.submit({
      instruction: "test reviewer timeout",
      executor: "slow-executor",
      reviewer: "slow-reviewer",
      timeout: 2000,
    });
    console.log(`  Task: ${task.id}, timeout=${task.timeout}ms`);

    const start = Date.now();
    await broker.run();
    const elapsed = Date.now() - start;

    const t = broker.listTasks()[0];
    console.log(`  Elapsed: ${elapsed}ms`);
    console.log(`  Final status: ${t.status}`);
    console.log(`  State: PENDING → EXECUTING → REVIEWING → ERROR → ${t.status}`);

    const pass = t.status === "FAILED" && elapsed < 5000;
    results.push({ name: "C2 Reviewer Timeout", pass, detail: `status=${t.status}, elapsed=${elapsed}ms` });
    console.log(`  Result: ${pass ? "PASS ✓" : "FAIL ✗"}\n`);
  }

  // ── C3: Both timeout ──
  console.log("  ── C3: Both Timeout ──");
  console.log("  Config: executor_delay=10000ms, reviewer_delay=10000ms, task_timeout=1500ms");
  {
    const broker = new Broker();
    await broker.registerAdapter(new SlowExecutorAdapter(10_000));
    await broker.registerAdapter(new SlowReviewerAdapter(10_000));
    broker.registry.link("slow-executor", "slow-reviewer");

    const task = broker.submit({
      instruction: "test both timeout",
      executor: "slow-executor",
      reviewer: "slow-reviewer",
      timeout: 1500,
    });

    const start = Date.now();
    await broker.run();
    const elapsed = Date.now() - start;

    const t = broker.listTasks()[0];
    console.log(`  Elapsed: ${elapsed}ms`);
    console.log(`  Final status: ${t.status}`);

    const pass = t.status === "FAILED" && elapsed < 4000;
    results.push({ name: "C3 Both Timeout", pass, detail: `status=${t.status}, elapsed=${elapsed}ms` });
    console.log(`  Result: ${pass ? "PASS ✓" : "FAIL ✗"}\n`);
  }

  // ── Summary ──
  console.log("  ═══ Evidence Summary ═══");
  for (const r of results) {
    console.log(`    ${r.pass ? "✓" : "✗"} ${r.name}: ${r.detail}`);
  }
  const allPass = results.every(r => r.pass);
  console.log(`\n  ═══ Test C: ${allPass ? "PASS ✓" : "FAIL ✗"} ═══\n`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

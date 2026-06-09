/**
 * Test A: Queue Stress Test — Detailed Evidence
 */
import { Broker } from "../broker/Broker";
import { AgentAdapter, AgentResult, ReviewResult, Task } from "../types";

class FastMockExecutor implements AgentAdapter {
  name = "codex";
  role = "developer" as const;
  capabilities = ["coding"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    await this.sleep(50);
    return { success: true, output: `[Mock] Created file_${task.id}.js` };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

class FastMockReviewer implements AgentAdapter {
  name = "claude";
  role = "reviewer" as const;
  capabilities = ["review"];
  async detect() { return true; }
  async health() { return true; }
  async execute(): Promise<AgentResult> { return { success: true, output: "" }; }
  async review(): Promise<ReviewResult> {
    await this.sleep(30);
    return { decision: "PASS", score: 90, issues: [] };
  }
  private sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
}

async function main() {
  // Clean up any leftover .agent-hive data from prior runs
  const fs = require("fs");
  fs.rmSync(".agent-hive", { recursive: true, force: true });

  console.log("═══════════════════════════════════════════");
  console.log("  Test A: Queue Stress Test — Evidence");
  console.log("═══════════════════════════════════════════\n");

  const broker = new Broker();
  await broker.registerAdapter(new FastMockExecutor());
  await broker.registerAdapter(new FastMockReviewer());
  broker.registry.link("codex", "claude");

  // ── Submit 100 tasks ──
  console.log("  [Phase 1] Submitting 100 tasks...\n");
  const submitStart = Date.now();
  for (let i = 1; i <= 100; i++) {
    broker.submit({
      instruction: `Create file_${i}.js with content: module.exports = ${i}`,
      executor: "codex",
      reviewer: "claude",
    });
  }
  const submitTime = Date.now() - submitStart;

  // Show sample tasks
  const allTasks = broker.listTasks();
  console.log(`  Submitted: ${allTasks.length} tasks in ${submitTime}ms`);
  console.log(`  Sample tasks:`);
  for (const t of allTasks.slice(0, 5)) {
    console.log(`    ${t.id}: "${t.instruction}" → ${t.status}`);
  }
  console.log(`    ... (${allTasks.length - 5} more)\n`);

  // ── Process all ──
  console.log("  [Phase 2] Processing queue...\n");
  const runStart = Date.now();
  await broker.run();
  const runTime = Date.now() - runStart;

  // ── Collect evidence ── (re-read from disk after processing)
  const allTasksAfter = broker.listTasks();
  const completed = allTasksAfter.filter(t => t.status === "COMPLETED");
  const failed = allTasksAfter.filter(t => t.status === "FAILED");
  const pending = allTasksAfter.filter(t => t.status === "PENDING");
  const other = allTasksAfter.filter(t => !["COMPLETED", "FAILED", "PENDING"].includes(t.status));

  // Check for retries (revisionCount > 0)
  const retried = allTasksAfter.filter(t => t.revisionCount > 0);

  // Verify each completed task has a result
  const withResult = completed.filter(t => t.result);
  const withoutResult = completed.filter(t => !t.result);

  console.log("  [Evidence]");
  console.log(`  ────────────────────────────────────`);
  console.log(`  Total submitted:    ${allTasks.length}`);
  console.log(`  COMPLETED:          ${completed.length}`);
  console.log(`  FAILED:             ${failed.length}`);
  console.log(`  PENDING:            ${pending.length}`);
  console.log(`  Other:              ${other.length}`);
  console.log(`  ────────────────────────────────────`);
  console.log(`  With result:        ${withResult.length}`);
  console.log(`  Without result:     ${withoutResult.length}`);
  console.log(`  Retried (rev>0):    ${retried.length}`);
  console.log(`  ────────────────────────────────────`);
  console.log(`  Submit time:        ${submitTime}ms`);
  console.log(`  Processing time:    ${runTime}ms`);
  console.log(`  Total time:         ${submitTime + runTime}ms`);
  console.log(`  Avg per task:       ${Math.round(runTime / allTasks.length)}ms`);
  console.log(`  ────────────────────────────────────`);

  // Show sample completed tasks
  console.log(`\n  Sample completed tasks:`);
  for (const t of completed.slice(0, 5)) {
    console.log(`    ${t.id}: status=${t.status}, revCount=${t.revisionCount}, result="${(t.result || "").slice(0, 40)}"`);
  }

  // Check for state confusion (no task should be in multiple states)
  const stateMap: Record<string, number> = {};
  for (const t of allTasksAfter) {
    stateMap[t.status] = (stateMap[t.status] || 0) + 1;
  }
  console.log(`\n  State distribution: ${JSON.stringify(stateMap)}`);

  // Verify no duplicates
  const ids = allTasksAfter.map(t => t.id);
  const uniqueIds = new Set(ids);
  console.log(`  Unique IDs: ${uniqueIds.size} / ${ids.length} ${uniqueIds.size === ids.length ? "✓" : "✗ DUPLICATE!"}`);

  // Final verdict
  const pass = completed.length === 100 && failed.length === 0 && pending.length === 0
    && other.length === 0 && retried.length === 0 && uniqueIds.size === 100;
  console.log(`\n  ═══ Test A: ${pass ? "PASS ✓" : "FAIL ✗"} ═══\n`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

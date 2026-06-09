/**
 * Test E: Reviewer Quality — Detailed Evidence
 * Inject bad code, capture reviewer's exact findings
 */
import { Broker } from "../broker/Broker";
import { AgentAdapter, AgentResult, ReviewResult, Task } from "../types";

// Executor that returns intentionally broken code
class BadExecutorAdapter implements AgentAdapter {
  name = "bad-executor";
  role = "developer" as const;
  capabilities = ["coding"];
  async detect() { return true; }
  async health() { return true; }
  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    // Return code with real issues
    return {
      success: true,
      output: `// Express server with multiple issues
const express = require('express');  // BUG: express not installed
const app = express();

app.get('/', (req, res => {  // BUG: missing closing paren
  res.send('Hello World'     // BUG: missing closing paren
});

app.listen(3000, () => {     // BUG: port conflicts with common dev port
  console.log('Server on 3000'
});                          // BUG: missing closing paren`,
    };
  }
}

// Strict reviewer that finds real issues
class StrictReviewerAdapter implements AgentAdapter {
  name = "strict-reviewer";
  role = "reviewer" as const;
  capabilities = ["review"];
  private callCount = 0;
  async detect() { return true; }
  async health() { return true; }
  async execute(): Promise<AgentResult> { return { success: true, output: "" }; }
  async review(task: Task): Promise<ReviewResult> {
    this.callCount++;
    if (this.callCount <= 2) {
      return {
        decision: "FAIL",
        score: 25,
        issues: [
          "Line 2: require('express') — express is not in package.json dependencies",
          "Line 4: Syntax error — missing closing parenthesis in arrow function: (req, res => should be (req, res) =>",
          "Line 5: Syntax error — missing closing parenthesis: res.send('Hello World' needs )",
          "Line 8: Syntax error — missing closing parenthesis in callback: console.log('Server on 3000' needs )",
          "General: Multiple unclosed parentheses will cause runtime SyntaxError",
        ],
      };
    }
    return { decision: "PASS", score: 78, issues: [] };
  }
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Test E: Reviewer Quality — Evidence");
  console.log("═══════════════════════════════════════════\n");

  const broker = new Broker();
  await broker.registerAdapter(new BadExecutorAdapter());
  await broker.registerAdapter(new StrictReviewerAdapter());
  broker.registry.link("bad-executor", "strict-reviewer");

  // ── Show injected errors ──
  console.log("  [Injected Errors]");
  console.log("  The executor returns intentionally broken code:\n");
  console.log("    // Express server with multiple issues");
  console.log("    const express = require('express');  ← NOT INSTALLED");
  console.log("    app.get('/', (req, res => {           ← MISSING )");
  console.log("      res.send('Hello World'              ← MISSING )");
  console.log("    app.listen(3000, () => {              ← MISSING )");
  console.log("      console.log('Server on 3000'       ← MISSING )");
  console.log();

  // ── Run task ──
  const task = broker.submit({
    instruction: "Create an Express server",
    executor: "bad-executor",
    reviewer: "strict-reviewer",
    maxRevision: 3,
  });

  console.log(`  Task: ${task.id}`);
  console.log(`  Max revision: ${task.maxRevision}\n`);

  await broker.run();

  // ── Collect evidence ──
  const finalTask = broker.listTasks()[0];
  const history = broker.history.get(task.id);

  console.log("  [Reviewer Findings]");
  for (const h of history) {
    console.log(`\n  Attempt #${h.attempt}:`);
    console.log(`    Decision: ${h.decision}`);
    console.log(`    Score: ${h.score}/100`);
    if (h.issues.length > 0) {
      console.log(`    Issues found (${h.issues.length}):`);
      for (const issue of h.issues) {
        console.log(`      • ${issue}`);
      }
    } else {
      console.log(`    Issues: none`);
    }
  }

  // ── Revision prompt check ──
  console.log("\n  [Revision Flow]");
  const failCount = history.filter(h => h.decision === "FAIL").length;
  const passCount = history.filter(h => h.decision === "PASS").length;
  console.log(`  FAIL count: ${failCount}`);
  console.log(`  PASS count: ${passCount}`);
  console.log(`  Total reviews: ${history.length}`);
  console.log(`  Final status: ${finalTask.status}`);
  console.log(`  Revision count: ${finalTask.revisionCount}`);

  // ── Verdict ──
  const reviewerFoundIssues = failCount > 0;
  const eventuallyPassed = finalTask.status === "COMPLETED";
  const pass = reviewerFoundIssues && eventuallyPassed;

  console.log(`\n  [Verdict]`);
  console.log(`  Reviewer found issues: ${reviewerFoundIssues ? "✓" : "✗"}`);
  console.log(`  Eventually passed:     ${eventuallyPassed ? "✓" : "✗"}`);
  console.log(`\n  ═══ Test E: ${pass ? "PASS ✓" : "FAIL ✗"} ═══\n`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

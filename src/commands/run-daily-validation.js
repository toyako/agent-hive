/**
 * Continuous Validation — Daily Task Generator + Runner
 *
 * Generates real tasks from the Agent Hive codebase and runs them.
 * Designed to be executed daily via cron or manually.
 *
 * Usage: node run-daily-validation.js [day-number]
 */
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const REPORTS_DIR = path.resolve(PROJECT_ROOT, "reports");
const TASKS_DIR = path.resolve(PROJECT_ROOT, ".agent-hive/tasks");

// Task templates — real tasks from the Agent Hive codebase
const TASK_TEMPLATES = [
  {
    name: "Add unit test for TaskIntentClassifier",
    intent: "coding",
    instruction: "Write unit tests for src/product/TaskIntentClassifier.ts. Test all 6 intent categories (coding, review, planning, refactor, architecture, research). Test edge cases (empty string, mixed keywords). Use plain Node.js assert module. Output to src/commands/test-intent-classifier.ts",
    workDir: PROJECT_ROOT,
  },
  {
    name: "Review Broker.ts for edge cases",
    intent: "review",
    instruction: "Review src/broker/Broker.ts for potential issues: error handling, null checks, race conditions in async methods. List any findings with line numbers. Focus on production readiness.",
    workDir: PROJECT_ROOT,
  },
  {
    name: "Refactor: extract timeout logic",
    intent: "refactor",
    instruction: "The timeout logic in src/broker/TaskProcessor.ts (execWithTimeout method) is duplicated. Extract it into a shared utility at src/utils/withTimeout.ts. Keep the same behavior: reject with TIMEOUT error after specified ms. Update TaskProcessor to import from the new utility.",
    workDir: PROJECT_ROOT,
  },
  {
    name: "Document API surface",
    intent: "research",
    instruction: "Analyze the Agent Hive public API surface: all exported classes, functions, and types from src/. Generate a concise API reference at docs/api-reference.md. Group by module (broker, adapters, graph, types, product).",
    workDir: PROJECT_ROOT,
  },
  {
    name: "Add error handling to adapters",
    intent: "coding",
    instruction: "Review all adapter files in src/adapters/*.ts. For each adapter, verify that execute() and review() methods have proper try/catch with descriptive error messages. If any adapter is missing error handling, add it. Focus on network errors and timeout handling.",
    workDir: PROJECT_ROOT,
  },
  {
    name: "Architecture review: module dependencies",
    intent: "architecture",
    instruction: "Analyze the module dependency graph of Agent Hive src/. Check for: circular dependencies, unnecessary coupling between modules, modules that import too many dependencies. Report findings at docs/architecture-review.md with recommendations.",
    workDir: PROJECT_ROOT,
  },
  {
    name: "Optimize: reduce adapter registration time",
    intent: "refactor",
    instruction: "Profile the adapter registration flow in Broker.registerAdapter(). The detect() call makes network requests that can be slow. Add parallel detection (detect all adapters concurrently instead of sequentially). Maintain the same output format.",
    workDir: PROJECT_ROOT,
  },
  {
    name: "Add integration test for revision loop",
    intent: "coding",
    instruction: "Write an integration test that forces a revision loop: create a mock reviewer that always returns FAIL for the first 2 attempts, then PASS on the 3rd. Verify that the broker correctly handles the revision cycle. Output to src/commands/test-revision-loop.ts",
    workDir: PROJECT_ROOT,
  },
  {
    name: "Review security: API key handling",
    intent: "review",
    instruction: "Audit how API keys are handled in Agent Hive: runtime.json stores keys in plaintext. Review all files that read runtime.json. Check if keys could leak through logs, error messages, or console output. Report findings.",
    workDir: PROJECT_ROOT,
  },
  {
    name: "Plan: v3.1 feature roadmap",
    intent: "planning",
    instruction: "Based on the current Agent Hive codebase, propose a v3.1 feature roadmap. Consider: what's missing for production use, what users would want next, what technical debt remains. Output to docs/roadmap-v3.1.md with priority ranking.",
    workDir: PROJECT_ROOT,
  },
];

function cleanTasks() {
  if (fs.existsSync(TASKS_DIR)) {
    for (const f of fs.readdirSync(TASKS_DIR).filter(f => f.endsWith(".json"))) {
      fs.unlinkSync(path.join(TASKS_DIR, f));
    }
  }
}

function main() {
  const day = parseInt(process.argv[2]) || 1;
  const taskIndex = (day - 1) % TASK_TEMPLATES.length;
  const template = TASK_TEMPLATES[taskIndex];

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Continuous Validation — Day ${day}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  console.log(`Task: ${template.name}`);
  console.log(`Intent: ${template.intent}`);
  console.log(`Working directory: ${template.workDir}\n`);

  // Clean stale tasks
  cleanTasks();

  // Output task config for the runner
  const taskConfig = {
    day,
    timestamp: new Date().toISOString(),
    task: template,
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REPORTS_DIR, `day-${day}-config.json`),
    JSON.stringify(taskConfig, null, 2)
  );

  console.log(`Config saved to reports/day-${day}-config.json`);
  console.log(`\nRun with: node dist/commands/cli.js run --task "${template.instruction.slice(0, 80)}..."\n`);

  // Also print the full command
  console.log(`Full command:`);
  console.log(`  node dist/commands/cli.js run --task "${template.instruction.replace(/"/g, '\\"')}" --dir "${template.workDir}" --max-revision 3\n`);
}

main();

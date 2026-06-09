/**
 * v2.2 Validation Runner — runs 3 real tasks through Agent Hive
 * Uses Broker programmatically (bypasses CLI exit issue)
 */
import { Broker } from "../broker/Broker";
import { getAllAdapters } from "../adapters/registry";
import { TopologyTemplates } from "../graph/TopologyTemplates";
import * as fs from "fs";
import * as path from "path";

interface TaskResult {
  taskNumber: number;
  name: string;
  executor: string;
  reviewer: string;
  status: string;
  revisionCount: number;
  reviewScore: number;
  reviewDecision: string;
  durationMs: number;
  output: string;
  issues: string[];
  escalated: boolean;
}

const RESULTS_DIR = path.resolve(__dirname, "../../artifacts");
const REPORTS_DIR = path.resolve(__dirname, "../../reports");

async function runValidation() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Agent Hive v2.2 — Real Project Validation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const allResults: TaskResult[] = [];
  const startTime = Date.now();

  // ─── Task 1: Landing Page ──────────────────────────
  console.log("═══ Task 1: Landing Page ═══\n");
  const task1 = await runTask({
    taskNumber: 1,
    name: "Landing Page",
    instruction: `Create a complete marketing landing page for "Agent Hive" — an AI multi-runtime orchestration platform.

Requirements:
1. Hero section with headline "Agent Hive — Multi-Runtime AI Orchestration" and a CTA button
2. Features section with 3-4 feature cards (Graph Architecture, Runtime Intelligence, Revision Loop, Observability)
3. Responsive design (mobile-friendly)
4. Modern CSS (gradients, smooth transitions, clean typography)
5. Pure HTML/CSS/JS — no external dependencies

Output a single index.html file.`,
    executor: "claude",
    reviewer: "codex",
    workDir: path.join(RESULTS_DIR, "task-1"),
    timeout: 180_000,
  });
  allResults.push(task1);

  // ─── Task 2: REST API ──────────────────────────────
  console.log("\n═══ Task 2: REST API ═══\n");
  const task2 = await runTask({
    taskNumber: 2,
    name: "REST API (Users CRUD)",
    instruction: `Implement a real Users CRUD REST API in Node.js (vanilla, no Express).

Requirements:
1. GET /users — list all users
2. POST /users — create user (name, email required)
3. PUT /users/:id — update user
4. DELETE /users/:id — delete user
5. JSON error handling with proper status codes
6. Input validation (email format, required fields)
7. In-memory storage (array)
8. PORT from env or default 3000

Output: package.json + src/index.js. The server must be startable with "node src/index.js".`,
    executor: "codex",
    reviewer: "claude",
    workDir: path.join(RESULTS_DIR, "task-2"),
    timeout: 180_000,
  });
  allResults.push(task2);

  // ─── Task 3: Refactor ──────────────────────────────
  console.log("\n═══ Task 3: Refactor Bad Code ═══\n");

  // First, create the bad code
  const badCodeDir = path.join(RESULTS_DIR, "task-3");
  const badCodePath = path.join(badCodeDir, "bad-code.ts");
  fs.mkdirSync(badCodeDir, { recursive: true });
  fs.writeFileSync(badCodePath, BAD_CODE);

  const task3 = await runTask({
    taskNumber: 3,
    name: "Refactor Bad Code",
    instruction: `Refactor the TypeScript file at ${badCodePath}.

The file has these problems:
1. Duplicate code — same logic repeated 3+ times
2. Poor naming — single letter variables, unclear function names
3. No separation of concerns — everything in one file
4. Missing error handling — no try/catch, no input validation
5. No types — using 'any' everywhere

Refactor the file:
- Extract reusable functions
- Use clear, descriptive names
- Add proper TypeScript types
- Add error handling
- Split into logical modules if needed

Write the refactored code to ${badCodeDir}/refactored/`,
    executor: "codex",
    reviewer: "claude",
    workDir: badCodeDir,
    timeout: 180_000,
  });
  allResults.push(task3);

  // ─── Collect Metrics ───────────────────────────────
  const totalTime = Date.now() - startTime;
  const metrics = collectMetrics(allResults, totalTime);

  // ─── Write Reports ─────────────────────────────────
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REPORTS_DIR, "validation-metrics.json"),
    JSON.stringify(metrics, null, 2)
  );

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Validation Complete");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Total time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`  Success rate: ${metrics.taskSuccessRate}`);
  console.log(`  Avg revision count: ${metrics.averageRevisionCount}`);
  console.log(`  Avg review score: ${metrics.averageReviewScore}`);
  console.log(`  Reports: ${REPORTS_DIR}/validation-metrics.json`);

  process.exit(0);
}

interface TaskConfig {
  taskNumber: number;
  name: string;
  instruction: string;
  executor: string;
  reviewer: string;
  workDir: string;
  timeout: number;
}

async function runTask(config: TaskConfig): Promise<TaskResult> {
  // Clean stale tasks from previous runs
  const tasksDir = path.resolve(process.cwd(), ".agent-hive/tasks");
  if (fs.existsSync(tasksDir)) {
    for (const f of fs.readdirSync(tasksDir).filter(f => f.endsWith(".json"))) {
      fs.unlinkSync(path.join(tasksDir, f));
    }
  }

  const broker = new Broker();

  // Register adapters
  for (const adapter of getAllAdapters()) {
    await broker.registerAdapter(adapter);
  }

  // Build graph with runtime names as agent IDs
  const { AgentProfile } = require("../types");
  broker.addAgentProfile({ id: config.executor, runtimeId: config.executor, role: "executor", maxConcurrency: 1, status: "idle" });
  broker.addAgentProfile({ id: config.reviewer, runtimeId: config.reviewer, role: "reviewer", maxConcurrency: 1, status: "idle" });
  broker.addGraphEdge(config.executor, config.reviewer, "reviews", 10);
  broker.addGraphEdge(config.reviewer, config.executor, "escalates", 5);
  broker.enableGraphMode();

  // Submit task
  broker.submit({
    instruction: config.instruction,
    executor: config.executor,
    reviewer: config.reviewer,
    workingDirectory: config.workDir,
    maxRevision: 3,
    timeout: config.timeout,
  });

  // Run
  const start = Date.now();
  await broker.run();
  const duration = Date.now() - start;

  // Collect results
  const tasks = broker.listTasks();
  const task = tasks[0];
  const history = broker.history.get(task?.id || "");
  const lastReview = history[history.length - 1];

  const result: TaskResult = {
    taskNumber: config.taskNumber,
    name: config.name,
    executor: config.executor,
    reviewer: config.reviewer,
    status: task?.status || "UNKNOWN",
    revisionCount: task?.revisionCount || 0,
    reviewScore: lastReview?.score || 0,
    reviewDecision: lastReview?.decision || "UNKNOWN",
    durationMs: duration,
    output: (task?.result || "").slice(0, 500),
    issues: lastReview?.issues || [],
    escalated: task?.status === "ESCALATED",
  };

  // Save artifacts
  fs.mkdirSync(config.workDir, { recursive: true });
  fs.writeFileSync(
    path.join(config.workDir, "result.json"),
    JSON.stringify(result, null, 2)
  );

  console.log(`  Status: ${result.status}`);
  console.log(`  Revisions: ${result.revisionCount}`);
  console.log(`  Score: ${result.reviewScore}`);
  console.log(`  Time: ${(duration / 1000).toFixed(1)}s`);

  return result;
}

function collectMetrics(results: TaskResult[], totalTime: number) {
  const successCount = results.filter(r => r.status === "COMPLETED").length;
  const totalRevisions = results.reduce((s, r) => s + r.revisionCount, 0);
  const totalScore = results.reduce((s, r) => s + r.reviewScore, 0);
  const escalationCount = results.filter(r => r.escalated).length;

  return {
    timestamp: new Date().toISOString(),
    totalTasks: results.length,
    successfulTasks: successCount,
    taskSuccessRate: `${((successCount / results.length) * 100).toFixed(0)}%`,
    averageRevisionCount: (totalRevisions / results.length).toFixed(1),
    averageReviewScore: (totalScore / results.length).toFixed(1),
    totalDurationMs: totalTime,
    averageCompletionMs: Math.round(totalTime / results.length),
    escalationCount,
    runtimeDistribution: {
      executor: results.map(r => r.executor),
      reviewer: results.map(r => r.reviewer),
    },
    taskDetails: results,
  };
}

// ─── Deliberately bad code for Task 3 ──────────────────

const BAD_CODE = `import * as fs from "fs";

// process data
function p(d: any) {
  let r = [];
  for (let i = 0; i < d.length; i++) {
    if (d[i].t == "a") {
      r.push({ n: d[i].n, v: d[i].v * 2 });
    }
  }
  return r;
}

// also process data but slightly different
function p2(d: any) {
  let r = [];
  for (let i = 0; i < d.length; i++) {
    if (d[i].t == "b") {
      r.push({ n: d[i].n, v: d[i].v * 3 });
    }
  }
  return r;
}

// and again
function p3(d: any) {
  let r = [];
  for (let i = 0; i < d.length; i++) {
    if (d[i].t == "c") {
      r.push({ n: d[i].n, v: d[i].v + 10 });
    }
  }
  return r;
}

// save to file
function s(d: any, f: string) {
  fs.writeFileSync(f, JSON.stringify(d));
}

// load from file
function l(f: string) {
  return JSON.parse(fs.readFileSync(f, "utf-8"));
}

// do everything
function main() {
  const d = l("data.json");
  const a = p(d);
  const b = p2(d);
  const c = p3(d);
  const all = [...a, ...b, ...c];
  s(all, "output.json");
  console.log("done: " + all.length);
}

main();
`;

runValidation().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});

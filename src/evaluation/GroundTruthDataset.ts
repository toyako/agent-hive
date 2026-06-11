/**
 * Ground Truth Dataset — 50 benchmark tasks with expected outcomes.
 */
export interface BenchmarkTask {
  id: string;
  category: string;
  task: string;
  expected: {
    files: string[];
    tests: string[];
    acceptanceCriteria: string[];
    minScore: number;
  };
}

export const BENCHMARK_DATASET: BenchmarkTask[] = [
  // CLI Refactor (10)
  { id: "cli-01", category: "cli-refactor", task: "Extract command handler functions from a monolithic switch statement", expected: { files: ["commands/"], tests: ["handler extraction"], acceptanceCriteria: ["Each command in separate function", "No switch statement > 50 lines"], minScore: 70 } },
  { id: "cli-02", category: "cli-refactor", task: "Add proper error handling to CLI commands", expected: { files: ["commands/"], tests: ["error handling"], acceptanceCriteria: ["Try-catch on all async commands", "User-friendly error messages"], minScore: 70 } },
  { id: "cli-03", category: "cli-refactor", task: "Implement consistent help text for all commands", expected: { files: ["commands/"], tests: ["help text"], acceptanceCriteria: ["All commands have --help", "Consistent format"], minScore: 60 } },
  { id: "cli-04", category: "cli-refactor", task: "Add input validation to CLI arguments", expected: { files: ["commands/"], tests: ["validation"], acceptanceCriteria: ["Required args checked", "Type validation"], minScore: 70 } },
  { id: "cli-05", category: "cli-refactor", task: "Refactor config loading to use a centralized config module", expected: { files: ["config/"], tests: ["config loading"], acceptanceCriteria: ["Single config source", "No hardcoded values"], minScore: 70 } },
  { id: "cli-06", category: "cli-refactor", task: "Add verbose/debug output mode to CLI", expected: { files: ["commands/"], tests: ["debug mode"], acceptanceCriteria: ["--verbose flag", "Debug output"], minScore: 60 } },
  { id: "cli-07", category: "cli-refactor", task: "Implement command aliases for frequently used commands", expected: { files: ["commands/"], tests: ["aliases"], acceptanceCriteria: ["Short aliases work", "Documented"], minScore: 50 } },
  { id: "cli-08", category: "cli-refactor", task: "Add progress indicators for long-running commands", expected: { files: ["commands/"], tests: ["progress"], acceptanceCriteria: ["Spinner or progress bar", "Non-blocking"], minScore: 60 } },
  { id: "cli-09", category: "cli-refactor", task: "Refactor output formatting to support JSON and table modes", expected: { files: ["commands/"], tests: ["output format"], acceptanceCriteria: ["--json flag", "Table default"], minScore: 70 } },
  { id: "cli-10", category: "cli-refactor", task: "Add shell completion support", expected: { files: ["commands/"], tests: ["completion"], acceptanceCriteria: ["bash/zsh completion", "Dynamic suggestions"], minScore: 50 } },

  // Bug Fix (10)
  { id: "bug-01", category: "bug-fix", task: "Fix race condition in parallel task execution", expected: { files: ["orchestration/DAGExecutor.ts"], tests: ["race condition"], acceptanceCriteria: ["No data corruption", "Consistent results"], minScore: 80 } },
  { id: "bug-02", category: "bug-fix", task: "Fix memory leak in EventBus event storage", expected: { files: ["runtime/EventBus.ts"], tests: ["memory leak"], acceptanceCriteria: ["Events cleaned up", "No unbounded growth"], minScore: 80 } },
  { id: "bug-03", category: "bug-fix", task: "Fix timeout handling in ExecutionEngine", expected: { files: ["engine/ExecutionEngine.ts"], tests: ["timeout"], acceptanceCriteria: ["Clean timeout", "No zombie processes"], minScore: 80 } },
  { id: "bug-04", category: "bug-fix", task: "Fix path normalization on Windows", expected: { files: ["engine/ResultNormalizer.ts"], tests: ["path normalization"], acceptanceCriteria: ["Windows paths work", "No backslash issues"], minScore: 70 } },
  { id: "bug-05", category: "bug-fix", task: "Fix concurrent file writes in StructuredLogger", expected: { files: ["engine/StructuredLogger.ts"], tests: ["concurrent write"], acceptanceCriteria: ["No file corruption", "All entries saved"], minScore: 80 } },
  { id: "bug-06", category: "bug-fix", task: "Fix agent router returning null for valid tasks", expected: { files: ["orchestration/AgentRouter.ts"], tests: ["router null"], acceptanceCriteria: ["Valid tasks always routed", "No silent fail"], minScore: 80 } },
  { id: "bug-07", category: "bug-fix", task: "Fix planner generating duplicate task IDs", expected: { files: ["orchestration/Planner.ts"], tests: ["duplicate IDs"], acceptanceCriteria: ["All IDs unique", "No collisions"], minScore: 70 } },
  { id: "bug-08", category: "bug-fix", task: "Fix reviewer accepting empty outputs", expected: { files: ["orchestration/ReviewerAgent.ts"], tests: ["empty output"], acceptanceCriteria: ["Empty output rejected", "Score < 60"], minScore: 70 } },
  { id: "bug-09", category: "bug-fix", task: "Fix DAG executor not handling circular dependencies", expected: { files: ["orchestration/DAGExecutor.ts"], tests: ["circular deps"], acceptanceCriteria: ["Detection", "Error message"], minScore: 80 } },
  { id: "bug-10", category: "bug-fix", task: "Fix replay engine missing events from crashed agents", expected: { files: ["runtime/ReplayEngine.ts"], tests: ["missing events"], acceptanceCriteria: ["Partial replay works", "Graceful degradation"], minScore: 70 } },

  // Feature (10)
  { id: "feat-01", category: "feature", task: "Implement agent priority-based routing", expected: { files: ["orchestration/AgentRouter.ts"], tests: ["priority routing"], acceptanceCriteria: ["Higher priority preferred", "Tie-breaking"], minScore: 70 } },
  { id: "feat-02", category: "feature", task: "Add retry logic with exponential backoff", expected: { files: ["orchestration/DAGExecutor.ts"], tests: ["retry logic"], acceptanceCriteria: ["Exponential backoff", "Max retries"], minScore: 70 } },
  { id: "feat-03", category: "feature", task: "Implement agent health monitoring", expected: { files: ["orchestration/registry/"], tests: ["health check"], acceptanceCriteria: ["Periodic checks", "Unhealthy agents disabled"], minScore: 60 } },
  { id: "feat-04", category: "feature", task: "Add task result caching", expected: { files: ["orchestration/"], tests: ["caching"], acceptanceCriteria: ["Cache hit", "TTL support"], minScore: 60 } },
  { id: "feat-05", category: "feature", task: "Implement conversation context compression", expected: { files: ["memory/ContextCompressor.ts"], tests: ["compression"], acceptanceCriteria: ["50%+ compression", "No info loss"], minScore: 70 } },
  { id: "feat-06", category: "feature", task: "Add agent capability discovery", expected: { files: ["orchestration/registry/"], tests: ["capability discovery"], acceptanceCriteria: ["Auto-detect capabilities", "Update registry"], minScore: 60 } },
  { id: "feat-07", category: "feature", task: "Implement task dependency visualization", expected: { files: ["orchestration/"], tests: ["visualization"], acceptanceCriteria: ["DAG output", "Mermaid format"], minScore: 50 } },
  { id: "feat-08", category: "feature", task: "Add cost tracking per task", expected: { files: ["evaluation/"], tests: ["cost tracking"], acceptanceCriteria: ["Token count", "Cost estimate"], minScore: 60 } },
  { id: "feat-09", category: "feature", task: "Implement agent load balancing", expected: { files: ["orchestration/AgentRouter.ts"], tests: ["load balancing"], acceptanceCriteria: ["Even distribution", "No overload"], minScore: 60 } },
  { id: "feat-10", category: "feature", task: "Add execution trace export to JSON", expected: { files: ["runtime/"], tests: ["export"], acceptanceCriteria: ["Valid JSON", "Complete trace"], minScore: 60 } },

  // Architecture (10)
  { id: "arch-01", category: "architecture", task: "Review and optimize module dependency graph", expected: { files: ["docs/"], tests: ["dependency review"], acceptanceCriteria: ["No circular deps", "Clean layering"], minScore: 70 } },
  { id: "arch-02", category: "architecture", task: "Design plugin system for custom agents", expected: { files: ["orchestration/"], tests: ["plugin system"], acceptanceCriteria: ["Plugin interface", "Dynamic loading"], minScore: 60 } },
  { id: "arch-03", category: "architecture", task: "Implement event-driven architecture for agent communication", expected: { files: ["runtime/EventBus.ts"], tests: ["event-driven"], acceptanceCriteria: ["Pub/sub", "Decoupled agents"], minScore: 70 } },
  { id: "arch-04", category: "architecture", task: "Design scalable task queue with priority support", expected: { files: ["orchestration/"], tests: ["task queue"], acceptanceCriteria: ["Priority ordering", "Persistence"], minScore: 70 } },
  { id: "arch-05", category: "architecture", task: "Implement configuration validation layer", expected: { files: ["config/"], tests: ["config validation"], acceptanceCriteria: ["Schema validation", "Error messages"], minScore: 60 } },
  { id: "arch-06", category: "architecture", task: "Design multi-tenant agent isolation", expected: { files: ["orchestration/"], tests: ["isolation"], acceptanceCriteria: ["Tenant separation", "No cross-talk"], minScore: 60 } },
  { id: "arch-07", category: "architecture", task: "Implement graceful degradation for agent failures", expected: { files: ["orchestration/"], tests: ["degradation"], acceptanceCriteria: ["Fallback agents", "Reduced capability"], minScore: 70 } },
  { id: "arch-08", category: "architecture", task: "Design audit trail for all agent actions", expected: { files: ["runtime/"], tests: ["audit trail"], acceptanceCriteria: ["Complete logging", "Tamper-proof"], minScore: 70 } },
  { id: "arch-09", category: "architecture", task: "Implement rate limiting for API calls", expected: { files: ["engine/"], tests: ["rate limiting"], acceptanceCriteria: ["Token bucket", "Graceful queuing"], minScore: 60 } },
  { id: "arch-10", category: "architecture", task: "Design horizontal scaling strategy", expected: { files: ["docs/"], tests: ["scaling"], acceptanceCriteria: ["Stateless design", "Load balancer compatible"], minScore: 50 } },

  // Recovery (10)
  { id: "recv-01", category: "recovery", task: "Recover from agent timeout during execution", expected: { files: ["orchestration/DAGExecutor.ts"], tests: ["timeout recovery"], acceptanceCriteria: ["Clean timeout", "Retry or skip"], minScore: 70 } },
  { id: "recv-02", category: "recovery", task: "Recover from network failure during API call", expected: { files: ["engine/"], tests: ["network recovery"], acceptanceCriteria: ["Retry with backoff", "Error reported"], minScore: 70 } },
  { id: "recv-03", category: "recovery", task: "Recover from corrupted event log", expected: { files: ["runtime/EventBus.ts"], tests: ["corrupt log"], acceptanceCriteria: ["Partial recovery", "Error logged"], minScore: 70 } },
  { id: "recv-04", category: "recovery", task: "Recover from agent crash mid-task", expected: { files: ["orchestration/"], tests: ["crash recovery"], acceptanceCriteria: ["Task re-assigned", "No data loss"], minScore: 70 } },
  { id: "recv-05", category: "recovery", task: "Recover from disk full during logging", expected: { files: ["engine/StructuredLogger.ts"], tests: ["disk full"], acceptanceCriteria: ["Graceful degradation", "In-memory fallback"], minScore: 60 } },
  { id: "recv-06", category: "recovery", task: "Recover from invalid AST in command", expected: { files: ["sandbox/ExecutionSandbox.ts"], tests: ["invalid AST"], acceptanceCriteria: ["Validation error", "No crash"], minScore: 70 } },
  { id: "recv-07", category: "recovery", task: "Recover from reviewer producing invalid score", expected: { files: ["orchestration/ReviewerAgent.ts"], tests: ["invalid score"], acceptanceCriteria: ["Score clamped", "Default to FAIL"], minScore: 70 } },
  { id: "recv-08", category: "recovery", task: "Recover from DAG with missing dependencies", expected: { files: ["orchestration/DAGExecutor.ts"], tests: ["missing deps"], acceptanceCriteria: ["Error message", "No infinite loop"], minScore: 80 } },
  { id: "recv-09", category: "recovery", task: "Recover from memory pressure during large DAG", expected: { files: ["orchestration/DAGExecutor.ts"], tests: ["memory pressure"], acceptanceCriteria: ["Batch execution", "No OOM"], minScore: 60 } },
  { id: "recv-10", category: "recovery", task: "Recover from concurrent modification of agent registry", expected: { files: ["orchestration/registry/AgentRegistry.ts"], tests: ["concurrent mod"], acceptanceCriteria: ["No corruption", "Consistent state"], minScore: 70 } },
];

export function getBenchmarksByCategory(category: string): BenchmarkTask[] {
  return BENCHMARK_DATASET.filter(t => t.category === category);
}

export function getBenchmarkById(id: string): BenchmarkTask | undefined {
  return BENCHMARK_DATASET.find(t => t.id === id);
}

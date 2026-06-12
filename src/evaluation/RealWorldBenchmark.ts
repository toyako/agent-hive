/**
 * RealWorldBenchmark — 50 real-world tasks with difficulty tiers.
 */
export type Difficulty = "L1" | "L2" | "L3" | "L4";
export type Category = "self-development" | "bug-fix" | "feature-delivery" | "adversarial" | "exploratory";

export interface RealWorldTask {
  id: string;
  category: Category;
  difficulty: Difficulty;
  task: string;
  expected: {
    outputs: string[];
    tests: string[];
    acceptanceCriteria: string[];
  };
}

export const REAL_WORLD_BENCHMARKS: RealWorldTask[] = [
  // === Self Development (10) ===
  { id: "rw-01", category: "self-development", difficulty: "L2", task: "Add plugin loading system to Agent Hive CLI", expected: { outputs: ["src/plugins/PluginLoader.ts"], tests: ["plugin load", "plugin not found"], acceptanceCriteria: ["Dynamic plugin import", "Error on missing plugin"] } },
  { id: "rw-02", category: "self-development", difficulty: "L3", task: "Implement config validation with schema for .agent-hive/config.json", expected: { outputs: ["src/config/ConfigValidator.ts"], tests: ["valid config", "invalid config", "missing fields"], acceptanceCriteria: ["Schema validation", "Descriptive errors"] } },
  { id: "rw-03", category: "self-development", difficulty: "L2", task: "Add workflow DSL parser for task definitions", expected: { outputs: ["src/workflow/WorkflowDSL.ts"], tests: ["parse simple", "parse complex"], acceptanceCriteria: ["DSL syntax", "Error on invalid"] } },
  { id: "rw-04", category: "self-development", difficulty: "L3", task: "Build replay visualization showing agent message flow", expected: { outputs: ["src/runtime/ReplayVisualizer.ts"], tests: ["generate mermaid", "generate timeline"], acceptanceCriteria: ["Mermaid output", "Timeline output"] } },
  { id: "rw-05", category: "self-development", difficulty: "L2", task: "Add task dashboard showing active/completed/failed tasks", expected: { outputs: ["src/commands/dashboard.ts"], tests: ["show active", "show completed"], acceptanceCriteria: ["Task counts", "Status display"] } },
  { id: "rw-06", category: "self-development", difficulty: "L1", task: "Add --json output flag to all CLI commands", expected: { outputs: ["src/commands/cli.ts"], tests: ["json output", "default output"], acceptanceCriteria: ["Valid JSON", "All commands supported"] } },
  { id: "rw-07", category: "self-development", difficulty: "L4", task: "Implement hot-reload for agent configurations", expected: { outputs: ["src/orchestration/registry/HotReloader.ts"], tests: ["reload on change", "no restart"], acceptanceCriteria: ["File watcher", "Config update"] } },
  { id: "rw-08", category: "self-development", difficulty: "L2", task: "Add agent performance profiling per task", expected: { outputs: ["src/evaluation/AgentProfiler.ts"], tests: ["profile task", "aggregate stats"], acceptanceCriteria: ["Per-agent stats", "Duration tracking"] } },
  { id: "rw-09", category: "self-development", difficulty: "L3", task: "Implement task priority queue with weighted scheduling", expected: { outputs: ["src/orchestration/TaskQueue.ts"], tests: ["priority order", "weight balance"], acceptanceCriteria: ["Priority respected", "Fair scheduling"] } },
  { id: "rw-10", category: "self-development", difficulty: "L1", task: "Add version check command showing all component versions", expected: { outputs: ["src/commands/version.ts"], tests: ["show versions"], acceptanceCriteria: ["All components listed"] } },

  // === Bug Fix (10) ===
  { id: "rw-11", category: "bug-fix", difficulty: "L2", task: "Fix Windows path separator in log output (backslash vs forward slash)", expected: { outputs: ["src/engine/ResultNormalizer.ts"], tests: ["windows path normalized"], acceptanceCriteria: ["Consistent path format"] } },
  { id: "rw-12", category: "bug-fix", difficulty: "L3", task: "Fix CLI hanging when OpenAI SDK keeps event loop alive", expected: { outputs: ["src/commands/cli.ts"], tests: ["clean exit"], acceptanceCriteria: ["Process exits after command"] } },
  { id: "rw-13", category: "bug-fix", difficulty: "L2", task: "Fix EventBus file write race condition on concurrent publishes", expected: { outputs: ["src/runtime/EventBus.ts"], tests: ["concurrent write"], acceptanceCriteria: ["No data corruption"] } },
  { id: "rw-14", category: "bug-fix", difficulty: "L1", task: "Fix --version flag being treated as task instead of command", expected: { outputs: ["src/commands/cli.ts"], tests: ["--version works"], acceptanceCriteria: ["Shows version, not task"] } },
  { id: "rw-15", category: "bug-fix", difficulty: "L3", task: "Fix DAG executor infinite loop when all tasks have unmet dependencies", expected: { outputs: ["src/orchestration/DAGExecutor.ts"], tests: ["deadlock detection"], acceptanceCriteria: ["Error on deadlock"] } },
  { id: "rw-16", category: "bug-fix", difficulty: "L2", task: "Fix reviewer accepting empty string output as valid", expected: { outputs: ["src/orchestration/ReviewerAgent.ts"], tests: ["empty rejected"], acceptanceCriteria: ["Score < 60 for empty"] } },
  { id: "rw-17", category: "bug-fix", difficulty: "L1", task: "Fix missing .agent-hive directory causing crash on first run", expected: { outputs: ["src/commands/cli.ts"], tests: ["auto create dirs"], acceptanceCriteria: ["No crash, dirs created"] } },
  { id: "rw-18", category: "bug-fix", difficulty: "L3", task: "Fix sandbox not detecting pipe character in command name", expected: { outputs: ["src/sandbox/ExecutionSandbox.ts"], tests: ["pipe rejected"], acceptanceCriteria: ["| in cmd rejected"] } },
  { id: "rw-19", category: "bug-fix", difficulty: "L2", task: "Fix memory search returning results from wrong project", expected: { outputs: ["src/memory/MemorySearch.ts"], tests: ["project scoping"], acceptanceCriteria: ["Results filtered by project"] } },
  { id: "rw-20", category: "bug-fix", difficulty: "L1", task: "Fix doctor command not checking API connectivity", expected: { outputs: ["src/commands/cli.ts"], tests: ["api check"], acceptanceCriteria: ["API status shown"] } },

  // === Feature Delivery (10) ===
  { id: "rw-21", category: "feature-delivery", difficulty: "L3", task: "Implement agent template system for creating new agents", expected: { outputs: ["src/orchestration/templates/AgentTemplate.ts"], tests: ["create from template", "custom template"], acceptanceCriteria: ["Template loading", "Agent creation"] } },
  { id: "rw-22", category: "feature-delivery", difficulty: "L2", task: "Add workflow template library (code-review, bug-fix, feature)", expected: { outputs: ["src/orchestration/templates/WorkflowTemplate.ts"], tests: ["load template", "apply template"], acceptanceCriteria: ["Template library", "DAG generation"] } },
  { id: "rw-23", category: "feature-delivery", difficulty: "L3", task: "Implement CLI extension system for custom commands", expected: { outputs: ["src/commands/ExtensionLoader.ts"], tests: ["load extension", "register command"], acceptanceCriteria: ["Dynamic commands", "Error handling"] } },
  { id: "rw-24", category: "feature-delivery", difficulty: "L4", task: "Build plugin marketplace listing available plugins", expected: { outputs: ["src/plugins/Marketplace.ts"], tests: ["list plugins", "install plugin"], acceptanceCriteria: ["Plugin registry", "Install flow"] } },
  { id: "rw-25", category: "feature-delivery", difficulty: "L2", task: "Add task export to JSON/CSV formats", expected: { outputs: ["src/commands/export.ts"], tests: ["export json", "export csv"], acceptanceCriteria: ["Valid formats", "All fields"] } },
  { id: "rw-26", category: "feature-delivery", difficulty: "L3", task: "Implement agent-to-agent direct messaging", expected: { outputs: ["src/orchestration/AgentMessenger.ts"], tests: ["send message", "receive message"], acceptanceCriteria: ["Direct channel", "Delivery confirmation"] } },
  { id: "rw-27", category: "feature-delivery", difficulty: "L2", task: "Add execution cost estimation before running tasks", expected: { outputs: ["src/evaluation/CostEstimator.ts"], tests: ["estimate tokens", "estimate cost"], acceptanceCriteria: ["Token estimate", "Cost estimate"] } },
  { id: "rw-28", category: "feature-delivery", difficulty: "L1", task: "Add dry-run mode showing what would execute without running", expected: { outputs: ["src/commands/cli.ts"], tests: ["dry run output"], acceptanceCriteria: ["Plan shown", "No execution"] } },
  { id: "rw-29", category: "feature-delivery", difficulty: "L3", task: "Implement task scheduling with cron-like syntax", expected: { outputs: ["src/orchestration/TaskScheduler.ts"], tests: ["schedule task", "cron parse"], acceptanceCriteria: ["Cron syntax", "Auto-trigger"] } },
  { id: "rw-30", category: "feature-delivery", difficulty: "L2", task: "Add agent capability auto-discovery from execution history", expected: { outputs: ["src/orchestration/registry/CapabilityDiscovery.ts"], tests: ["discover caps", "update registry"], acceptanceCriteria: ["Auto-detect", "Registry update"] } },

  // === Adversarial (10) ===
  { id: "rw-31", category: "adversarial", difficulty: "L3", task: "Detect and reject task that claims success but produces no output", expected: { outputs: ["src/orchestration/ReviewerAgent.ts"], tests: ["fake success detected"], acceptanceCriteria: ["Empty output = FAIL"] } },
  { id: "rw-32", category: "adversarial", difficulty: "L4", task: "Detect task that produces fake test results", expected: { outputs: ["src/evaluation/FakeTestDetector.ts"], tests: ["fake test detected"], acceptanceCriteria: ["Test output validation"] } },
  { id: "rw-33", category: "adversarial", difficulty: "L3", task: "Detect task that references non-existent files as output", expected: { outputs: ["src/evaluation/OutputValidator.ts"], tests: ["missing file detected"], acceptanceCriteria: ["File existence check"] } },
  { id: "rw-34", category: "adversarial", difficulty: "L2", task: "Detect task that produces incorrect logic (wrong algorithm)", expected: { outputs: ["src/evaluation/LogicValidator.ts"], tests: ["logic error detected"], acceptanceCriteria: ["Output correctness"] } },
  { id: "rw-35", category: "adversarial", difficulty: "L3", task: "Detect judge collusion with reviewer (always same decision)", expected: { outputs: ["src/evaluation/CollusionDetector.ts"], tests: ["collusion detected"], acceptanceCriteria: ["Independence check"] } },
  { id: "rw-36", category: "adversarial", difficulty: "L2", task: "Detect agent that takes credit for another agent's work", expected: { outputs: ["src/evaluation/AttributionChecker.ts"], tests: ["attribution verified"], acceptanceCriteria: ["Agent attribution"] } },
  { id: "rw-37", category: "adversarial", difficulty: "L4", task: "Detect task that passes tests but has hidden security vulnerability", expected: { outputs: ["src/evaluation/SecurityScanner.ts"], tests: ["vuln detected"], acceptanceCriteria: ["Security pattern check"] } },
  { id: "rw-38", category: "adversarial", difficulty: "L2", task: "Detect task that modifies benchmark files to pass", expected: { outputs: ["src/evaluation/BenchmarkGuard.ts"], tests: ["benchmark tamper detected"], acceptanceCriteria: ["Checksum verification"] } },
  { id: "rw-39", category: "adversarial", difficulty: "L3", task: "Detect task that times out but reports success", expected: { outputs: ["src/evaluation/TimeoutValidator.ts"], tests: ["timeout success detected"], acceptanceCriteria: ["Time consistency"] } },
  { id: "rw-40", category: "adversarial", difficulty: "L1", task: "Detect task with empty instruction", expected: { outputs: ["src/sandbox/ExecutionSandbox.ts"], tests: ["empty instruction rejected"], acceptanceCriteria: ["Validation error"] } },

  // === Exploratory (10) ===
  { id: "rw-41", category: "exploratory", difficulty: "L2", task: "Explore: Can Agent Hive refactor its own Planner?", expected: { outputs: ["docs/self-refactor-report.md"], tests: ["planner analysis"], acceptanceCriteria: ["Analysis complete", "Recommendations"] } },
  { id: "rw-42", category: "exploratory", difficulty: "L3", task: "Explore: What happens when all agents fail simultaneously?", expected: { outputs: ["docs/all-fail-scenario.md"], tests: ["all fail handled"], acceptanceCriteria: ["Graceful degradation"] } },
  { id: "rw-43", category: "exploratory", difficulty: "L2", task: "Explore: Can we add a new agent type without code changes?", expected: { outputs: ["docs/dynamic-agent-report.md"], tests: ["dynamic agent"], acceptanceCriteria: ["Config-based agent"] } },
  { id: "rw-44", category: "exploratory", difficulty: "L3", task: "Explore: Performance characteristics under 100 concurrent tasks", expected: { outputs: ["docs/performance-report.md"], tests: ["load test"], acceptanceCriteria: ["No crash", "Metrics collected"] } },
  { id: "rw-45", category: "exploratory", difficulty: "L1", task: "Explore: What CLI commands do users actually use?", expected: { outputs: ["docs/usage-analysis.md"], tests: ["usage tracking"], acceptanceCriteria: ["Command frequency"] } },
  { id: "rw-46", category: "exploratory", difficulty: "L4", task: "Explore: Can Agent Hive generate its own test suite?", expected: { outputs: ["docs/auto-test-report.md"], tests: ["generated tests"], acceptanceCriteria: ["Test generation", "Tests pass"] } },
  { id: "rw-47", category: "exploratory", difficulty: "L2", task: "Explore: What is the optimal number of agents for a task?", expected: { outputs: ["docs/agent-scaling-report.md"], tests: ["scaling analysis"], acceptanceCriteria: ["Recommendation"] } },
  { id: "rw-48", category: "exploratory", difficulty: "L3", task: "Explore: Can replay data be used to train better routers?", expected: { outputs: ["docs/replay-training-report.md"], tests: ["training analysis"], acceptanceCriteria: ["Training feasibility"] } },
  { id: "rw-49", category: "exploratory", difficulty: "L1", task: "Explore: What error messages do users see most often?", expected: { outputs: ["docs/error-analysis.md"], tests: ["error frequency"], acceptanceCriteria: ["Top errors listed"] } },
  { id: "rw-50", category: "exploratory", difficulty: "L3", task: "Explore: Can Agent Hive work with non-OpenAI providers?", expected: { outputs: ["docs/provider-compat-report.md"], tests: ["provider test"], acceptanceCriteria: ["Compatibility matrix"] } },
];

export function getByCategory(cat: Category): RealWorldTask[] {
  return REAL_WORLD_BENCHMARKS.filter(t => t.category === cat);
}

export function getByDifficulty(diff: Difficulty): RealWorldTask[] {
  return REAL_WORLD_BENCHMARKS.filter(t => t.difficulty === diff);
}

export function getById(id: string): RealWorldTask | undefined {
  return REAL_WORLD_BENCHMARKS.find(t => t.id === id);
}

/**
 * TaskIntentClassifier
 *
 * Classifies a task instruction into an intent category.
 * Used by the unified entry to auto-select runtimes and topology.
 */

export type TaskIntent =
  | "coding"
  | "review"
  | "planning"
  | "refactor"
  | "architecture"
  | "research";

interface ClassificationResult {
  intent: TaskIntent;
  confidence: number; // 0-1
  keywords: string[];
}

// Keyword patterns for each intent
const INTENT_PATTERNS: Record<TaskIntent, string[]> = {
  coding: [
    "build", "create", "implement", "write", "code", "develop",
    "make", "add", "feature", "function", "api", "endpoint",
    "component", "module", "service", "page", "app", "website",
    "landing", "crud", "rest", "graphql", "database", "schema",
  ],
  review: [
    "review", "check", "audit", "inspect", "evaluate", "assess",
    "feedback", "quality", "security", "vulnerability", "scan",
    "lint", "analyze", "test", "verify",
  ],
  planning: [
    "plan", "design", "architect", "strategy", "roadmap",
    "proposal", "rfc", "spec", "specification", "outline",
    "brainstorm", "ideate", "explore", "investigate",
  ],
  refactor: [
    "refactor", "clean", "improve", "optimize", "simplify",
    "reorganize", "restructure", "deduplicate", "extract",
    "rename", "migrate", "upgrade", "modernize", "legacy",
  ],
  architecture: [
    "architecture", "system", "infrastructure", "scale",
    "distributed", "microservice", "monorepo", "pipeline",
    "orchestration", "deployment", "ci", "cd", "devops",
  ],
  research: [
    "research", "find", "search", "compare", "evaluate",
    "investigate", "study", "learn", "understand", "document",
    "survey", "benchmark", "analyze", "report",
  ],
};

export class TaskIntentClassifier {
  /**
   * Classify a task instruction into an intent category.
   */
  classify(instruction: string): ClassificationResult {
    const lower = instruction.toLowerCase();
    const words = lower.split(/\s+/);

    const scores: Record<TaskIntent, { score: number; matched: string[] }> = {
      coding: { score: 0, matched: [] },
      review: { score: 0, matched: [] },
      planning: { score: 0, matched: [] },
      refactor: { score: 0, matched: [] },
      architecture: { score: 0, matched: [] },
      research: { score: 0, matched: [] },
    };

    // Score each intent based on keyword matches
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (lower.includes(pattern)) {
          scores[intent as TaskIntent].score += 1;
          scores[intent as TaskIntent].matched.push(pattern);
        }
      }
    }

    // Find the top intent
    let bestIntent: TaskIntent = "coding"; // default
    let bestScore = 0;

    for (const [intent, data] of Object.entries(scores)) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestIntent = intent as TaskIntent;
      }
    }

    // Normalize confidence (0-1)
    const maxPossible = INTENT_PATTERNS[bestIntent].length;
    const confidence = Math.min(bestScore / Math.max(maxPossible * 0.3, 1), 1);

    return {
      intent: bestIntent,
      confidence: Math.round(confidence * 100) / 100,
      keywords: scores[bestIntent].matched.slice(0, 5),
    };
  }
}

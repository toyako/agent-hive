/**
 * ContextCompressor — compresses context to prevent explosion.
 * When context > 50% of max, triggers compression.
 * Output: { goal, completed, decisions, openIssues, nextSteps }
 */

export interface CompressedContext {
  goal: string;
  completed: string[];
  decisions: string[];
  openIssues: string[];
  nextSteps: string;
}

export class ContextCompressor {
  private maxTokens: number;

  constructor(maxTokens: number = 8000) {
    this.maxTokens = maxTokens;
  }

  /** Estimate token count (rough: 1 token ≈ 4 chars) */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /** Check if context needs compression */
  needsCompression(context: string): boolean {
    const tokens = this.estimateTokens(context);
    return tokens > this.maxTokens * 0.5;
  }

  /** Build a compressed context prompt for the model */
  buildCompressionPrompt(context: string): string {
    return `Compress the following context into a structured summary. Return JSON only.

Context:
${context}

Return this JSON format:
{
  "goal": "one sentence describing the overall goal",
  "completed": ["list of completed steps"],
  "decisions": ["key decisions made"],
  "openIssues": ["unresolved issues"],
  "nextSteps": "what should happen next"
}

JSON only, no explanation.`;
  }

  /** Parse compressed result */
  parseCompressed(json: string): CompressedContext | null {
    try {
      const parsed = JSON.parse(json);
      return {
        goal: parsed.goal || "",
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        openIssues: Array.isArray(parsed.openIssues) ? parsed.openIssues : [],
        nextSteps: parsed.nextSteps || "",
      };
    } catch {
      return null;
    }
  }

  /** Format compressed context for injection into prompt */
  formatForPrompt(compressed: CompressedContext): string {
    return [
      `## Context Summary`,
      `Goal: ${compressed.goal}`,
      ``,
      `Completed: ${compressed.completed.length > 0 ? compressed.completed.join(", ") : "none"}`,
      `Decisions: ${compressed.decisions.length > 0 ? compressed.decisions.join(", ") : "none"}`,
      `Open Issues: ${compressed.openIssues.length > 0 ? compressed.openIssues.join(", ") : "none"}`,
      `Next: ${compressed.nextSteps}`,
    ].join("\n");
  }
}

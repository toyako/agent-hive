/**
 * ContextManager — manages context scopes for sub-agents.
 * Each agent gets isolated context, communicates via summaries only.
 */

export interface ContextScope {
  agentId: string;
  taskSummary: string;
  relevantFiles: string[];
  constraints: string[];
}

export class ContextManager {
  private scopes: Map<string, ContextScope> = new Map();

  /** Create an isolated scope for an agent */
  createScope(agentId: string, taskSummary: string, relevantFiles: string[] = [], constraints: string[] = []): void {
    this.scopes.set(agentId, { agentId, taskSummary, relevantFiles, constraints });
  }

  /** Get an agent's scope */
  getScope(agentId: string): ContextScope | null {
    return this.scopes.get(agentId) || null;
  }

  /** Build a context prompt for an agent (isolated — no raw conversation) */
  buildContextPrompt(agentId: string, task: string): string {
    const scope = this.scopes.get(agentId);
    if (!scope) return task;

    const parts = [task, ""];

    if (scope.taskSummary) {
      parts.push(`## Summary\n${scope.taskSummary}`);
    }

    if (scope.relevantFiles.length > 0) {
      parts.push(`## Relevant Files\n${scope.relevantFiles.join("\n")}`);
    }

    if (scope.constraints.length > 0) {
      parts.push(`## Constraints\n${scope.constraints.map(c => `- ${c}`).join("\n")}`);
    }

    return parts.join("\n");
  }

  /** Build a summary message for inter-agent communication */
  buildSummaryMessage(fromAgent: string, result: string): string {
    const scope = this.scopes.get(fromAgent);
    return JSON.stringify({
      type: "summary",
      from: fromAgent,
      summary: result.slice(0, 500),
      relevantFiles: scope?.relevantFiles || [],
    });
  }

  /** Clear all scopes */
  clear(): void {
    this.scopes.clear();
  }
}

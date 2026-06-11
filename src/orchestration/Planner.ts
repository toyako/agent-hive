/**
 * Planner — decomposes user requests into Task DAGs.
 */
import { Task } from "./contracts/Agent";

export class Planner {
  /** Plan a task DAG from a user request */
  plan(request: string): Task[] {
    // Analyze request and create task decomposition
    const taskId = `task-${Date.now().toString(36)}`;

    // Simple heuristic: if request mentions multiple things, split
    const tasks = this.decompose(request, taskId);

    return tasks;
  }

  private decompose(request: string, baseId: string): Task[] {
    const lower = request.toLowerCase();

    // Pattern: design + implement + test + review
    if (lower.includes("build") || lower.includes("create") || lower.includes("implement")) {
      return [
        { id: `${baseId}-design`, title: "Design", description: `Design architecture for: ${request}`, type: "planning", priority: 1, dependencies: [] },
        { id: `${baseId}-implement`, title: "Implement", description: `Implement: ${request}`, type: "coding", priority: 2, dependencies: [`${baseId}-design`] },
        { id: `${baseId}-test`, title: "Test", description: `Test implementation of: ${request}`, type: "testing", priority: 3, dependencies: [`${baseId}-implement`] },
        { id: `${baseId}-review`, title: "Review", description: `Review: ${request}`, type: "review", priority: 4, dependencies: [`${baseId}-test`] },
      ];
    }

    // Pattern: refactor
    if (lower.includes("refactor") || lower.includes("improve") || lower.includes("optimize")) {
      return [
        { id: `${baseId}-analyze`, title: "Analyze", description: `Analyze code for: ${request}`, type: "analysis", priority: 1, dependencies: [] },
        { id: `${baseId}-refactor`, title: "Refactor", description: `Refactor: ${request}`, type: "coding", priority: 2, dependencies: [`${baseId}-analyze`] },
        { id: `${baseId}-review`, title: "Review", description: `Review refactoring: ${request}`, type: "review", priority: 3, dependencies: [`${baseId}-refactor`] },
      ];
    }

    // Pattern: review only
    if (lower.includes("review") || lower.includes("audit")) {
      return [
        { id: `${baseId}-review`, title: "Review", description: `Review: ${request}`, type: "review", priority: 1, dependencies: [] },
      ];
    }

    // Default: single task
    return [
      { id: baseId, title: "Execute", description: request, type: "general", priority: 1, dependencies: [] },
    ];
  }
}

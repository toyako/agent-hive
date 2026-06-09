/**
 * MemorySearch — keyword-based memory search (BM25-lite).
 * No vector DB needed — just fuzzy keyword matching.
 */
import { MemoryStore, TaskMemory, ProjectMemory } from "./MemoryStore";

export class MemorySearch {
  constructor(private store: MemoryStore) {}

  search(query: string): { type: string; name: string; matches: string[] }[] {
    const keywords = query.toLowerCase().split(/\s+/);
    const results: { type: string; name: string; matches: string[] }[] = [];

    // Search task memories
    for (const task of this.store.listTasks()) {
      const text = `${task.goal} ${task.summary} ${task.decisions.join(" ")} ${task.issues.join(" ")}`.toLowerCase();
      const matches = keywords.filter(k => text.includes(k));
      if (matches.length > 0) {
        results.push({ type: "task", name: task.taskId, matches });
      }
    }

    // Search project memories
    for (const proj of this.store.listProjects()) {
      const text = `${proj.project} ${proj.techStack.join(" ")} ${proj.architecture.join(" ")} ${proj.knownIssues.join(" ")} ${proj.patterns.join(" ")}`.toLowerCase();
      const matches = keywords.filter(k => text.includes(k));
      if (matches.length > 0) {
        results.push({ type: "project", name: proj.project, matches });
      }
    }

    // Sort by match count
    results.sort((a, b) => b.matches.length - a.matches.length);
    return results;
  }
}

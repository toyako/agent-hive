/**
 * MemorySearch — hybrid keyword + semantic summary search.
 * No vector DB — local only.
 */
import { MemoryStore, TaskMemory, ProjectMemory } from "./MemoryStore";

export class MemorySearch {
  constructor(private store: MemoryStore) {}

  search(query: string): { type: string; name: string; score: number; matches: string[] }[] {
    const keywords = query.toLowerCase().split(/\s+/);
    const results: { type: string; name: string; score: number; matches: string[] }[] = [];

    // Search task memories
    for (const task of this.store.listTasks()) {
      const score = this.scoreMatch(keywords, task);
      if (score > 0) {
        results.push({ type: "task", name: task.taskId, score, matches: this.getMatches(keywords, task) });
      }
    }

    // Search project memories
    for (const proj of this.store.listProjects()) {
      const score = this.scoreProjectMatch(keywords, proj);
      if (score > 0) {
        results.push({ type: "project", name: proj.project, score, matches: this.getProjectMatches(keywords, proj) });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  private scoreMatch(keywords: string[], task: TaskMemory): number {
    let score = 0;
    const goal = task.goal.toLowerCase();
    const summary = (task.summary || "").toLowerCase();
    const decisions = task.decisions.join(" ").toLowerCase();
    const issues = task.issues.join(" ").toLowerCase();

    for (const kw of keywords) {
      // Goal match: highest weight
      if (goal.includes(kw)) score += 3;
      // Summary match: medium weight
      if (summary.includes(kw)) score += 2;
      // Decisions match: medium weight
      if (decisions.includes(kw)) score += 2;
      // Issues match: low weight
      if (issues.includes(kw)) score += 1;
    }

    return score;
  }

  private scoreProjectMatch(keywords: string[], proj: ProjectMemory): number {
    let score = 0;
    const name = proj.project.toLowerCase();
    const stack = proj.techStack.join(" ").toLowerCase();
    const arch = proj.architecture.join(" ").toLowerCase();
    const issues = proj.knownIssues.join(" ").toLowerCase();
    const patterns = proj.patterns.join(" ").toLowerCase();

    for (const kw of keywords) {
      if (name.includes(kw)) score += 3;
      if (stack.includes(kw)) score += 2;
      if (arch.includes(kw)) score += 2;
      if (issues.includes(kw)) score += 1;
      if (patterns.includes(kw)) score += 1;
    }

    return score;
  }

  private getMatches(keywords: string[], task: TaskMemory): string[] {
    const matches: string[] = [];
    const all = `${task.goal} ${task.summary} ${task.decisions.join(" ")} ${task.issues.join(" ")}`.toLowerCase();
    for (const kw of keywords) {
      if (all.includes(kw)) matches.push(kw);
    }
    return matches;
  }

  private getProjectMatches(keywords: string[], proj: ProjectMemory): string[] {
    const matches: string[] = [];
    const all = `${proj.project} ${proj.techStack.join(" ")} ${proj.architecture.join(" ")} ${proj.knownIssues.join(" ")} ${proj.patterns.join(" ")}`.toLowerCase();
    for (const kw of keywords) {
      if (all.includes(kw)) matches.push(kw);
    }
    return matches;
  }
}

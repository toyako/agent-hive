/**
 * MemoryManager — coordinates short-term and long-term memory.
 */
import { MemoryStore, TaskMemory, ProjectMemory } from "./MemoryStore";
import { MemorySearch } from "./MemorySearch";
import * as path from "path";

export class MemoryManager {
  private store: MemoryStore;
  private search: MemorySearch;

  constructor(baseDir?: string) {
    const base = baseDir || path.resolve(process.cwd(), ".agent-hive");
    this.store = new MemoryStore(base);
    this.search = new MemorySearch(this.store);
  }

  /** Save a task memory (short-term) */
  saveTaskMemory(mem: TaskMemory): void {
    this.store.saveTask(mem);
  }

  /** Save/update project memory (long-term) */
  saveProjectMemory(mem: ProjectMemory): void {
    this.store.saveProject(mem);
  }

  /** Get task memory */
  getTaskMemory(taskId: string): TaskMemory | null {
    return this.store.getTask(taskId);
  }

  /** Get project memory */
  getProjectMemory(project: string): ProjectMemory | null {
    return this.store.getProject(project);
  }

  /** List all projects */
  listProjects(): ProjectMemory[] {
    return this.store.listProjects();
  }

  /** List all task memories */
  listTaskMemories(): TaskMemory[] {
    return this.store.listTasks();
  }

  /** Search memories by keyword */
  searchMemories(query: string): { type: string; name: string; matches: string[] }[] {
    return this.search.search(query);
  }
}

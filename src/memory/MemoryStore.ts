/**
 * MemoryStore — persistent storage for task and project memories.
 */
import * as fs from "fs";
import * as path from "path";

export interface TaskMemory {
  taskId: string;
  goal: string;
  decisions: string[];
  artifacts: string[];
  issues: string[];
  summary: string;
  timestamp: string;
}

export interface ProjectMemory {
  project: string;
  techStack: string[];
  architecture: string[];
  knownIssues: string[];
  patterns: string[];
  createdAt: string;
  updatedAt: string;
}

export class MemoryStore {
  private tasksDir: string;
  private projectsDir: string;

  constructor(baseDir: string) {
    this.tasksDir = path.join(baseDir, "memory", "tasks");
    this.projectsDir = path.join(baseDir, "memory", "projects");
    fs.mkdirSync(this.tasksDir, { recursive: true });
    fs.mkdirSync(this.projectsDir, { recursive: true });
  }

  saveTask(mem: TaskMemory): void {
    const fp = path.join(this.tasksDir, `${mem.taskId}.json`);
    fs.writeFileSync(fp, JSON.stringify(mem, null, 2));
  }

  getTask(taskId: string): TaskMemory | null {
    const fp = path.join(this.tasksDir, `${taskId}.json`);
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  }

  listTasks(): TaskMemory[] {
    return fs.readdirSync(this.tasksDir)
      .filter(f => f.endsWith(".json"))
      .map(f => JSON.parse(fs.readFileSync(path.join(this.tasksDir, f), "utf-8")));
  }

  saveProject(mem: ProjectMemory): void {
    mem.updatedAt = new Date().toISOString();
    const fp = path.join(this.projectsDir, `${mem.project}.json`);
    fs.writeFileSync(fp, JSON.stringify(mem, null, 2));
  }

  getProject(name: string): ProjectMemory | null {
    const fp = path.join(this.projectsDir, `${name}.json`);
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  }

  listProjects(): ProjectMemory[] {
    return fs.readdirSync(this.projectsDir)
      .filter(f => f.endsWith(".json"))
      .map(f => JSON.parse(fs.readFileSync(path.join(this.projectsDir, f), "utf-8")));
  }
}

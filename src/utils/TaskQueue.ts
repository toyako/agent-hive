import { uuid } from "./uuid";
import { Task, TaskCreateOptions, TaskStatus } from "../types";
import * as fs from "fs";
import * as path from "path";

const TASKS_DIR = path.resolve(process.cwd(), ".agent-hive/tasks");

export class TaskQueue {
  private tasksDir: string;

  constructor(baseDir?: string) {
    this.tasksDir = baseDir || TASKS_DIR;
    fs.mkdirSync(this.tasksDir, { recursive: true });
  }

  create(opts: TaskCreateOptions): Task {
    const task: Task = {
      id: `task-${uuid()}`,
      instruction: opts.instruction,
      executor: opts.executor,
      reviewer: opts.reviewer,
      status: "PENDING",
      revisionCount: 0,
      maxRevision: opts.maxRevision ?? 3,
      timeout: opts.timeout ?? 600_000,
      workingDirectory: opts.workingDirectory || process.cwd(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // v2.0 additions
      escalationPolicy: opts.escalationPolicy,
      conversationId: opts.conversationId,
    };
    this.save(task);
    return task;
  }

  get(id: string): Task | null {
    const fp = path.join(this.tasksDir, `${id}.json`);
    if (!fs.existsSync(fp)) return null;
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  }

  save(task: Task): void {
    task.updatedAt = Date.now();
    const fp = path.join(this.tasksDir, `${task.id}.json`);
    fs.writeFileSync(fp, JSON.stringify(task, null, 2));
  }

  nextPending(): Task | null {
    const files = fs
      .readdirSync(this.tasksDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    for (const f of files) {
      const task: Task = JSON.parse(
        fs.readFileSync(path.join(this.tasksDir, f), "utf-8")
      );
      if (task.status === "PENDING" || task.status === "ESCALATED") return task;
    }
    return null;
  }

  all(): Task[] {
    return fs
      .readdirSync(this.tasksDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) =>
        JSON.parse(fs.readFileSync(path.join(this.tasksDir, f), "utf-8"))
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  updateStatus(id: string, status: TaskStatus): Task | null {
    const task = this.get(id);
    if (!task) return null;
    task.status = status;
    this.save(task);
    return task;
  }
}

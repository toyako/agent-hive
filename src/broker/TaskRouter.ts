import { Task } from "../types";
import { AgentRegistry } from "./AgentRegistry";

export class TaskRouter {
  constructor(private registry: AgentRegistry) {}

  resolveReviewer(task: Task): string {
    // If task has explicit reviewer, use it
    if (task.reviewer) return task.reviewer;

    // Otherwise use the executor's reportsTo
    const entry = this.registry.getEntry(task.executor);
    if (entry?.reportsTo) return entry.reportsTo;

    throw new Error(`No reviewer found for executor: ${task.executor}`);
  }

  validate(task: Task): string[] {
    const errors: string[] = [];

    const executor = this.registry.getEntry(task.executor);
    if (!executor) errors.push(`Unknown executor: ${task.executor}`);
    else if (!executor.healthy) errors.push(`Executor unhealthy: ${task.executor}`);

    const reviewerName = task.reviewer || this.resolveReviewer(task);
    const reviewer = this.registry.getEntry(reviewerName);
    if (!reviewer) errors.push(`Unknown reviewer: ${reviewerName}`);
    else if (!reviewer.healthy) errors.push(`Reviewer unhealthy: ${reviewerName}`);

    return errors;
  }
}

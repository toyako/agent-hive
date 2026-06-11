/**
 * DAGExecutor — executes Task DAGs with parallel execution, dependency resolution, and failure propagation.
 */
import { Task, TaskResult, Agent } from "./contracts/Agent";
import { AgentRouter, RouteResult } from "./AgentRouter";
import { EventBus } from "../runtime/EventBus";

export interface DAGExecutionResult {
  taskId: string;
  status: "completed" | "failed" | "partial";
  results: Map<string, TaskResult>;
  durationMs: number;
}

export class DAGExecutor {
  private router: AgentRouter;
  private agents: Map<string, Agent>;
  private eventBus: EventBus;

  constructor(router: AgentRouter, agents: Map<string, Agent>, eventBus: EventBus) {
    this.router = router;
    this.agents = agents;
    this.eventBus = eventBus;
  }

  /** Execute a DAG of tasks */
  async execute(tasks: Task[]): Promise<DAGExecutionResult> {
    const startTime = Date.now();
    const results = new Map<string, TaskResult>();
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    // Topological sort with parallel execution
    const completed = new Set<string>();
    const failed = new Set<string>();

    while (completed.size + failed.size < tasks.length) {
      // Find tasks whose dependencies are all met
      const ready = tasks.filter(t =>
        !completed.has(t.id) &&
        !failed.has(t.id) &&
        t.dependencies.every(d => completed.has(d))
      );

      if (ready.length === 0) {
        // Deadlock or all remaining tasks have failed dependencies
        break;
      }

      // Execute ready tasks in parallel
      const promises = ready.map(task => this.executeTask(task, results));
      const taskResults = await Promise.all(promises);

      for (const result of taskResults) {
        results.set(result.taskId, result);
        if (result.success) {
          completed.add(result.taskId);
        } else {
          failed.add(result.taskId);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const status = failed.size === 0 ? "completed" : (completed.size > 0 ? "partial" : "failed");

    return { taskId: tasks[0]?.id || "dag", status, results, durationMs };
  }

  private async executeTask(task: Task, previousResults: Map<string, TaskResult>): Promise<TaskResult> {
    const traceId = `dag-${task.id}`;

    // Check dependencies
    for (const depId of task.dependencies) {
      const depResult = previousResults.get(depId);
      if (!depResult || !depResult.success) {
        return {
          taskId: task.id,
          agentId: "system",
          success: false,
          output: `Dependency failed: ${depId}`,
          durationMs: 0,
        };
      }
    }

    // Route to agent
    const route = this.router.route(task);
    if (!route.assignedAgent) {
      return {
        taskId: task.id,
        agentId: "system",
        success: false,
        output: `No agent available: ${route.reason}`,
        durationMs: 0,
      };
    }

    const agent = this.agents.get(route.assignedAgent.id);
    if (!agent) {
      return {
        taskId: task.id,
        agentId: route.assignedAgent.id,
        success: false,
        output: `Agent not found: ${route.assignedAgent.id}`,
        durationMs: 0,
      };
    }

    // Publish event
    this.eventBus.publish({
      id: EventBus.generateId(),
      traceId,
      timestamp: Date.now(),
      type: "TaskStarted",
      payload: { taskId: task.id, agentId: agent.profile.id },
    });

    const startTime = Date.now();

    try {
      const result = await agent.execute(task);

      this.eventBus.publish({
        id: EventBus.generateId(),
        traceId,
        timestamp: Date.now(),
        type: "TaskCompleted",
        payload: { taskId: task.id, agentId: agent.profile.id, success: result.success, durationMs: Date.now() - startTime },
      });

      return result;
    } catch (err: any) {
      this.eventBus.publish({
        id: EventBus.generateId(),
        traceId,
        timestamp: Date.now(),
        type: "TaskFailed",
        payload: { taskId: task.id, agentId: agent.profile.id, error: err.message },
      });

      return {
        taskId: task.id,
        agentId: agent.profile.id,
        success: false,
        output: "",
        durationMs: Date.now() - startTime,
      };
    }
  }
}

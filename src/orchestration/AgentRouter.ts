/**
 * AgentRouter — assigns tasks to optimal agents.
 */
import { AgentRegistry } from "./registry/AgentRegistry";
import { Task } from "./contracts/Agent";
import { AgentProfile } from "./registry/AgentProfile";

export interface RouteResult {
  taskId: string;
  assignedAgent: AgentProfile | null;
  reason: string;
}

export class AgentRouter {
  private registry: AgentRegistry;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  /** Route a task to the best available agent */
  route(task: Task): RouteResult {
    const candidates = this.registry.enabled();

    if (candidates.length === 0) {
      return { taskId: task.id, assignedAgent: null, reason: "No enabled agents" };
    }

    // Score each agent
    const scored = candidates.map(agent => ({
      agent,
      score: this.scoreAgent(agent, task),
    })).sort((a, b) => b.score - a.score);

    const best = scored[0];

    if (best.score === 0) {
      return { taskId: task.id, assignedAgent: null, reason: `No agent capable of task type: ${task.type}` };
    }

    return {
      taskId: task.id,
      assignedAgent: best.agent,
      reason: `Capability match: ${best.agent.role} (score=${best.score})`,
    };
  }

  private scoreAgent(agent: AgentProfile, task: Task): number {
    let score = 0;

    // Capability match
    for (const cap of agent.capabilities) {
      if (task.type.includes(cap) || task.description.toLowerCase().includes(cap)) {
        score += 10;
      }
    }

    // Role match
    if (task.type === "coding" && agent.role === "implementation") score += 20;
    if (task.type === "review" && agent.role === "reviewer") score += 20;
    if (task.type === "planning" && agent.role === "architect") score += 20;
    if (task.type === "testing" && agent.role === "reviewer") score += 15;

    // Priority bonus
    score += agent.priority;

    return score;
  }
}

import { AgentGraph } from "./AgentGraph";
import { AgentProfile, GraphEdge } from "../types";

/**
 * TopologyTemplates
 *
 * Pre-built graph templates for common multi-agent patterns.
 */
export class TopologyTemplates {
  /**
   * Simple chain (v1.1 compatible): Executor → Reviewer
   */
  static simpleChain(executorRuntime: string, reviewerRuntime: string): TemplateResult {
    const agents: AgentProfile[] = [
      { id: "executor", runtimeId: executorRuntime, role: "executor", maxConcurrency: 1, status: "idle" },
      { id: "reviewer", runtimeId: reviewerRuntime, role: "reviewer", maxConcurrency: 1, status: "idle" },
    ];
    const edges: GraphEdge[] = [
      { from: "executor", to: "reviewer", relation: "reviews", weight: 10 },
      { from: "reviewer", to: "executor", relation: "escalates", weight: 5 },
    ];
    return { agents, edges, description: "v1.1 compatible: Executor → Reviewer" };
  }

  /**
   * Plan-Execute-Review: Planner → Executor → Reviewer
   */
  static planExecuteReview(
    plannerRuntime: string,
    executorRuntime: string,
    reviewerRuntime: string
  ): TemplateResult {
    const agents: AgentProfile[] = [
      { id: "planner", runtimeId: plannerRuntime, role: "planner", maxConcurrency: 1, status: "idle" },
      { id: "executor", runtimeId: executorRuntime, role: "executor", maxConcurrency: 1, status: "idle" },
      { id: "reviewer", runtimeId: reviewerRuntime, role: "reviewer", maxConcurrency: 1, status: "idle" },
    ];
    const edges: GraphEdge[] = [
      { from: "planner", to: "executor", relation: "delegates", weight: 10 },
      { from: "executor", to: "reviewer", relation: "reviews", weight: 10 },
      { from: "reviewer", to: "executor", relation: "escalates", weight: 5 },
      { from: "reviewer", to: "planner", relation: "provides", weight: 3 },
    ];
    return { agents, edges, description: "Planner → Executor → Reviewer" };
  }

  /**
   * Fan-out Review: Executor → [Reviewer1, Reviewer2, Reviewer3] (majority vote)
   */
  static fanOutReview(
    executorRuntime: string,
    reviewerRuntimes: string[]
  ): TemplateResult {
    const agents: AgentProfile[] = [
      { id: "executor", runtimeId: executorRuntime, role: "executor", maxConcurrency: 1, status: "idle" },
    ];
    const edges: GraphEdge[] = [];

    reviewerRuntimes.forEach((runtime, i) => {
      const reviewerId = `reviewer-${i + 1}`;
      agents.push({
        id: reviewerId,
        runtimeId: runtime,
        role: "reviewer",
        maxConcurrency: 1,
        status: "idle",
      });
      edges.push({
        from: "executor",
        to: reviewerId,
        relation: "reviews",
        weight: 10,
      });
    });

    return {
      agents,
      edges,
      description: `Executor → [${reviewerRuntimes.length} Reviewers] (majority vote)`,
    };
  }

  /**
   * Pipeline: Agent1 → Agent2 → Agent3 → ... (sequential)
   */
  static pipeline(runtimes: string[]): TemplateResult {
    if (runtimes.length < 2) {
      throw new Error("Pipeline requires at least 2 runtimes");
    }

    const agents: AgentProfile[] = runtimes.map((runtime, i) => ({
      id: `stage-${i + 1}`,
      runtimeId: runtime,
      role: i === 0 ? "executor" as const : i === runtimes.length - 1 ? "reviewer" as const : "coordinator" as const,
      maxConcurrency: 1,
      status: "idle" as const,
    }));

    const edges: GraphEdge[] = [];
    for (let i = 0; i < runtimes.length - 1; i++) {
      edges.push({
        from: `stage-${i + 1}`,
        to: `stage-${i + 2}`,
        relation: "delegates",
        weight: 10,
      });
    }

    return {
      agents,
      edges,
      description: `Pipeline: ${runtimes.length} stages sequential`,
    };
  }

  /**
   * Peer Review: AgentA ↔ AgentB (mutual review)
   */
  static peerReview(runtimeA: string, runtimeB: string): TemplateResult {
    const agents: AgentProfile[] = [
      { id: "agent-a", runtimeId: runtimeA, role: "executor", maxConcurrency: 1, status: "idle" },
      { id: "agent-b", runtimeId: runtimeB, role: "executor", maxConcurrency: 1, status: "idle" },
    ];
    const edges: GraphEdge[] = [
      { from: "agent-a", to: "agent-b", relation: "reviews", weight: 10 },
      { from: "agent-b", to: "agent-a", relation: "reviews", weight: 10 },
      { from: "agent-a", to: "agent-b", relation: "collaborates", weight: 5 },
      { from: "agent-b", to: "agent-a", relation: "collaborates", weight: 5 },
    ];
    return { agents, edges, description: "Peer Review: AgentA ↔ AgentB (mutual)" };
  }

  /**
   * Apply a template to an existing graph.
   */
  static apply(graph: AgentGraph, template: TemplateResult): void {
    for (const agent of template.agents) {
      if (!graph.hasAgent(agent.id)) {
        graph.addAgent(agent);
      }
    }
    for (const edge of template.edges) {
      graph.addEdge(edge);
    }
  }
}

export interface TemplateResult {
  agents: AgentProfile[];
  edges: GraphEdge[];
  description: string;
}

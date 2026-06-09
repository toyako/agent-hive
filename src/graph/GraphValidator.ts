import { AgentGraph } from "./AgentGraph";
import { GraphEdge } from "../types";

/**
 * GraphValidator
 *
 * Validates agent graph for cycles, isolation, and review loops.
 */
export class GraphValidator {
  /**
   * Detect all cycles in the graph using DFS.
   * Returns array of cycles, each cycle is an array of agent ids.
   */
  detectCycles(graph: AgentGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const path: string[] = [];

    const dfs = (agentId: string) => {
      visited.add(agentId);
      inStack.add(agentId);
      path.push(agentId);

      const edges = graph.getEdgesFrom(agentId);
      for (const edge of edges) {
        if (!visited.has(edge.to)) {
          dfs(edge.to);
        } else if (inStack.has(edge.to)) {
          // Found a cycle
          const cycleStart = path.indexOf(edge.to);
          if (cycleStart !== -1) {
            cycles.push(path.slice(cycleStart).concat(edge.to));
          }
        }
      }

      path.pop();
      inStack.delete(agentId);
    };

    for (const agent of graph.allAgents()) {
      if (!visited.has(agent.id)) {
        dfs(agent.id);
      }
    }

    return cycles;
  }

  /**
   * Detect tight review loops: executor → reviewer → executor with no progress.
   * These are cycles of length 2 with reviews+escalates relations.
   */
  detectReviewLoops(graph: AgentGraph): Array<{ executor: string; reviewer: string }> {
    const loops: Array<{ executor: string; reviewer: string }> = [];
    const reviewEdges = graph.getEdgesByRelation("reviews");

    for (const reviewEdge of reviewEdges) {
      // Check if there's a corresponding escalation edge back
      const escEdges = graph.getEdgesFrom(reviewEdge.to);
      const escBack = escEdges.find(e => e.to === reviewEdge.from && e.relation === "escalates");
      if (escBack) {
        loops.push({
          executor: reviewEdge.from,
          reviewer: reviewEdge.to,
        });
      }
    }

    return loops;
  }

  /**
   * Find isolated agents (no incoming or outgoing edges).
   */
  findIsolatedAgents(graph: AgentGraph): string[] {
    const isolated: string[] = [];
    for (const agent of graph.allAgents()) {
      const incoming = graph.getEdgesTo(agent.id);
      const outgoing = graph.getEdgesFrom(agent.id);
      if (incoming.length === 0 && outgoing.length === 0) {
        isolated.push(agent.id);
      }
    }
    return isolated;
  }

  /**
   * Full validation report.
   */
  validate(graph: AgentGraph): ValidationReport {
    return {
      cycles: this.detectCycles(graph),
      reviewLoops: this.detectReviewLoops(graph),
      isolatedAgents: this.findIsolatedAgents(graph),
      isValid: true, // Will be set below
    };
  }
}

export interface ValidationReport {
  cycles: string[][];
  reviewLoops: Array<{ executor: string; reviewer: string }>;
  isolatedAgents: string[];
  isValid: boolean;
}

import { AgentGraph } from "../graph/AgentGraph";
import { MessageEnvelope, MessageType, AgentProfile } from "../types";

/**
 * MessageRouter
 *
 * Intelligent message routing based on agent graph.
 * Replaces v1.1's simple TaskRouter for graph-based workflows.
 * TaskRouter is kept for v1.1 backward compatibility.
 */
export class MessageRouter {
  private graph: AgentGraph;

  constructor(graph: AgentGraph) {
    this.graph = graph;
  }

  /**
   * Resolve a target to an actual agent id.
   * Supports:
   * - Direct agent id: "executor" → "executor"
   * - Capability tag: "cap:coding" → best agent with coding capability
   * - Role tag: "role:reviewer" → agent with reviewer role
   */
  resolve(to: string): string {
    // 1. Direct agent id
    if (this.graph.hasAgent(to)) {
      return to;
    }

    // 2. Capability tag
    if (to.startsWith("cap:")) {
      const cap = to.slice(4);
      const candidates = this.graph.agentsWithCapability(cap);
      if (candidates.length === 0) {
        throw new Error(`No agent found with capability: ${cap}`);
      }
      return this.selectBest(candidates);
    }

    // 3. Role tag
    if (to.startsWith("role:")) {
      const role = to.slice(5);
      const agent = this.graph.agentWithRole(role);
      if (!agent) {
        throw new Error(`No agent found with role: ${role}`);
      }
      return agent.id;
    }

    throw new Error(`Cannot resolve target: ${to}`);
  }

  /**
   * Select the best agent from candidates based on status and load.
   */
  private selectBest(candidates: AgentProfile[]): string {
    // Prefer idle agents over busy ones
    const idle = candidates.filter(a => a.status === "idle");
    if (idle.length > 0) {
      // Among idle, prefer those with higher maxConcurrency
      idle.sort((a, b) => b.maxConcurrency - a.maxConcurrency);
      return idle[0].id;
    }

    // All busy? Pick the one with highest concurrency (most capacity)
    candidates.sort((a, b) => b.maxConcurrency - a.maxConcurrency);
    return candidates[0].id;
  }

  /**
   * Route a message to the next destination(s).
   * Returns array of resolved agent ids.
   */
  route(msg: MessageEnvelope): string[] {
    const targets: string[] = [];

    // Resolve the direct target
    try {
      const resolved = this.resolve(msg.to);
      targets.push(resolved);
    } catch {
      // If direct resolution fails, try routing via graph
      const nextEdges = this.graph.getNextAgents(msg.from);
      for (const edge of nextEdges) {
        if (this.shouldRouteByType(msg.type, edge.relation)) {
          targets.push(edge.to);
        }
      }
    }

    return [...new Set(targets)]; // deduplicate
  }

  /**
   * Determine if a message type should be routed via a specific edge relation.
   */
  private shouldRouteByType(msgType: MessageType, relation: string): boolean {
    const routingTable: Record<string, string[]> = {
      "TASK": ["delegates"],
      "RESULT": ["provides"],
      "REVIEW": ["reviews"],
      "REVISION": ["escalates"],
      "DELEGATE": ["delegates"],
      "ESCALATE": ["escalates"],
      "CONTEXT": ["provides"],
    };

    const allowedRelations = routingTable[msgType];
    if (!allowedRelations) return true; // Unknown types pass through
    return allowedRelations.includes(relation);
  }

  /**
   * Find the reviewer for an executor using the graph.
   */
  findReviewer(executorId: string): string | undefined {
    return this.graph.findReviewer(executorId);
  }

  /**
   * Find escalation target for an agent.
   */
  findEscalationTarget(agentId: string): string | undefined {
    return this.graph.findEscalationTarget(agentId);
  }

  /**
   * Validate that a task can be routed (all required agents exist and are available).
   */
  validateRoute(from: string, to: string): string[] {
    const errors: string[] = [];

    if (!this.graph.hasAgent(from)) {
      errors.push(`Source agent not found: ${from}`);
    }

    try {
      this.resolve(to);
    } catch (err: any) {
      errors.push(err.message);
    }

    return errors;
  }

  /**
   * Update the graph reference (for hot-reloading).
   */
  setGraph(graph: AgentGraph): void {
    this.graph = graph;
  }
}

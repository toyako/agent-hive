import { Broker } from "../broker/Broker";
import {
  AgentProfile,
  GraphEdge,
  Task,
  MessageEnvelope,
  RevisionRecord,
} from "../types";

/**
 * HiveAPI
 *
 * Thin programming interface over the Broker, designed for use by
 * Web UIs, scripts, and external integrations. All methods are
 * synchronous reads (except constructor) — no side effects.
 */
export class HiveAPI {
  private broker: Broker;

  constructor(broker: Broker) {
    this.broker = broker;
  }

  // ─── Agent queries ──────────────────────────────────

  /** List all agent profiles in the graph. */
  getAgents(): AgentProfile[] {
    return this.broker.graph.allAgents();
  }

  /** Get a single agent profile by id. */
  getAgent(id: string): AgentProfile | undefined {
    return this.broker.graph.getAgent(id);
  }

  // ─── Graph queries ──────────────────────────────────

  /** Get the full graph data (agents + edges). */
  getGraph(): { agents: AgentProfile[]; edges: GraphEdge[] } {
    return {
      agents: this.broker.graph.allAgents(),
      edges: this.broker.graph.allEdges(),
    };
  }

  /** Render an ASCII art topology view of the graph. */
  getTopology(): string {
    const agents = this.broker.graph.allAgents();
    const edges = this.broker.graph.allEdges();

    if (agents.length === 0) return "(empty graph)";

    const lines: string[] = ["Agent Hive Topology:", ""];

    // Build adjacency for display
    const byRelation: Record<string, GraphEdge[]> = {};
    for (const e of edges) {
      const key = `${e.from} → ${e.to}`;
      if (!byRelation[key]) byRelation[key] = [];
      byRelation[key].push(e);
    }

    // Agent list
    lines.push("  Agents:");
    for (const a of agents) {
      lines.push(`    [${a.status}] ${a.id} (${a.role})`);
    }
    lines.push("");

    // Edge list with ASCII art
    lines.push("  Edges:");
    for (const e of edges) {
      const arrow = e.relation === "reviews" ? "──(reviews)──▶" :
                    e.relation === "escalates" ? "──(escalates)─▶" :
                    e.relation === "delegates" ? "──(delegates)─▶" :
                    `──(${e.relation})──▶`;
      lines.push(`    ${e.from} ${arrow} ${e.to}  [w=${e.weight}]`);
    }

    return lines.join("\n");
  }

  // ─── Task queries ───────────────────────────────────

  /** List all tasks in the queue. */
  getTasks(): Task[] {
    return this.broker.queue.all();
  }

  /** Get a single task by id. */
  getTask(taskId: string): Task | undefined {
    return this.broker.queue.get(taskId) || undefined;
  }

  /** Get revision history for a task. */
  getTaskHistory(taskId: string): RevisionRecord[] {
    return this.broker.history.get(taskId);
  }

  // ─── Message queries ────────────────────────────────

  /** Get the v2.0 message envelope log for a task. */
  getMessageLog(taskId: string): MessageEnvelope[] {
    return this.broker.bus.envelopeHistory(taskId);
  }

  // ─── Health / Monitoring ────────────────────────────

  /** Get a health summary of all agents, circuit breakers, and active conversations. */
  getHealth(): {
    agents: { id: string; healthy: boolean; status: string }[];
    circuitBreakers: { id: string; state: string }[];
    activeConversations: number;
  } {
    // Agents from registry
    const entries = this.broker.registry.all();
    const agents = entries.map((e) => ({
      id: e.name,
      healthy: e.healthy,
      status: e.installed ? (e.healthy ? "healthy" : "unhealthy") : "not-installed",
    }));

    // Graph agents not in registry
    const graphAgents = this.broker.graph.allAgents();
    for (const ga of graphAgents) {
      if (!agents.find((a) => a.id === ga.id)) {
        agents.push({
          id: ga.id,
          healthy: ga.status !== "offline",
          status: ga.status,
        });
      }
    }

    // Circuit breakers
    const safetyStatus = this.broker.getSafetyStatus();
    const cbStates = safetyStatus.circuitBreaker;
    const circuitBreakers = Array.isArray(cbStates) ? cbStates.map((cb: any) => ({
      id: cb.agentId,
      state: cb.state,
    })) : [];

    // Active conversations
    const activeConversations = this.broker.getConversations().active().length;

    return { agents, circuitBreakers, activeConversations };
  }
}

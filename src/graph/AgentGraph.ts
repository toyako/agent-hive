import { AgentProfile, AgentGraphData, GraphEdge, EdgeRelation } from "../types";
import * as fs from "fs";
import * as path from "path";

const GRAPH_FILE = path.resolve(process.cwd(), ".agent-hive/graph.json");

/**
 * AgentGraph
 *
 * Directed capability graph for agent relationships.
 * Replaces v1.1's simple reportsTo tree.
 */
export class AgentGraph {
  private agents: Map<string, AgentProfile> = new Map();
  private edges: GraphEdge[] = [];
  private graphFile: string;

  constructor(baseDir?: string) {
    this.graphFile = baseDir ? path.join(baseDir, "graph.json") : GRAPH_FILE;
    this.loadPersisted();
  }

  // ─── Agent Management ─────────────────────────────

  addAgent(profile: AgentProfile): void {
    this.agents.set(profile.id, profile);
    this.persist();
  }

  removeAgent(id: string): boolean {
    const deleted = this.agents.delete(id);
    if (deleted) {
      this.edges = this.edges.filter(e => e.from !== id && e.to !== id);
      this.persist();
    }
    return deleted;
  }

  getAgent(id: string): AgentProfile | undefined {
    return this.agents.get(id);
  }

  allAgents(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  hasAgent(id: string): boolean {
    return this.agents.has(id);
  }

  agentsWithCapability(capability: string): AgentProfile[] {
    return this.allAgents().filter(a => {
      // We'd need to look up runtime capabilities
      // For now, use agent role as proxy
      return a.role === capability || a.id.includes(capability);
    });
  }

  agentWithRole(role: string): AgentProfile | undefined {
    return this.allAgents().find(a => a.role === role);
  }

  // ─── Edge Management ──────────────────────────────

  addEdge(edge: GraphEdge): void {
    // Validate agents exist
    if (!this.agents.has(edge.from)) {
      throw new Error(`Agent not found: ${edge.from}`);
    }
    if (!this.agents.has(edge.to)) {
      throw new Error(`Agent not found: ${edge.to}`);
    }
    // Prevent exact duplicates
    const exists = this.edges.some(
      e => e.from === edge.from && e.to === edge.to && e.relation === edge.relation
    );
    if (!exists) {
      this.edges.push(edge);
      this.persist();
    }
  }

  removeEdge(from: string, to: string, relation?: EdgeRelation): boolean {
    const before = this.edges.length;
    this.edges = this.edges.filter(
      e => !(e.from === from && e.to === to && (!relation || e.relation === relation))
    );
    if (this.edges.length < before) {
      this.persist();
      return true;
    }
    return false;
  }

  getEdgesFrom(agentId: string): GraphEdge[] {
    return this.edges.filter(e => e.from === agentId);
  }

  getEdgesTo(agentId: string): GraphEdge[] {
    return this.edges.filter(e => e.to === agentId);
  }

  getEdgesByRelation(relation: EdgeRelation): GraphEdge[] {
    return this.edges.filter(e => e.relation === relation);
  }

  allEdges(): GraphEdge[] {
    return [...this.edges];
  }

  // ─── Routing Queries ──────────────────────────────

  /**
   * Find the next agent(s) for a given agent based on relation.
   * Returns sorted by weight (highest first).
   */
  getNextAgents(fromAgent: string, relation?: EdgeRelation): GraphEdge[] {
    let edges = this.getEdgesFrom(fromAgent);
    if (relation) {
      edges = edges.filter(e => e.relation === relation);
    }
    return edges.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Find the reviewer for an executor agent.
   */
  findReviewer(executorId: string): string | undefined {
    const reviewEdges = this.edges.filter(
      e => e.from === executorId && e.relation === "reviews"
    );
    if (reviewEdges.length > 0) {
      // Sort by weight, return highest
      reviewEdges.sort((a, b) => b.weight - a.weight);
      return reviewEdges[0].to;
    }
    // Fallback: find any agent with reviewer role
    const reviewer = this.agentWithRole("reviewer");
    return reviewer?.id;
  }

  /**
   * Find escalation target for an agent.
   */
  findEscalationTarget(agentId: string): string | undefined {
    const escEdges = this.edges.filter(
      e => e.from === agentId && e.relation === "escalates"
    );
    if (escEdges.length > 0) {
      escEdges.sort((a, b) => b.weight - a.weight);
      return escEdges[0].to;
    }
    return undefined;
  }

  /**
   * Find a path between two agents (BFS).
   */
  findPath(from: string, to: string, maxDepth: number = 5): string[] | null {
    if (from === to) return [from];

    const visited = new Set<string>();
    const queue: { node: string; path: string[] }[] = [{ node: from, path: [from] }];

    while (queue.length > 0) {
      const { node, path: currentPath } = queue.shift()!;
      if (currentPath.length > maxDepth) continue;

      visited.add(node);
      const nextEdges = this.getEdgesFrom(node);

      for (const edge of nextEdges) {
        if (edge.to === to) {
          return [...currentPath, to];
        }
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({ node: edge.to, path: [...currentPath, edge.to] });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Convert v1.1 reportsTo links to graph edges.
   */
  migrateFromV1(reportsToMap: Map<string, string>): void {
    for (const [from, to] of reportsToMap) {
      // Ensure both agents exist
      if (!this.agents.has(from)) {
        this.addAgent({
          id: from,
          runtimeId: from,
          role: "executor",
          maxConcurrency: 1,
          status: "idle",
        });
      }
      if (!this.agents.has(to)) {
        this.addAgent({
          id: to,
          runtimeId: to,
          role: "reviewer",
          maxConcurrency: 1,
          status: "idle",
        });
      }

      // Add review edge (reviews relation: reviewer reviews executor's work)
      // In v1.1, executor reportsTo reviewer
      // In v2.0, executor → reviewer (reviews relation)
      this.addEdge({
        from,
        to,
        relation: "reviews",
        weight: 10,
      });
      // Add escalation edge (reviewer can escalate back to executor)
      this.addEdge({
        from: to,
        to: from,
        relation: "escalates",
        weight: 5,
      });
    }
  }

  // ─── Persistence ──────────────────────────────────

  private persist(): void {
    const data: AgentGraphData = {
      agents: {},
      edges: this.edges,
    };
    for (const [k, v] of this.agents) {
      data.agents[k] = v;
    }
    fs.mkdirSync(path.dirname(this.graphFile), { recursive: true });
    fs.writeFileSync(this.graphFile, JSON.stringify(data, null, 2));
  }

  private loadPersisted(): void {
    if (!fs.existsSync(this.graphFile)) return;
    try {
      const data: AgentGraphData = JSON.parse(fs.readFileSync(this.graphFile, "utf-8"));
      for (const [k, v] of Object.entries(data.agents)) {
        this.agents.set(k, v);
      }
      this.edges = data.edges || [];
    } catch {
      // Corrupted file, start fresh
    }
  }

  // ─── Serialization ────────────────────────────────

  toJSON(): AgentGraphData {
    const agents: Record<string, AgentProfile> = {};
    for (const [k, v] of this.agents) agents[k] = v;
    return { agents, edges: [...this.edges] };
  }

  toString(): string {
    const lines: string[] = ["Agent Graph:"];
    for (const agent of this.allAgents()) {
      lines.push(`  ${agent.id} [${agent.role}] (runtime: ${agent.runtimeId})`);
    }
    lines.push("Edges:");
    for (const edge of this.edges) {
      lines.push(`  ${edge.from} --(${edge.relation})--> ${edge.to} (weight: ${edge.weight})`);
    }
    return lines.join("\n");
  }
}

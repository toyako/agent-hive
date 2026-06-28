/**
 * Graph Runtime Engine — 核心执行引擎
 * 
 * 职责：
 * - 执行 DAG
 * - 支持 parallel / sequential
 * - 管理 execution state
 */

// Graph Node
export interface GraphNode {
  id: string;
  agent: string;
  task: string;
  status: "pending" | "ready" | "running" | "completed" | "failed";
  result?: any;
}

// Graph Edge
export interface GraphEdge {
  from: string;
  to: string;
}

// Execution Graph
export interface ExecutionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Execution State
export class ExecutionState {
  private graph: ExecutionGraph;
  private context: Map<string, any> = new Map();
  private completed: Set<string> = new Set();

  constructor(graph: ExecutionGraph) {
    this.graph = graph;
  }

  /**
   * 获取就绪节点
   */
  getReadyNodes(): GraphNode[] {
    return this.graph.nodes.filter(node => {
      if (node.status !== "pending") return false;

      // 检查所有依赖是否完成
      const dependencies = this.graph.edges
        .filter(e => e.to === node.id)
        .map(e => e.from);

      return dependencies.every(dep => this.completed.has(dep));
    });
  }

  /**
   * 标记节点完成
   */
  markCompleted(nodeId: string, result: any): void {
    this.completed.add(nodeId);
    this.context.set(nodeId, result);

    const node = this.graph.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = "completed";
      node.result = result;
    }
  }

  /**
   * 标记节点失败
   */
  markFailed(nodeId: string, error: string): void {
    const node = this.graph.nodes.find(n => n.id === nodeId);
    if (node) {
      node.status = "failed";
      node.result = { error };
    }
  }

  /**
   * 是否完成
   */
  isComplete(): boolean {
    return this.graph.nodes.every(n => 
      n.status === "completed" || n.status === "failed"
    );
  }

  /**
   * 获取上下文
   */
  getContext(): Map<string, any> {
    return new Map(this.context);
  }

  /**
   * 获取节点上下文（上游结果）
   */
  getNodeContext(nodeId: string): any[] {
    const dependencies = this.graph.edges
      .filter(e => e.to === nodeId)
      .map(e => e.from);

    return dependencies.map(dep => this.context.get(dep)).filter(Boolean);
  }

  /**
   * 最终化
   */
  finalize(): any {
    const results: any = {};
    for (const [key, value] of this.context) {
      results[key] = value;
    }
    return results;
  }
}

export class GraphRuntimeEngine {
  /**
   * 执行图
   */
  async execute(
    graph: ExecutionGraph,
    executor: (node: GraphNode, context: any[]) => Promise<any>
  ): Promise<any> {
    const state = new ExecutionState(graph);

    while (!state.isComplete()) {
      const readyNodes = state.getReadyNodes();

      if (readyNodes.length === 0) {
        throw new Error("Deadlock detected: no ready nodes but not complete");
      }

      // 并行执行就绪节点
      const results = await Promise.all(
        readyNodes.map(async node => {
          node.status = "running";
          const context = state.getNodeContext(node.id);
          
          try {
            const result = await executor(node, context);
            state.markCompleted(node.id, result);
            return { nodeId: node.id, result };
          } catch (error) {
            state.markFailed(node.id, String(error));
            return { nodeId: node.id, error: String(error) };
          }
        })
      );
    }

    return state.finalize();
  }

  /**
   * 验证图
   */
  validate(graph: ExecutionGraph): { valid: boolean; error?: string } {
    // 检查是否有环
    if (this.hasCycle(graph)) {
      return { valid: false, error: "Graph has cycle" };
    }

    // 检查节点是否存在
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.from)) {
        return { valid: false, error: `Node not found: ${edge.from}` };
      }
      if (!nodeIds.has(edge.to)) {
        return { valid: false, error: `Node not found: ${edge.to}` };
      }
    }

    return { valid: true };
  }

  /**
   * 检测环
   */
  private hasCycle(graph: ExecutionGraph): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.edges
        .filter(e => e.from === nodeId)
        .map(e => e.to);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }
}

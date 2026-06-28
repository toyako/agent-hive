/**
 * Shadow Contract Layer — v2.1
 * 
 * 唯一语义对齐点
 * 
 * 职责：
 * - Plan normalization
 * - DAG canonicalization
 * - Deterministic hashing
 * - Execution contract generation
 */

import * as crypto from "crypto";

// Plan 结构
export interface Plan {
  planId: string;
  steps: Step[];
  dependencies: Edge[];
  metadata?: Record<string, any>;
}

// Step 结构
export interface Step {
  stepId: string;
  goal: string;
  requiredSkills: string[];
  timeout?: number;
  payload?: any;
}

// Edge 结构
export interface Edge {
  from: string;
  to: string;
}

// Normalized Plan
export interface NormalizedPlan {
  planId: string;
  steps: Step[];
  dependencies: Edge[];
}

// DAG
export interface DAG {
  nodes: string[];
  edges: Edge[];
  hash: string;
}

// Execution Contract
export interface ExecutionContract {
  contractId: string;
  normalizedPlan: NormalizedPlan;
  executionGraph: DAG;
  deterministicHash: string;
  metadata: {
    createdAt: number;
    plannerVersion: string;
    arbitrationScore: number;
  };
}

export class ShadowContractLayer {
  /**
   * 规范化 Plan
   * 
   * R1: Step Ordering Canonicalization
   * R2: Dependency Normalization
   * R3: Metadata stripping
   */
  normalizePlan(plan: Plan): NormalizedPlan {
    // R1: 按 stepId 排序
    const sortedSteps = [...plan.steps].sort((a, b) => 
      a.stepId.localeCompare(b.stepId)
    );

    // R2: 去重 + 确保无环
    const uniqueEdges = this.removeDuplicateEdges(plan.dependencies);
    const acyclicEdges = this.ensureAcyclic(uniqueEdges, sortedSteps);

    // R3: 去除非确定性字段
    const cleanSteps = sortedSteps.map(step => ({
      stepId: step.stepId,
      goal: step.goal,
      requiredSkills: [...step.requiredSkills].sort(),
      timeout: step.timeout,
      // 不包含 payload 中的非确定性字段
    }));

    return {
      planId: plan.planId,
      steps: cleanSteps,
      dependencies: acyclicEdges
    };
  }

  /**
   * DAG 规范化
   * 
   * 确保：
   * - deterministic topological ordering
   * - stable node hashing
   * - repeatable graph generation
   */
  canonicalizeDAG(normalizedPlan: NormalizedPlan): DAG {
    // 拓扑排序
    const sortedNodes = this.topologicalSort(
      normalizedPlan.steps.map(s => s.stepId),
      normalizedPlan.dependencies
    );

    // 规范化边
    const normalizedEdges = this.normalizeEdges(normalizedPlan.dependencies);

    // 计算图哈希
    const hash = this.hashGraph(sortedNodes, normalizedEdges);

    return {
      nodes: sortedNodes,
      edges: normalizedEdges,
      hash
    };
  }

  /**
   * 生成 Execution Contract
   */
  generateExecutionContract(
    plan: Plan,
    decisionId: string,
    policyVersion: string,
    arbitrationScore: number
  ): ExecutionContract {
    const normalized = this.normalizePlan(plan);
    const dag = this.canonicalizeDAG(normalized);

    // 确定性哈希
    const deterministicHash = this.computeDeterministicHash(
      normalized,
      dag,
      policyVersion
    );

    return {
      contractId: this.sha256(dag.hash + decisionId),
      normalizedPlan: normalized,
      executionGraph: dag,
      deterministicHash,
      metadata: {
        createdAt: Date.now(),
        plannerVersion: "v2.1",
        arbitrationScore
      }
    };
  }

  /**
   * 验证 Contract 一致性
   */
  verifyContract(contract: ExecutionContract): boolean {
    // 重新计算 DAG
    const recomputedDag = this.canonicalizeDAG(contract.normalizedPlan);

    // 验证哈希一致性
    if (recomputedDag.hash !== contract.executionGraph.hash) {
      return false;
    }

    // 重新计算确定性哈希
    const recomputedHash = this.computeDeterministicHash(
      contract.normalizedPlan,
      contract.executionGraph,
      "v2.1"
    );

    return recomputedHash === contract.deterministicHash;
  }

  // ═══════════════════════════════════════════════════════════════
  // 私有方法
  // ═══════════════════════════════════════════════════════════════

  /**
   * 去重边
   */
  private removeDuplicateEdges(edges: Edge[]): Edge[] {
    const seen = new Set<string>();
    return edges.filter(edge => {
      const key = `${edge.from}->${edge.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 确保无环
   */
  private ensureAcyclic(edges: Edge[], steps: Step[]): Edge[] {
    // 简单实现：检测环并移除
    const nodeSet = new Set(steps.map(s => s.stepId));
    const validEdges = edges.filter(e => 
      nodeSet.has(e.from) && nodeSet.has(e.to)
    );

    // 检测环（简化版）
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const hasCycle = new Set<string>();

    const dfs = (node: string) => {
      if (inStack.has(node)) {
        hasCycle.add(node);
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      inStack.add(node);

      const children = validEdges
        .filter(e => e.from === node)
        .map(e => e.to);

      for (const child of children) {
        dfs(child);
      }

      inStack.delete(node);
    };

    for (const step of steps) {
      dfs(step.stepId);
    }

    // 移除环中的边
    return validEdges.filter(e => 
      !hasCycle.has(e.from) || !hasCycle.has(e.to)
    );
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(nodes: string[], edges: Edge[]): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // 初始化
    for (const node of nodes) {
      inDegree.set(node, 0);
      adjacency.set(node, []);
    }

    // 计算入度
    for (const edge of edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
      adjacency.get(edge.from)?.push(edge.to);
    }

    // Kahn 算法
    const queue: string[] = [];
    for (const [node, degree] of inDegree) {
      if (degree === 0) queue.push(node);
    }

    queue.sort(); // 确保确定性

    const result: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      const children = adjacency.get(node) || [];
      children.sort(); // 确保确定性

      for (const child of children) {
        const newDegree = (inDegree.get(child) || 1) - 1;
        inDegree.set(child, newDegree);
        if (newDegree === 0) {
          queue.push(child);
          queue.sort(); // 确保确定性
        }
      }
    }

    return result;
  }

  /**
   * 规范化边
   */
  private normalizeEdges(edges: Edge[]): Edge[] {
    return [...edges]
      .sort((a, b) => {
        const fromCompare = a.from.localeCompare(b.from);
        return fromCompare !== 0 ? fromCompare : a.to.localeCompare(b.to);
      });
  }

  /**
   * 计算图哈希
   */
  private hashGraph(nodes: string[], edges: Edge[]): string {
    const content = JSON.stringify({ nodes, edges });
    return this.sha256(content);
  }

  /**
   * 计算确定性哈希
   */
  private computeDeterministicHash(
    plan: NormalizedPlan,
    dag: DAG,
    policyVersion: string
  ): string {
    // 不包含 timestamps, runtime state, execution results
    const content = JSON.stringify({
      plan: {
        planId: plan.planId,
        steps: plan.steps,
        dependencies: plan.dependencies
      },
      dag: {
        nodes: dag.nodes,
        edges: dag.edges,
        hash: dag.hash
      },
      policyVersion
    });

    return this.sha256(content);
  }

  /**
   * SHA256 哈希
   */
  private sha256(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }
}

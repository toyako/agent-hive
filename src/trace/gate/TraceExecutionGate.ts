/**
 * Trace Execution Gate — v5.2
 * 
 * Every runtime step MUST pass through Execution Gate.
 * 
 * Rules:
 * 1. Step Validation - verify node exists in ETP, is next expected, input matches
 * 2. Order Enforcement - block if deviates, trigger replan/recovery
 * 3. Contract Enforcement - match input/output schema, layer attribution
 * 
 * Trace defines reality.
 * Runtime only obeys reality.
 */

import { ExecutionTracePlan, TraceNode } from "./ExecutionTracePlan";

// Gate Result
export interface GateResult {
  allowed: boolean;
  reason: string;
  deviationType?: string;
}

// Deviation Score
export interface DeviationScore {
  score: number;
  type: "ORDER_DEVIATION" | "INPUT_DEVIATION" | "OUTPUT_DEVIATION" | "LAYER_DEVIATION" | "SKIPPED_NODE" | "EXTRA_NODE";
  details: string;
}

export class TraceExecutionGate {
  private plan: ExecutionTracePlan;
  private executedNodes: string[] = [];
  private currentIndex: number = 0;

  constructor(plan: ExecutionTracePlan) {
    this.plan = plan;
  }

  /**
   * 验证节点是否可执行
   */
  validateNode(nodeId: string, input: any): GateResult {
    // Rule 1: Step Validation
    const nodeExists = this.plan.causalGraph.nodes.find(n => n.id === nodeId);
    if (!nodeExists) {
      return {
        allowed: false,
        reason: `Node ${nodeId} not found in Execution Trace Plan`,
        deviationType: "EXTRA_NODE"
      };
    }

    // Rule 2: Order Enforcement
    if (this.plan.constraints.mustExecuteInOrder) {
      const expectedNode = this.plan.expectedNodeOrder[this.currentIndex];
      if (nodeId !== expectedNode) {
        return {
          allowed: false,
          reason: `Expected node ${expectedNode}, got ${nodeId}`,
          deviationType: "ORDER_DEVIATION"
        };
      }
    }

    // Rule 3: Contract Enforcement (simplified)
    // In real implementation, validate against expectedInput schema

    return { allowed: true, reason: "Node validated" };
  }

  /**
   * 记录节点执行
   */
  recordExecution(nodeId: string): void {
    this.executedNodes.push(nodeId);
    this.currentIndex++;
  }

  /**
   * 计算偏差分数
   */
  calculateDeviation(actualNodeId: string): DeviationScore {
    const expectedNodeId = this.plan.expectedNodeOrder[this.currentIndex];

    if (actualNodeId !== expectedNodeId) {
      return {
        score: 1.0,
        type: "ORDER_DEVIATION",
        details: `Expected ${expectedNodeId}, got ${actualNodeId}`
      };
    }

    return {
      score: 0,
      type: "ORDER_DEVIATION",
      details: "No deviation"
    };
  }

  /**
   * 验证追踪完整性
   */
  verifyIntegrity(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查缺失节点
    for (const expected of this.plan.expectedNodeOrder) {
      if (!this.executedNodes.includes(expected)) {
        issues.push(`Missing node: ${expected}`);
      }
    }

    // 检查多余节点
    for (const executed of this.executedNodes) {
      if (!this.plan.expectedNodeOrder.includes(executed)) {
        issues.push(`Extra node: ${executed}`);
      }
    }

    // 检查环
    const visited = new Set<string>();
    for (const edge of this.plan.causalGraph.edges) {
      if (visited.has(edge.to)) {
        issues.push(`Cycle detected at ${edge.to}`);
      }
      visited.add(edge.to);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * 获取状态
   */
  getStatus(): {
    totalNodes: number;
    executedNodes: number;
    remainingNodes: number;
    progress: number;
  } {
    const total = this.plan.expectedNodeOrder.length;
    const executed = this.executedNodes.length;

    return {
      totalNodes: total,
      executedNodes: executed,
      remainingNodes: total - executed,
      progress: total > 0 ? executed / total : 0
    };
  }

  /**
   * 重置
   */
  reset(): void {
    this.executedNodes = [];
    this.currentIndex = 0;
  }
}

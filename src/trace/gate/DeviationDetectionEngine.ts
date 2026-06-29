/**
 * Deviation Detection Engine — v5.2
 * 
 * 计算 deviationScore = f(planned, actual)
 * 
 * Types of deviation:
 * - ORDER_DEVIATION
 * - INPUT_DEVIATION
 * - OUTPUT_DEVIATION
 * - LAYER_DEVIATION
 * - SKIPPED_NODE
 * - EXTRA_NODE
 */

import { ExecutionTracePlan, TraceNode } from "./ExecutionTracePlan";

// Deviation Report
export interface DeviationReport {
  hasDeviation: boolean;
  score: number;
  deviations: Deviation[];
  recommendation: "CONTINUE" | "RETRY" | "REPLAN" | "ABORT";
}

// Deviation
export interface Deviation {
  type: "ORDER_DEVIATION" | "INPUT_DEVIATION" | "OUTPUT_DEVIATION" | "LAYER_DEVIATION" | "SKIPPED_NODE" | "EXTRA_NODE";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  nodeId?: string;
}

export class DeviationDetectionEngine {
  private threshold: number;

  constructor(threshold: number = 0.5) {
    this.threshold = threshold;
  }

  /**
   * 检测偏差
   */
  detect(
    plan: ExecutionTracePlan,
    actualExecution: { nodeId: string; input: any; output: any; layer: string }[]
  ): DeviationReport {
    const deviations: Deviation[] = [];

    // 检查顺序偏差
    const orderDeviations = this.checkOrderDeviation(plan, actualExecution);
    deviations.push(...orderDeviations);

    // 检查跳过的节点
    const skippedNodes = this.checkSkippedNodes(plan, actualExecution);
    deviations.push(...skippedNodes);

    // 检查多余的节点
    const extraNodes = this.checkExtraNodes(plan, actualExecution);
    deviations.push(...extraNodes);

    // 计算总分
    const score = this.calculateScore(deviations);

    // 决定建议
    const recommendation = this.makeRecommendation(score, deviations);

    return {
      hasDeviation: deviations.length > 0,
      score,
      deviations,
      recommendation
    };
  }

  /**
   * 检查顺序偏差
   */
  private checkOrderDeviation(
    plan: ExecutionTracePlan,
    actual: { nodeId: string }[]
  ): Deviation[] {
    const deviations: Deviation[] = [];
    const expectedOrder = plan.expectedNodeOrder;

    for (let i = 0; i < Math.min(expectedOrder.length, actual.length); i++) {
      if (expectedOrder[i] !== actual[i].nodeId) {
        deviations.push({
          type: "ORDER_DEVIATION",
          severity: "high",
          description: `Position ${i}: expected ${expectedOrder[i]}, got ${actual[i].nodeId}`,
          nodeId: actual[i].nodeId
        });
      }
    }

    return deviations;
  }

  /**
   * 检查跳过的节点
   */
  private checkSkippedNodes(
    plan: ExecutionTracePlan,
    actual: { nodeId: string }[]
  ): Deviation[] {
    const deviations: Deviation[] = [];
    const actualIds = new Set(actual.map(a => a.nodeId));

    for (const expected of plan.expectedNodeOrder) {
      if (!actualIds.has(expected)) {
        if (!plan.constraints.allowedDeviations.includes(expected)) {
          deviations.push({
            type: "SKIPPED_NODE",
            severity: "critical",
            description: `Required node ${expected} was skipped`,
            nodeId: expected
          });
        }
      }
    }

    return deviations;
  }

  /**
   * 检查多余的节点
   */
  private checkExtraNodes(
    plan: ExecutionTracePlan,
    actual: { nodeId: string }[]
  ): Deviation[] {
    const deviations: Deviation[] = [];
    const expectedIds = new Set(plan.expectedNodeOrder);

    for (const node of actual) {
      if (!expectedIds.has(node.nodeId)) {
        deviations.push({
          type: "EXTRA_NODE",
          severity: "medium",
          description: `Unexpected node ${node.nodeId} executed`,
          nodeId: node.nodeId
        });
      }
    }

    return deviations;
  }

  /**
   * 计算分数
   */
  private calculateScore(deviations: Deviation[]): number {
    if (deviations.length === 0) return 0;

    let score = 0;
    for (const dev of deviations) {
      switch (dev.severity) {
        case "critical": score += 1.0; break;
        case "high": score += 0.7; break;
        case "medium": score += 0.4; break;
        case "low": score += 0.1; break;
      }
    }

    return Math.min(1.0, score);
  }

  /**
   * 做出建议
   */
  private makeRecommendation(
    score: number,
    deviations: Deviation[]
  ): DeviationReport["recommendation"] {
    const hasCritical = deviations.some(d => d.severity === "critical");

    if (hasCritical) return "ABORT";
    if (score > this.threshold) return "REPLAN";
    if (score > 0) return "RETRY";
    return "CONTINUE";
  }
}

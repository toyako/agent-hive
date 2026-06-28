/**
 * EvaluationEngine — Loop Layer Phase 1
 * 
 * 输入：Observation
 * 输出：Evaluation
 * 
 * Evaluation 只负责判断，不得执行任何任务
 */

import { Observation } from "./ObservationEngine";

// Evaluation Status
export type EvaluationStatus = "SUCCESS" | "PARTIAL" | "FAILED";

// Next Action
export type NextAction = "COMPLETE" | "RETRY" | "REPLAN";

// Evaluation
export interface Evaluation {
  status: EvaluationStatus;
  reason: string;
  nextAction: NextAction;
}

export class EvaluationEngine {
  /**
   * 评估执行结果
   */
  evaluate(observation: Observation): Evaluation {
    // SUCCESS: 所有节点完成
    if (observation.success) {
      return {
        status: "SUCCESS",
        reason: "All nodes completed successfully",
        nextAction: "COMPLETE"
      };
    }

    // PARTIAL: 部分节点完成
    if (observation.metrics.successRate > 0) {
      return {
        status: "PARTIAL",
        reason: `Partial success: ${observation.completedNodes.length}/${observation.metrics.totalNodes} nodes completed`,
        nextAction: "RETRY"
      };
    }

    // FAILED: 所有节点失败
    return {
      status: "FAILED",
      reason: `All nodes failed: ${observation.failedNodes.join(", ")}`,
      nextAction: "REPLAN"
    };
  }
}

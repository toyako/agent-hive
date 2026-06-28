/**
 * PolicyEngine — Self-Healing Runtime Phase 2
 * 
 * 职责：根据 FailureType 自动决定恢复策略
 * 
 * Failure → Action:
 * - NETWORK → Retry
 * - API → Retry
 * - TIMEOUT → Retry
 * - TOOL → Retry / Switch Tool
 * - MODEL → Switch Model
 * - VALIDATION → Replan
 * - PLANNER → Replan
 * - DEPENDENCY → Rollback
 * - RESOURCE → Wait / Retry
 * - UNKNOWN → Human Review
 */

import { FailureType, FailureAnalysis } from "./FailureClassifier";

// Recovery Action
export type RecoveryAction = 
  | "RETRY"
  | "REPLAN"
  | "SWITCH_MODEL"
  | "SWITCH_TOOL"
  | "ROLLBACK"
  | "WAIT"
  | "ESCALATE"
  | "COMPLETE";

// Recovery Plan
export interface RecoveryPlan {
  action: RecoveryAction;
  reason: string;
  metadata?: Record<string, any>;
}

export class PolicyEngine {
  /**
   * 根据失败分析生成恢复计划
   */
  createRecoveryPlan(failure: FailureAnalysis, context?: any): RecoveryPlan {
    switch (failure.type) {
      case "NETWORK":
        return {
          action: "RETRY",
          reason: "Network error is transient, retry with backoff",
          metadata: { backoff: "exponential", maxAttempts: 3 }
        };

      case "API":
        return {
          action: "RETRY",
          reason: "API error may be transient, retry with backoff",
          metadata: { backoff: "exponential", maxAttempts: 3 }
        };

      case "TIMEOUT":
        return {
          action: "RETRY",
          reason: "Timeout may be transient, retry with increased timeout",
          metadata: { backoff: "exponential", maxAttempts: 2 }
        };

      case "TOOL":
        return {
          action: "SWITCH_TOOL",
          reason: "Tool failed, try alternative tool",
          metadata: { originalTool: context?.tool }
        };

      case "MODEL":
        return {
          action: "SWITCH_MODEL",
          reason: "Model failed, try alternative model",
          metadata: { originalModel: context?.model }
        };

      case "VALIDATION":
        return {
          action: "REPLAN",
          reason: "Validation failed, replan with stricter constraints",
          metadata: { validationErrors: context?.validationErrors }
        };

      case "PLANNER":
        return {
          action: "REPLAN",
          reason: "Planner failed, replan with different strategy",
          metadata: { plannerError: failure.reason }
        };

      case "DEPENDENCY":
        return {
          action: "ROLLBACK",
          reason: "Dependency failed, rollback to last stable state",
          metadata: { dependency: context?.dependency }
        };

      case "RESOURCE":
        return {
          action: "WAIT",
          reason: "Resource exhausted, wait and retry",
          metadata: { waitTime: 5000 }
        };

      case "UNKNOWN":
      default:
        return {
          action: "ESCALATE",
          reason: "Unknown failure, escalate to human review",
          metadata: { failure: failure }
        };
    }
  }
}

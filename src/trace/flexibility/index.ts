/**
 * Execution Flexibility Layer — v5.3
 * 
 * Bounded adaptation over strict trace execution
 * 
 * System Principle:
 * Trace defines structure.
 * Flexibility defines realism.
 * Runtime obeys both under constraints.
 * 
 * Hard constraints are immutable.
 * Soft constraints are adaptive.
 */

export {
  ConstraintType,
  DeviationType,
  FlexibilityRule,
  ExecutionDeviation,
  FlexibleTraceNode,
  FlexibleExecutionTracePlan,
  ExecutionFlexibilityEngine
} from "./ExecutionFlexibilityEngine";

export { FlexibleExecutionGate } from "./FlexibleExecutionGate";
export { AdaptiveRuntime } from "./AdaptiveRuntime";

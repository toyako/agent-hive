/**
 * Flexible Execution Gate — v5.3
 * 
 * v5.2 + v5.3 hybrid
 * 
 * Main execution guard
 * Handle failure with flexibility
 */

import { ExecutionFlexibilityEngine, ExecutionDeviation } from "./ExecutionFlexibilityEngine";

export class FlexibleExecutionGate {
  constructor(private engine: ExecutionFlexibilityEngine) {}

  /**
   * Main execution guard
   */
  beforeNodeExecution(nodeId: string, deviation?: ExecutionDeviation): boolean {
    // no deviation → always allow if trace valid
    if (!deviation) return true;

    return this.engine.applyDeviation(nodeId, deviation);
  }

  /**
   * Handle failure with flexibility
   */
  handleFailure(nodeId: string, error: any): {
    action: "RETRY" | "FALLBACK" | "REPLAN" | "ABORT";
    targetNode?: string;
  } {
    const fallback = this.engine.resolveFallback(nodeId);

    if (fallback) {
      return {
        action: "FALLBACK",
        targetNode: fallback
      };
    }

    if (this.engine.shouldReplan()) {
      return {
        action: "REPLAN"
      };
    }

    return {
      action: "RETRY"
    };
  }
}

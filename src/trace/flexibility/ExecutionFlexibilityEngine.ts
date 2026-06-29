/**
 * Execution Flexibility Engine — v5.3
 * 
 * Bounded adaptation over strict trace execution
 */

export type ConstraintType = "HARD" | "SOFT";
export type DeviationType = "TIME_SHIFT" | "NODE_REORDER" | "NODE_SUBSTITUTION" | "RESOURCE_SWITCH" | "PARTIAL_SKIP";

export interface FlexibilityRule {
  nodeId: string;
  type: ConstraintType;
  allowedDeviation: DeviationType[];
  maxDeviationScore: number;
  requiresApproval: boolean;
}

export interface ExecutionDeviation {
  type: DeviationType;
  severity: number;
  reason: string;
  approved: boolean;
}

export interface FlexibleTraceNode {
  id: string;
  name: string;
  hardConstraints: string[];
  softConstraints: string[];
  expectedInputs: any;
  expectedOutputs: any;
  fallbackNodes?: string[];
}

export interface FlexibleExecutionTracePlan {
  executionId: string;
  nodes: FlexibleTraceNode[];
  rules: FlexibilityRule[];
  allowDynamicReplanning: boolean;
  maxDeviationBudget: number;
}

export class ExecutionFlexibilityEngine {
  private deviationBudgetUsed = 0;
  private plan: FlexibleExecutionTracePlan;

  constructor(plan: FlexibleExecutionTracePlan) {
    this.plan = plan;
  }

  validateDeviation(nodeId: string, deviation: ExecutionDeviation): boolean {
    const node = this.plan.nodes.find(n => n.id === nodeId);
    if (!node) return false;

    const rule = this.plan.rules.find(r => r.nodeId === nodeId);
    if (!rule) return false;

    if (rule.type === "HARD") return false;

    if (rule.type === "SOFT") {
      const withinAllowed = rule.allowedDeviation.includes(deviation.type);
      const withinBudget = this.deviationBudgetUsed + deviation.severity <= rule.maxDeviationScore;
      return withinAllowed && withinBudget;
    }

    return false;
  }

  applyDeviation(nodeId: string, deviation: ExecutionDeviation): boolean {
    if (!this.validateDeviation(nodeId, deviation)) {
      throw new Error(`[EFL] Deviation rejected for node ${nodeId}`);
    }
    this.deviationBudgetUsed += deviation.severity;
    return true;
  }

  resolveFallback(nodeId: string): string | null {
    const node = this.plan.nodes.find(n => n.id === nodeId);
    return node?.fallbackNodes?.[0] || null;
  }

  shouldReplan(): boolean {
    return this.deviationBudgetUsed > this.plan.maxDeviationBudget;
  }

  getBudgetStatus(): { used: number; max: number; remaining: number } {
    return {
      used: this.deviationBudgetUsed,
      max: this.plan.maxDeviationBudget,
      remaining: this.plan.maxDeviationBudget - this.deviationBudgetUsed
    };
  }

  reset(): void {
    this.deviationBudgetUsed = 0;
  }
}

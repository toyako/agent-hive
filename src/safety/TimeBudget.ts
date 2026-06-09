import { TaskTimeBudget } from "../types";

/**
 * TimeBudget
 *
 * Enforces time limits at multiple levels:
 * - Total task time
 * - Per-agent invocation time
 * - Per-review-cycle time
 */
export class TimeBudget {
  private budgets: Map<string, BudgetTracker> = new Map();

  /**
   * Create a time budget for a task.
   */
  create(taskId: string, budget: TaskTimeBudget): void {
    this.budgets.set(taskId, {
      taskId,
      budget,
      startTime: Date.now(),
      agentStartTime: 0,
      reviewCycleStartTime: 0,
      agentInvocations: 0,
    });
  }

  /**
   * Start tracking an agent invocation.
   */
  startAgentInvocation(taskId: string): void {
    const tracker = this.budgets.get(taskId);
    if (tracker) {
      tracker.agentStartTime = Date.now();
      tracker.agentInvocations++;
    }
  }

  /**
   * Start tracking a review cycle.
   */
  startReviewCycle(taskId: string): void {
    const tracker = this.budgets.get(taskId);
    if (tracker) {
      tracker.reviewCycleStartTime = Date.now();
    }
  }

  /**
   * Check if total task budget is exceeded.
   */
  isTotalExceeded(taskId: string): boolean {
    const tracker = this.budgets.get(taskId);
    if (!tracker) return false;
    return Date.now() - tracker.startTime >= tracker.budget.totalMs;
  }

  /**
   * Check if per-agent budget is exceeded.
   */
  isAgentExceeded(taskId: string): boolean {
    const tracker = this.budgets.get(taskId);
    if (!tracker || tracker.agentStartTime === 0) return false;
    return Date.now() - tracker.agentStartTime >= tracker.budget.perAgentMs;
  }

  /**
   * Check if review cycle budget is exceeded.
   */
  isReviewCycleExceeded(taskId: string): boolean {
    const tracker = this.budgets.get(taskId);
    if (!tracker || tracker.reviewCycleStartTime === 0) return false;
    return Date.now() - tracker.reviewCycleStartTime >= tracker.budget.reviewCycleMs;
  }

  /**
   * Check all budgets at once.
   */
  checkAll(taskId: string): BudgetCheckResult {
    return {
      taskId,
      totalExceeded: this.isTotalExceeded(taskId),
      agentExceeded: this.isAgentExceeded(taskId),
      reviewCycleExceeded: this.isReviewCycleExceeded(taskId),
      anyExceeded: this.isTotalExceeded(taskId) || this.isAgentExceeded(taskId) || this.isReviewCycleExceeded(taskId),
    };
  }

  /**
   * Get remaining time for total budget.
   */
  remainingTotal(taskId: string): number {
    const tracker = this.budgets.get(taskId);
    if (!tracker) return Infinity;
    const elapsed = Date.now() - tracker.startTime;
    return Math.max(0, tracker.budget.totalMs - elapsed);
  }

  /**
   * Get tracker info for a task.
   */
  getTracker(taskId: string): BudgetTracker | undefined {
    return this.budgets.get(taskId);
  }

  /**
   * Remove budget tracking for a task.
   */
  remove(taskId: string): void {
    this.budgets.delete(taskId);
  }
}

interface BudgetTracker {
  taskId: string;
  budget: TaskTimeBudget;
  startTime: number;
  agentStartTime: number;
  reviewCycleStartTime: number;
  agentInvocations: number;
}

export interface BudgetCheckResult {
  taskId: string;
  totalExceeded: boolean;
  agentExceeded: boolean;
  reviewCycleExceeded: boolean;
  anyExceeded: boolean;
}

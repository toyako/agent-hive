/**
 * LoopMemory — Self-Healing Runtime Phase 2
 * 
 * 保存：
 * - iteration
 * - failureAnalysis
 * - evaluation
 * - recoveryPlan
 * - plannerFeedback
 * - runtimeHints
 * 
 * 下一轮 Planner 必须收到 Previous Iteration Summary
 * Loop 必须具备学习能力
 */

import { FailureAnalysis } from "./FailureClassifier";
import { RecoveryPlan } from "./PolicyEngine";

// Memory Entry
export interface MemoryEntry {
  iteration: number;
  timestamp: number;
  failureAnalysis?: FailureAnalysis;
  evaluation?: any;
  recoveryPlan?: RecoveryPlan;
  plannerFeedback?: string;
  runtimeHints?: string[];
  result?: any;
}

export class LoopMemory {
  private entries: MemoryEntry[] = [];

  /**
   * 记录迭代
   */
  record(entry: Omit<MemoryEntry, "timestamp">): void {
    this.entries.push({
      ...entry,
      timestamp: Date.now()
    });
  }

  /**
   * 获取上一轮摘要
   */
  getPreviousIterationSummary(): string {
    if (this.entries.length === 0) {
      return "No previous iterations.";
    }

    const last = this.entries[this.entries.length - 1];
    const lines: string[] = [
      `Iteration ${last.iteration}:`,
      last.failureAnalysis 
        ? `Failure: ${last.failureAnalysis.type} - ${last.failureAnalysis.reason}`
        : "No failure",
      last.recoveryPlan
        ? `Recovery: ${last.recoveryPlan.action} - ${last.recoveryPlan.reason}`
        : "No recovery plan",
      last.plannerFeedback
        ? `Feedback: ${last.plannerFeedback}`
        : "No feedback"
    ];

    return lines.join("\n");
  }

  /**
   * 获取所有条目
   */
  getEntries(): MemoryEntry[] {
    return [...this.entries];
  }

  /**
   * 获取迭代次数
   */
  getIterationCount(): number {
    return this.entries.length;
  }

  /**
   * 获取失败历史
   */
  getFailureHistory(): FailureAnalysis[] {
    return this.entries
      .filter(e => e.failureAnalysis)
      .map(e => e.failureAnalysis!);
  }

  /**
   * 清空
   */
  clear(): void {
    this.entries = [];
  }
}

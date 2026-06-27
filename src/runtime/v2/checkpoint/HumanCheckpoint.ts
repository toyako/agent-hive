/**
 * Human Checkpoint — Phase 1
 * 
 * 铁律：防认知投降的上下文快照
 * 
 * 当任务进入 WAITING_CHECKPOINT 挂起时，必须通过 Persistence Engine 导出：
 * 1. 当前任务的变更对比（Diff）
 * 2. Evaluator Pipeline 的挂掉原因快照
 * 
 * 确保人类在审批时有据可查，而不是盲目点击"允许"。
 */

import { RuntimeState, RuntimeContext, RuntimeStateMachine } from "../state-machine/RuntimeStateMachine";
import { EventBus, RuntimeEventType, globalEventBus } from "../observation/EventBus";
import { PersistenceEngine } from "../persistence/PersistenceEngine";
import { VerificationResult, Verdict } from "../RuntimeCore";

// 检查点状态
export enum CheckpointStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXPIRED = "expired"
}

// 变更对比
export interface ChangeDiff {
  filesChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  summary: string;
  diffContent?: string;
}

// 检查点快照
export interface CheckpointSnapshot {
  taskId: string;
  status: CheckpointStatus;
  createdAt: number;
  updatedAt: number;
  
  // 任务上下文
  taskGoal: string;
  taskState: RuntimeState;
  
  // 变更对比
  changes: ChangeDiff;
  
  // Evaluator 结果
  evaluatorResult: VerificationResult | null;
  
  // 挂起原因
  suspendReason: string;
  
  // 恢复历史
  recoveryHistory: Array<{
    action: string;
    reason: string;
    timestamp: number;
  }>;
  
  // 预算消耗
  budgetConsumption?: {
    tokensUsed: number;
    costIncurred: number;
    retryCount: number;
  };
  
  // 人工决策
  humanDecision?: {
    decision: "approve" | "reject";
    reason?: string;
    decidedAt: number;
    decidedBy?: string;
  };
}

export class HumanCheckpointManager {
  private stateMachine: RuntimeStateMachine;
  private eventBus: EventBus;
  private persistence: PersistenceEngine;
  private checkpoints: Map<string, CheckpointSnapshot> = new Map();
  
  // 审批回调
  private approvalCallbacks: Array<(taskId: string, approved: boolean, reason?: string) => void> = [];

  constructor(
    stateMachine: RuntimeStateMachine,
    persistence: PersistenceEngine,
    eventBus: EventBus = globalEventBus
  ) {
    this.stateMachine = stateMachine;
    this.persistence = persistence;
    this.eventBus = eventBus;
  }

  /**
   * 注册审批回调
   */
  onApproval(callback: (taskId: string, approved: boolean, reason?: string) => void): void {
    this.approvalCallbacks.push(callback);
  }

  /**
   * 创建检查点快照
   * 
   * 当任务进入 WAITING_CHECKPOINT 时调用
   * 必须导出完整的上下文信息，防止人类"认知投降"
   */
  async createCheckpoint(
    taskId: string,
    changes: ChangeDiff,
    evaluatorResult: VerificationResult | null,
    suspendReason: string,
    recoveryHistory: Array<{ action: string; reason: string; timestamp: number }> = [],
    budgetConsumption?: { tokensUsed: number; costIncurred: number; retryCount: number }
  ): Promise<CheckpointSnapshot> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) {
      throw new Error(`Cannot create checkpoint: task ${taskId} not found`);
    }

    const snapshot: CheckpointSnapshot = {
      taskId,
      status: CheckpointStatus.PENDING,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      
      // 任务上下文
      taskGoal: context.metadata?.contract?.goal || "Unknown",
      taskState: context.state,
      
      // 变更对比
      changes,
      
      // Evaluator 结果
      evaluatorResult,
      
      // 挂起原因
      suspendReason,
      
      // 恢复历史
      recoveryHistory,
      
      // 预算消耗
      budgetConsumption
    };

    // 保存到内存
    this.checkpoints.set(taskId, snapshot);

    // 持久化
    await this.persistence.saveCheckpoint(taskId, snapshot);

    // 触发事件
    this.eventBus.emit({
      type: RuntimeEventType.LOOP_CHECKPOINT,
      taskId,
      timestamp: Date.now(),
      data: { snapshot }
    });

    console.log(`[Checkpoint] Created for task ${taskId}: ${suspendReason}`);
    return snapshot;
  }

  /**
   * 获取检查点快照
   */
  getCheckpoint(taskId: string): CheckpointSnapshot | undefined {
    return this.checkpoints.get(taskId);
  }

  /**
   * 获取所有待审批的检查点
   */
  getPendingCheckpoints(): CheckpointSnapshot[] {
    return Array.from(this.checkpoints.values())
      .filter(cp => cp.status === CheckpointStatus.PENDING);
  }

  /**
   * 人工审批
   * 
   * 提供完整的上下文信息，确保人类有据可查
   */
  async approve(taskId: string, reason?: string, decidedBy?: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(taskId);
    if (!checkpoint || checkpoint.status !== CheckpointStatus.PENDING) {
      return false;
    }

    // 更新检查点状态
    checkpoint.status = CheckpointStatus.APPROVED;
    checkpoint.updatedAt = Date.now();
    checkpoint.humanDecision = {
      decision: "approve",
      reason,
      decidedAt: Date.now(),
      decidedBy
    };

    // 持久化
    await this.persistence.saveCheckpoint(taskId, checkpoint);

    // 状态转换
    const context = this.stateMachine.getContext(taskId);
    if (context && context.state === RuntimeState.WAITING_CHECKPOINT) {
      this.stateMachine.transition(taskId, "CHECKPOINT_PASS", `Human approved: ${reason || "No reason provided"}`);
    }

    // 触发事件
    this.eventBus.emit({
      type: RuntimeEventType.LOOP_RESUME,
      taskId,
      timestamp: Date.now(),
      data: { decision: "approve", reason }
    });

    // 调用回调
    for (const callback of this.approvalCallbacks) {
      try {
        callback(taskId, true, reason);
      } catch (e) {}
    }

    console.log(`[Checkpoint] Approved: ${taskId}`);
    return true;
  }

  /**
   * 人工拒绝
   */
  async reject(taskId: string, reason: string, decidedBy?: string): Promise<boolean> {
    const checkpoint = this.checkpoints.get(taskId);
    if (!checkpoint || checkpoint.status !== CheckpointStatus.PENDING) {
      return false;
    }

    // 更新检查点状态
    checkpoint.status = CheckpointStatus.REJECTED;
    checkpoint.updatedAt = Date.now();
    checkpoint.humanDecision = {
      decision: "reject",
      reason,
      decidedAt: Date.now(),
      decidedBy
    };

    // 持久化
    await this.persistence.saveCheckpoint(taskId, checkpoint);

    // 状态转换
    const context = this.stateMachine.getContext(taskId);
    if (context && context.state === RuntimeState.WAITING_CHECKPOINT) {
      this.stateMachine.transition(taskId, "FAIL", `Human rejected: ${reason}`);
    }

    // 触发事件
    this.eventBus.emit({
      type: RuntimeEventType.LOOP_ABORT,
      taskId,
      timestamp: Date.now(),
      data: { decision: "reject", reason }
    });

    // 调用回调
    for (const callback of this.approvalCallbacks) {
      try {
        callback(taskId, false, reason);
      } catch (e) {}
    }

    console.log(`[Checkpoint] Rejected: ${taskId} - ${reason}`);
    return true;
  }

  /**
   * 生成审批报告
   * 
   * 为人类提供完整的上下文信息
   */
  generateApprovalReport(taskId: string): string {
    const checkpoint = this.checkpoints.get(taskId);
    if (!checkpoint) return "Checkpoint not found";

    const lines: string[] = [];
    lines.push("=== CHECKPOINT APPROVAL REPORT ===");
    lines.push(`Task ID: ${checkpoint.taskId}`);
    lines.push(`Goal: ${checkpoint.taskGoal}`);
    lines.push(`State: ${checkpoint.taskState}`);
    lines.push(`Suspend Reason: ${checkpoint.suspendReason}`);
    lines.push(`Created: ${new Date(checkpoint.createdAt).toISOString()}`);
    lines.push("");

    // 变更对比
    lines.push("=== CHANGES ===");
    lines.push(`Files Changed: ${checkpoint.changes.filesChanged.length}`);
    lines.push(`Lines Added: +${checkpoint.changes.linesAdded}`);
    lines.push(`Lines Removed: -${checkpoint.changes.linesRemoved}`);
    lines.push(`Summary: ${checkpoint.changes.summary}`);
    if (checkpoint.changes.filesChanged.length > 0) {
      lines.push("Changed Files:");
      for (const file of checkpoint.changes.filesChanged) {
        lines.push(`  - ${file}`);
      }
    }
    lines.push("");

    // Evaluator 结果
    if (checkpoint.evaluatorResult) {
      lines.push("=== EVALUATOR RESULT ===");
      lines.push(`Verdict: ${checkpoint.evaluatorResult.verdict}`);
      lines.push(`Score: ${checkpoint.evaluatorResult.score}`);
      lines.push("Checks:");
      for (const check of checkpoint.evaluatorResult.checks) {
        lines.push(`  - ${check.name}: ${check.passed ? "PASS" : "FAIL"} ${check.message || ""}`);
      }
      lines.push("");
    }

    // 恢复历史
    if (checkpoint.recoveryHistory.length > 0) {
      lines.push("=== RECOVERY HISTORY ===");
      for (const record of checkpoint.recoveryHistory) {
        lines.push(`  [${new Date(record.timestamp).toISOString()}] ${record.action}: ${record.reason}`);
      }
      lines.push("");
    }

    // 预算消耗
    if (checkpoint.budgetConsumption) {
      lines.push("=== BUDGET CONSUMPTION ===");
      lines.push(`Tokens Used: ${checkpoint.budgetConsumption.tokensUsed}`);
      lines.push(`Cost Incurred: $${checkpoint.budgetConsumption.costIncurred.toFixed(4)}`);
      lines.push(`Retry Count: ${checkpoint.budgetConsumption.retryCount}`);
      lines.push("");
    }

    lines.push("=== DECISION REQUIRED ===");
    lines.push("Please review the above information and decide:");
    lines.push("  - Approve: Continue task execution");
    lines.push("  - Reject: Abort task");

    return lines.join("\n");
  }

  /**
   * 获取状态
   */
  getStatus(): { total: number; pending: number; approved: number; rejected: number } {
    const checkpoints = Array.from(this.checkpoints.values());
    return {
      total: checkpoints.length,
      pending: checkpoints.filter(cp => cp.status === CheckpointStatus.PENDING).length,
      approved: checkpoints.filter(cp => cp.status === CheckpointStatus.APPROVED).length,
      rejected: checkpoints.filter(cp => cp.status === CheckpointStatus.REJECTED).length
    };
  }
}

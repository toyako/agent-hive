/**
 * Recovery Engine — Phase 1
 * 
 * 铁律：见好就收，严禁无限套娃
 * 
 * Recovery Engine 在执行 Rollback 或 Retry 时，
 * 必须有严格的全局最大循环阈值（Global Loop Limit）。
 * 
 * 一旦超过阈值或遇到未知崩溃：
 * - 立即阻断自主循环
 * - 状态强转为 WAITING_CHECKPOINT
 * - 抛给人工处理
 * 
 * 不能让系统在后台自己反复重试。
 */

import { RuntimeState, RuntimeContext, RuntimeStateMachine } from "../state-machine/RuntimeStateMachine";
import { EventBus, RuntimeEventType, globalEventBus } from "../observation/EventBus";
import { PersistenceEngine } from "../persistence/PersistenceEngine";

// 恢复策略
export enum RecoveryAction {
  RESUME = "resume",
  REPLAY = "replay",
  ROLLBACK = "rollback",
  RETRY = "retry",
  RESTART = "restart",
  SKIP = "skip",
  ABORT = "abort",
  ESCALATE = "escalate" // 抛给人工
}

// 恢复配置
export interface RecoveryConfig {
  globalMaxLoops: number;        // 全局最大循环次数
  maxRetriesPerTask: number;     // 每个任务最大重试次数
  maxRollbackDepth: number;      // 最大回滚深度
  unknownCrashPolicy: RecoveryAction; // 未知崩溃策略
  escalateAfterMaxLoops: boolean; // 超过最大循环后是否升级到人工
}

// 恢复记录
export interface RecoveryRecord {
  taskId: string;
  action: RecoveryAction;
  fromState: RuntimeState;
  toState: RuntimeState;
  reason: string;
  timestamp: number;
  loopCount: number;
}

export class RecoveryEngine {
  private config: RecoveryConfig;
  private stateMachine: RuntimeStateMachine;
  private eventBus: EventBus;
  private persistence: PersistenceEngine | null = null;
  
  // 全局循环计数器
  private globalLoopCount: number = 0;
  // 每个任务的循环计数器
  private taskLoopCounts: Map<string, number> = new Map();
  // 恢复历史
  private recoveryHistory: RecoveryRecord[] = [];
  // 升级回调（当需要人工介入时调用）
  private escalateCallbacks: Array<(taskId: string, reason: string) => void> = [];

  constructor(
    stateMachine: RuntimeStateMachine,
    config: Partial<RecoveryConfig> = {},
    eventBus: EventBus = globalEventBus
  ) {
    this.stateMachine = stateMachine;
    this.eventBus = eventBus;
    this.config = {
      globalMaxLoops: 100,
      maxRetriesPerTask: 3,
      maxRollbackDepth: 5,
      unknownCrashPolicy: RecoveryAction.ESCALATE,
      escalateAfterMaxLoops: true,
      ...config
    };
  }

  /**
   * 设置持久化引擎
   */
  setPersistence(persistence: PersistenceEngine): void {
    this.persistence = persistence;
  }

  /**
   * 注册升级回调
   */
  onEscalate(callback: (taskId: string, reason: string) => void): void {
    this.escalateCallbacks.push(callback);
  }

  /**
   * 尝试恢复任务
   * 
   * 返回恢复动作，如果返回 ESCALATE 则表示需要人工介入
   */
  async attemptRecovery(taskId: string, error?: string): Promise<RecoveryAction> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) {
      return RecoveryAction.ABORT;
    }

    // 🚨 检查全局循环次数
    if (this.globalLoopCount >= this.config.globalMaxLoops) {
      console.error(`[Recovery] 🚨 Global loop limit exceeded: ${this.globalLoopCount}/${this.config.globalMaxLoops}`);
      return this.escalateToHuman(taskId, `Global loop limit exceeded: ${this.globalLoopCount}`);
    }

    // 🚨 检查任务循环次数
    const taskLoops = this.taskLoopCounts.get(taskId) || 0;
    if (taskLoops >= this.config.maxRetriesPerTask) {
      console.error(`[Recovery] 🚨 Task retry limit exceeded: ${taskLoops}/${this.config.maxRetriesPerTask}`);
      return this.escalateToHuman(taskId, `Task retry limit exceeded: ${taskLoops}`);
    }

    // 分析错误并决定恢复策略
    const action = this.decideRecoveryAction(context, error);

    // 如果是升级到人工，直接返回
    if (action === RecoveryAction.ESCALATE) {
      return this.escalateToHuman(taskId, error || "Unknown error requiring human intervention");
    }

    // 执行恢复动作
    await this.executeRecoveryAction(taskId, action, error);

    // 更新计数器
    this.globalLoopCount++;
    this.taskLoopCounts.set(taskId, taskLoops + 1);

    return action;
  }

  /**
   * 决定恢复策略
   */
  private decideRecoveryAction(context: RuntimeContext, error?: string): RecoveryAction {
    const currentState = context.state;

    // 根据当前状态和错误类型决定策略
    switch (currentState) {
      case RuntimeState.FAILED:
        // 检查是否可以重试
        const taskLoops = this.taskLoopCounts.get(context.taskId) || 0;
        if (taskLoops < this.config.maxRetriesPerTask) {
          return RecoveryAction.RETRY;
        }
        return RecoveryAction.ESCALATE;

      case RuntimeState.TIMEOUT:
        // 超时可以重试
        return RecoveryAction.RETRY;

      case RuntimeState.BUDGET_LIMIT:
        // 预算超限，必须升级到人工
        return RecoveryAction.ESCALATE;

      default:
        // 未知崩溃
        return this.config.unknownCrashPolicy;
    }
  }

  /**
   * 执行恢复动作
   */
  private async executeRecoveryAction(taskId: string, action: RecoveryAction, error?: string): Promise<void> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return;

    const fromState = context.state;

    // 记录恢复历史
    const record: RecoveryRecord = {
      taskId,
      action,
      fromState,
      toState: fromState, // 将在下面更新
      reason: error || "Recovery action",
      timestamp: Date.now(),
      loopCount: this.taskLoopCounts.get(taskId) || 0
    };

    switch (action) {
      case RecoveryAction.RETRY:
        // 重试：状态转为 RETRYING
        this.stateMachine.transition(taskId, "RETRY", `Retry after error: ${error}`);
        record.toState = RuntimeState.RETRYING;
        break;

      case RecoveryAction.ROLLBACK:
        // 回滚：状态转为 PLANNED
        this.stateMachine.transition(taskId, "ROLLBACK", `Rollback after error: ${error}`);
        record.toState = RuntimeState.PLANNED;
        break;

      case RecoveryAction.RESTART:
        // 重启：状态转为 QUEUED
        this.stateMachine.transition(taskId, "RESTART", `Restart after error: ${error}`);
        record.toState = RuntimeState.QUEUED;
        break;

      case RecoveryAction.SKIP:
        // 跳过：状态转为 COMPLETED
        this.stateMachine.transition(taskId, "SKIP", `Skipped after error: ${error}`);
        record.toState = RuntimeState.COMPLETED;
        break;

      case RecoveryAction.ABORT:
        // 中止：状态转为 ABORTED
        this.stateMachine.transition(taskId, "ABORT", `Aborted after error: ${error}`);
        record.toState = RuntimeState.ABORTED;
        break;

      case RecoveryAction.RESUME:
        // 恢复：保持当前状态
        record.toState = fromState;
        break;
    }

    // 保存恢复记录
    this.recoveryHistory.push(record);

    // 持久化恢复信息
    if (this.persistence) {
      await this.persistence.saveRecovery(taskId, {
        record,
        globalLoopCount: this.globalLoopCount,
        taskLoopCount: this.taskLoopCounts.get(taskId)
      });
    }

    // 触发恢复事件
    this.eventBus.emit({
      type: RuntimeEventType.RECOVERY_COMPLETED,
      taskId,
      timestamp: Date.now(),
      data: { action, fromState, toState: record.toState }
    });
  }

  /**
   * 升级到人工处理
   * 
   * 立即阻断自主循环，状态强转为 WAITING_CHECKPOINT
   */
  private escalateToHuman(taskId: string, reason: string): RecoveryAction {
    console.error(`[Recovery] 🚨 ESCALATING TO HUMAN: ${taskId} - ${reason}`);

    // 状态强转为 WAITING_CHECKPOINT
    const context = this.stateMachine.getContext(taskId);
    if (context) {
      this.stateMachine.transition(taskId, "WAIT_CHECKPOINT", `Escalated to human: ${reason}`);
    }

    // 持久化
    if (this.persistence) {
      this.persistence.saveRecovery(taskId, {
        escalated: true,
        reason,
        globalLoopCount: this.globalLoopCount,
        taskLoopCount: this.taskLoopCounts.get(taskId),
        timestamp: Date.now()
      });
    }

    // 触发事件
    this.eventBus.emit({
      type: RuntimeEventType.LOOP_CHECKPOINT,
      taskId,
      timestamp: Date.now(),
      data: { requiresApproval: true, reason }
    });

    // 调用升级回调
    for (const callback of this.escalateCallbacks) {
      try {
        callback(taskId, reason);
      } catch (e) {
        // 即使回调失败，也不阻止升级
      }
    }

    return RecoveryAction.ESCALATE;
  }

  /**
   * 人工批准后恢复
   */
  approveTask(taskId: string): boolean {
    const context = this.stateMachine.getContext(taskId);
    if (!context || context.state !== RuntimeState.WAITING_CHECKPOINT) {
      return false;
    }

    this.stateMachine.transition(taskId, "CHECKPOINT_PASS", "Human approved");
    return true;
  }

  /**
   * 人工拒绝后中止
   */
  rejectTask(taskId: string, reason: string): boolean {
    const context = this.stateMachine.getContext(taskId);
    if (!context || context.state !== RuntimeState.WAITING_CHECKPOINT) {
      return false;
    }

    this.stateMachine.transition(taskId, "FAIL", `Human rejected: ${reason}`);
    return true;
  }

  /**
   * 获取恢复历史
   */
  getRecoveryHistory(taskId?: string): RecoveryRecord[] {
    if (taskId) {
      return this.recoveryHistory.filter(r => r.taskId === taskId);
    }
    return [...this.recoveryHistory];
  }

  /**
   * 获取全局循环计数
   */
  getGlobalLoopCount(): number {
    return this.globalLoopCount;
  }

  /**
   * 获取任务循环计数
   */
  getTaskLoopCount(taskId: string): number {
    return this.taskLoopCounts.get(taskId) || 0;
  }

  /**
   * 获取配置
   */
  getConfig(): RecoveryConfig {
    return { ...this.config };
  }

  /**
   * 重置全局循环计数
   */
  resetGlobalLoopCount(): void {
    this.globalLoopCount = 0;
  }
}

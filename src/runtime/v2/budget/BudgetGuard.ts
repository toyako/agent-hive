/**
 * Budget Guard — Phase 1
 * 
 * 铁律：冷酷无情（Hard Abort）
 * 
 * 一旦检测到 Token 消耗、重试次数或费用超过限制，
 * 必须触发最高优先级的系统级硬中断。
 * 
 * 绝对不允许给 Agent 留有：
 * - "自我纠错"的运行空间
 * - "善后编写日志"的运行空间
 * - "自我辩解"的运行空间
 * 
 * 直接切断执行流，状态强转为 BUDGET_LIMIT。
 */

import { EventBus, RuntimeEventType, globalEventBus } from "../observation/EventBus";
import { PersistenceEngine } from "../persistence/PersistenceEngine";

// 预算配置
export interface BudgetLimits {
  maxTokensPerTask?: number;
  maxTokensDaily?: number;
  maxCostPerTask?: number;   // USD
  maxCostDaily?: number;     // USD
  maxRetriesPerTask?: number;
  maxRuntimePerTask?: number; // ms
  maxRuntimeDaily?: number;   // ms
}

// 预算消耗记录
export interface BudgetConsumption {
  tokensUsed: number;
  costIncurred: number;  // USD
  retryCount: number;
  runtimeElapsed: number; // ms
  timestamp: number;
}

// 预算状态
export interface BudgetState {
  taskConsumptions: Map<string, BudgetConsumption>;
  dailyTokens: number;
  dailyCost: number;
  dailyRuntime: number;
  dailyResetAt: number;
}

export class BudgetGuard {
  private limits: BudgetLimits;
  private state: BudgetState;
  private eventBus: EventBus;
  private persistence: PersistenceEngine | null = null;
  private hardAbortCallbacks: Array<(taskId: string, reason: string) => void> = [];

  constructor(limits: BudgetLimits, eventBus: EventBus = globalEventBus) {
    this.limits = limits;
    this.eventBus = eventBus;
    this.state = {
      taskConsumptions: new Map(),
      dailyTokens: 0,
      dailyCost: 0,
      dailyRuntime: 0,
      dailyResetAt: this.getNextDayReset()
    };
  }

  /**
   * 设置持久化引擎
   */
  setPersistence(persistence: PersistenceEngine): void {
    this.persistence = persistence;
  }

  /**
   * 注册硬中断回调
   * 
   * 当预算超限时，直接调用这些回调切断执行流
   */
  onHardAbort(callback: (taskId: string, reason: string) => void): void {
    this.hardAbortCallbacks.push(callback);
  }

  /**
   * 检查任务是否可以开始执行
   * 
   * 在任务开始前检查，如果超限则立即阻断
   */
  canStartTask(taskId: string): { allowed: boolean; reason?: string } {
    this.checkDailyReset();

    // 检查每日 Token 限制
    if (this.limits.maxTokensDaily && this.state.dailyTokens >= this.limits.maxTokensDaily) {
      return { allowed: false, reason: `Daily token limit exceeded: ${this.state.dailyTokens}/${this.limits.maxTokensDaily}` };
    }

    // 检查每日费用限制
    if (this.limits.maxCostDaily && this.state.dailyCost >= this.limits.maxCostDaily) {
      return { allowed: false, reason: `Daily cost limit exceeded: $${this.state.dailyCost.toFixed(4)}/$${this.limits.maxCostDaily}` };
    }

    // 检查每日运行时间限制
    if (this.limits.maxRuntimeDaily && this.state.dailyRuntime >= this.limits.maxRuntimeDaily) {
      return { allowed: false, reason: `Daily runtime limit exceeded: ${this.state.dailyRuntime}ms/${this.limits.maxRuntimeDaily}ms` };
    }

    return { allowed: true };
  }

  /**
   * 记录任务消耗
   * 
   * 每次调用都会检查是否超限
   * 如果超限，立即触发硬中断
   */
  recordConsumption(taskId: string, consumption: Partial<BudgetConsumption>): void {
    this.checkDailyReset();

    // 获取或创建任务消耗记录
    let taskConsumption = this.state.taskConsumptions.get(taskId);
    if (!taskConsumption) {
      taskConsumption = { tokensUsed: 0, costIncurred: 0, retryCount: 0, runtimeElapsed: 0, timestamp: Date.now() };
      this.state.taskConsumptions.set(taskId, taskConsumption);
    }

    // 更新消耗
    if (consumption.tokensUsed) {
      taskConsumption.tokensUsed += consumption.tokensUsed;
      this.state.dailyTokens += consumption.tokensUsed;
    }
    if (consumption.costIncurred) {
      taskConsumption.costIncurred += consumption.costIncurred;
      this.state.dailyCost += consumption.costIncurred;
    }
    if (consumption.retryCount) {
      taskConsumption.retryCount += consumption.retryCount;
    }
    if (consumption.runtimeElapsed) {
      taskConsumption.runtimeElapsed += consumption.runtimeElapsed;
      this.state.dailyRuntime += consumption.runtimeElapsed;
    }

    // 🚨 立即检查是否超限 - 冷酷无情
    this.enforceBudgetLimits(taskId);
  }

  /**
   * 记录重试
   */
  recordRetry(taskId: string): void {
    this.recordConsumption(taskId, { retryCount: 1 });
  }

  /**
   * 🚨 强制执行预算限制 - 冷酷无情
   * 
   * 一旦超限，立即触发硬中断，不允许任何善后操作
   */
  private enforceBudgetLimits(taskId: string): void {
    const taskConsumption = this.state.taskConsumptions.get(taskId);
    if (!taskConsumption) return;

    // 检查任务级 Token 限制
    if (this.limits.maxTokensPerTask && taskConsumption.tokensUsed > this.limits.maxTokensPerTask) {
      this.triggerHardAbort(taskId, `Task token limit exceeded: ${taskConsumption.tokensUsed}/${this.limits.maxTokensPerTask}`);
      return;
    }

    // 检查任务级费用限制
    if (this.limits.maxCostPerTask && taskConsumption.costIncurred > this.limits.maxCostPerTask) {
      this.triggerHardAbort(taskId, `Task cost limit exceeded: $${taskConsumption.costIncurred.toFixed(4)}/$${this.limits.maxCostPerTask}`);
      return;
    }

    // 检查任务级重试限制
    if (this.limits.maxRetriesPerTask && taskConsumption.retryCount > this.limits.maxRetriesPerTask) {
      this.triggerHardAbort(taskId, `Task retry limit exceeded: ${taskConsumption.retryCount}/${this.limits.maxRetriesPerTask}`);
      return;
    }

    // 检查任务级运行时间限制
    if (this.limits.maxRuntimePerTask && taskConsumption.runtimeElapsed > this.limits.maxRuntimePerTask) {
      this.triggerHardAbort(taskId, `Task runtime limit exceeded: ${taskConsumption.runtimeElapsed}ms/${this.limits.maxRuntimePerTask}ms`);
      return;
    }

    // 检查每日 Token 限制
    if (this.limits.maxTokensDaily && this.state.dailyTokens > this.limits.maxTokensDaily) {
      this.triggerHardAbort(taskId, `Daily token limit exceeded: ${this.state.dailyTokens}/${this.limits.maxTokensDaily}`);
      return;
    }

    // 检查每日费用限制
    if (this.limits.maxCostDaily && this.state.dailyCost > this.limits.maxCostDaily) {
      this.triggerHardAbort(taskId, `Daily cost limit exceeded: $${this.state.dailyCost.toFixed(4)}/$${this.limits.maxCostDaily}`);
      return;
    }

    // 检查每日运行时间限制
    if (this.limits.maxRuntimeDaily && this.state.dailyRuntime > this.limits.maxRuntimeDaily) {
      this.triggerHardAbort(taskId, `Daily runtime limit exceeded: ${this.state.dailyRuntime}ms/${this.limits.maxRuntimeDaily}ms`);
      return;
    }
  }

  /**
   * 🚨 触发硬中断 - 冷酷无情
   * 
   * 直接切断执行流，状态强转为 BUDGET_LIMIT
   * 不允许任何善后操作
   */
  private triggerHardAbort(taskId: string, reason: string): void {
    console.error(`[BudgetGuard] 🚨 HARD ABORT: ${taskId} - ${reason}`);

    // 持久化预算状态
    if (this.persistence) {
      this.persistence.saveBudget({
        limits: this.limits,
        state: {
          dailyTokens: this.state.dailyTokens,
          dailyCost: this.state.dailyCost,
          dailyRuntime: this.state.dailyRuntime,
          abortedTask: taskId,
          abortReason: reason,
          timestamp: Date.now()
        }
      });
    }

    // 触发事件
    this.eventBus.emit({
      type: RuntimeEventType.BUDGET_EXCEEDED,
      taskId,
      timestamp: Date.now(),
      error: reason
    });

    // 触发所有硬中断回调 - 直接切断执行流
    for (const callback of this.hardAbortCallbacks) {
      try {
        callback(taskId, reason);
      } catch (e) {
        // 即使回调失败，也不阻止硬中断
      }
    }
  }

  /**
   * 获取任务消耗
   */
  getTaskConsumption(taskId: string): BudgetConsumption | undefined {
    return this.state.taskConsumptions.get(taskId);
  }

  /**
   * 获取每日状态
   */
  getDailyState(): { tokens: number; cost: number; runtime: number; resetAt: number } {
    this.checkDailyReset();
    return {
      tokens: this.state.dailyTokens,
      cost: this.state.dailyCost,
      runtime: this.state.dailyRuntime,
      resetAt: this.state.dailyResetAt
    };
  }

  /**
   * 获取限制
   */
  getLimits(): BudgetLimits {
    return { ...this.limits };
  }

  /**
   * 更新限制
   */
  updateLimits(limits: Partial<BudgetLimits>): void {
    Object.assign(this.limits, limits);
  }

  /**
   * 检查并重置每日计数器
   */
  private checkDailyReset(): void {
    const now = Date.now();
    if (now >= this.state.dailyResetAt) {
      this.state.dailyTokens = 0;
      this.state.dailyCost = 0;
      this.state.dailyRuntime = 0;
      this.state.dailyResetAt = this.getNextDayReset();
    }
  }

  /**
   * 获取明天重置时间
   */
  private getNextDayReset(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }
}

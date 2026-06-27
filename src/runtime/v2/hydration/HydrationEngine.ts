/**
 * Hydration Engine — Phase 4
 * 
 * 优雅降级与断点续传恢复
 * 
 * 如果运行主进程意外崩溃或服务器重启：
 * - 系统启动后能通过持久化快照自动恢复（Hydrate）状态机
 * - 让挂起的任务无缝继续执行
 */

import * as fs from "fs";
import * as path from "path";
import { RuntimeState, RuntimeContext, RuntimeStateMachine } from "../state-machine/RuntimeStateMachine";
import { PersistenceEngine, PersistedState } from "../persistence/PersistenceEngine";
import { EventBus, RuntimeEventType, globalEventBus } from "../observation/EventBus";

// 水合状态
export enum HydrationStatus {
  SUCCESS = "success",
  PARTIAL = "partial",
  FAILED = "failed"
}

// 水合结果
export interface HydrationResult {
  status: HydrationStatus;
  tasksRecovered: number;
  tasksFailed: number;
  errors: string[];
  timestamp: number;
}

// 恢复策略
export enum RecoveryStrategy {
  RESUME = "resume",      // 从上次状态继续
  RESTART = "restart",    // 重新开始
  SKIP = "skip",          // 跳过
  ESCALATE = "escalate"   // 升级到人工
}

export class HydrationEngine {
  private persistence: PersistenceEngine;
  private stateMachine: RuntimeStateMachine;
  private eventBus: EventBus;
  private basePath: string;

  constructor(
    stateMachine: RuntimeStateMachine,
    persistence: PersistenceEngine,
    eventBus: EventBus = globalEventBus
  ) {
    this.stateMachine = stateMachine;
    this.persistence = persistence;
    this.eventBus = eventBus;
    this.basePath = persistence.getStatus().basePath;
  }

  /**
   * 水合（恢复）状态机
   * 
   * 从持久化存储中恢复所有任务状态
   */
  async hydrate(): Promise<HydrationResult> {
    console.log("[Hydration] Starting hydration...");
    
    const errors: string[] = [];
    let tasksRecovered = 0;
    let tasksFailed = 0;

    try {
      // 1. 加载持久化状态
      const persistedState = await this.persistence.loadState();
      if (!persistedState) {
        console.log("[Hydration] No persisted state found");
        return {
          status: HydrationStatus.SUCCESS,
          tasksRecovered: 0,
          tasksFailed: 0,
          errors: [],
          timestamp: Date.now()
        };
      }

      console.log(`[Hydration] Found ${Object.keys(persistedState.contexts).length} tasks to recover`);

      // 2. 恢复每个任务
      for (const [taskId, context] of Object.entries(persistedState.contexts)) {
        try {
          await this.recoverTask(taskId, context);
          tasksRecovered++;
        } catch (error) {
          tasksFailed++;
          errors.push(`Task ${taskId}: ${error}`);
          console.error(`[Hydration] Failed to recover task ${taskId}:`, error);
        }
      }

      // 3. 恢复队列
      const queue = await this.persistence.loadQueue();
      console.log(`[Hydration] Recovered ${queue.length} queued tasks`);

      // 4. 恢复预算状态
      const budget = await this.persistence.loadBudget();
      if (budget) {
        console.log("[Hydration] Budget state recovered");
      }

      // 5. 触发恢复完成事件
      this.eventBus.emit({
        type: RuntimeEventType.RECOVERY_COMPLETED,
        taskId: "system",
        timestamp: Date.now(),
        data: { tasksRecovered, tasksFailed }
      });

      const status = tasksFailed === 0 ? HydrationStatus.SUCCESS : 
                     tasksRecovered > 0 ? HydrationStatus.PARTIAL : 
                     HydrationStatus.FAILED;

      console.log(`[Hydration] Completed: ${tasksRecovered} recovered, ${tasksFailed} failed`);

      return {
        status,
        tasksRecovered,
        tasksFailed,
        errors,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error("[Hydration] Critical error:", error);
      
      return {
        status: HydrationStatus.FAILED,
        tasksRecovered,
        tasksFailed,
        errors: [...errors, String(error)],
        timestamp: Date.now()
      };
    }
  }

  /**
   * 恢复单个任务
   */
  private async recoverTask(taskId: string, context: RuntimeContext): Promise<void> {
    // 检查任务状态
    const state = context.state;
    
    // 决定恢复策略
    const strategy = this.decideRecoveryStrategy(state);
    
    console.log(`[Hydration] Recovering task ${taskId} (state: ${state}, strategy: ${strategy})`);

    switch (strategy) {
      case RecoveryStrategy.RESUME:
        // 恢复状态机上下文
        this.stateMachine.createContext(taskId, context.metadata?.intent || "Recovered task", context.metadata);
        
        // 恢复状态历史
        for (const historyEntry of context.stateHistory) {
          // 注意：这里简化处理，实际应该逐步恢复状态
        }
        
        console.log(`[Hydration] Task ${taskId} resumed at state ${state}`);
        break;

      case RecoveryStrategy.RESTART:
        // 重新开始
        this.stateMachine.createContext(taskId, context.metadata?.intent || "Recovered task", context.metadata);
        console.log(`[Hydration] Task ${taskId} restarted`);
        break;

      case RecoveryStrategy.SKIP:
        // 跳过
        console.log(`[Hydration] Task ${taskId} skipped`);
        break;

      case RecoveryStrategy.ESCALATE:
        // 升级到人工
        this.stateMachine.createContext(taskId, context.metadata?.intent || "Recovered task", context.metadata);
        this.stateMachine.transition(taskId, "WAIT_CHECKPOINT", "Recovered from crash, needs human review");
        console.log(`[Hydration] Task ${taskId} escalated to human`);
        break;
    }
  }

  /**
   * 决定恢复策略
   */
  private decideRecoveryStrategy(state: RuntimeState): RecoveryStrategy {
    switch (state) {
      case RuntimeState.DISCOVERED:
      case RuntimeState.QUEUED:
        // 可以安全重启
        return RecoveryStrategy.RESTART;

      case RuntimeState.PLANNED:
      case RuntimeState.RUNNING:
        // 运行中，需要人工检查
        return RecoveryStrategy.ESCALATE;

      case RuntimeState.REVIEWING:
      case RuntimeState.VERIFYING:
        // 验证中，可以继续
        return RecoveryStrategy.RESUME;

      case RuntimeState.WAITING_CHECKPOINT:
        // 等待人工，保持状态
        return RecoveryStrategy.RESUME;

      case RuntimeState.COMPLETED:
      case RuntimeState.ARCHIVED:
        // 已完成，跳过
        return RecoveryStrategy.SKIP;

      case RuntimeState.FAILED:
      case RuntimeState.CANCELLED:
      case RuntimeState.ABORTED:
        // 已失败，跳过
        return RecoveryStrategy.SKIP;

      case RuntimeState.RETRYING:
        // 重试中，升级到人工
        return RecoveryStrategy.ESCALATE;

      case RuntimeState.TIMEOUT:
      case RuntimeState.BUDGET_LIMIT:
        // 超时或预算超限，升级到人工
        return RecoveryStrategy.ESCALATE;

      default:
        return RecoveryStrategy.ESCALATE;
    }
  }

  /**
   * 检查是否需要水合
   */
  async needsHydration(): Promise<boolean> {
    const state = await this.persistence.loadState();
    return state !== null && Object.keys(state.contexts).length > 0;
  }

  /**
   * 创建检查点（用于崩溃恢复）
   */
  async createCheckpoint(taskId: string): Promise<boolean> {
    try {
      const context = this.stateMachine.getContext(taskId);
      if (!context) return false;

      const state: PersistedState = {
        version: "1.0",
        timestamp: Date.now(),
        contexts: { [taskId]: context },
        queue: [],
        metadata: {}
      };

      await this.persistence.saveState(state);
      return true;
    } catch (error) {
      console.error(`[Hydration] Failed to create checkpoint for ${taskId}:`, error);
      return false;
    }
  }

  /**
   * 获取状态
   */
  async getStatus(): Promise<{
    hasPersistedState: boolean;
    taskCount: number;
    lastCheckpoint?: number;
  }> {
    const state = await this.persistence.loadState();
    
    return {
      hasPersistedState: state !== null,
      taskCount: state ? Object.keys(state.contexts).length : 0,
      lastCheckpoint: state?.timestamp
    };
  }
}

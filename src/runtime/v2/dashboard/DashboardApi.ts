/**
 * Dashboard API — Phase 4
 * 
 * 可视化审批面板底座
 * 
 * 提供 REST API 接口：
 * - GET /api/runtime/tasks (任务全景监视器)
 * - GET /api/runtime/checkpoint/:taskId (审批快照接口)
 * - POST /api/runtime/checkpoint/:taskId/decide (远程人工干预接口)
 * - GET /api/runtime/audit/:taskId (合规审计溯源接口)
 */

import { RuntimeCore } from "../RuntimeCore";
import { RuntimeState } from "../state-machine/RuntimeStateMachine";
import { RuntimeWorkflowBridge, WorkflowExecutionResult } from "../workflow/RuntimeWorkflowBridge";
import { HumanCheckpointManager, CheckpointSnapshot } from "../checkpoint/HumanCheckpoint";
import { AuditTrail, AuditEvent, AuditEventType } from "../audit/AuditTrail";
import { BudgetGuard, BudgetConsumption } from "../budget/BudgetGuard";
import { RecoveryEngine } from "../recovery/RecoveryEngine";
import { PersistenceEngine } from "../persistence/PersistenceEngine";
import { EventBus, RuntimeEventType, globalEventBus } from "../observation/EventBus";

// API 响应格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// 任务状态视图
export interface TaskStatusView {
  taskId: string;
  state: RuntimeState;
  goal: string;
  createdAt: number;
  updatedAt: number;
  
  // Budget 实时数据
  budget: {
    tokensUsed: number;
    costIncurred: number;
    retryCount: number;
    maxTokens?: number;
    maxCost?: number;
    maxRetries?: number;
  };
  
  // 执行信息
  execution?: {
    executor: string;
    reviewer?: string;
    duration?: number;
    attempts: number;
  };
  
  // 验证信息
  verification?: {
    verdict: string;
    score: number;
    checks: Array<{ name: string; passed: boolean; message?: string }>;
  };
}

// 审批快照视图
export interface CheckpointView {
  taskId: string;
  status: string;
  createdAt: number;
  
  // 任务信息
  taskGoal: string;
  taskState: RuntimeState;
  
  // 变更摘要
  changes: {
    filesChanged: string[];
    linesAdded: number;
    linesRemoved: number;
    summary: string;
  };
  
  // 验证结果（含 error.stack 全量）
  evaluatorResult?: {
    verdict: string;
    score: number;
    checks: Array<{
      name: string;
      passed: boolean;
      message?: string;
      stack?: string;
    }>;
  };
  
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
  
  // 审批报告
  approvalReport: string;
}

// 决策请求
export interface DecisionRequest {
  action: "APPROVE" | "REJECT";
  reason?: string;
  operator?: string;
}

// 决策响应
export interface DecisionResponse {
  taskId: string;
  decision: string;
  newState: RuntimeState;
  message: string;
}

// 审计记录视图
export interface AuditView {
  taskId: string;
  events: AuditEvent[];
  totalEvents: number;
  timeRange: {
    start: number;
    end: number;
  };
}

export class DashboardApi {
  private runtime: RuntimeCore;
  private bridge: RuntimeWorkflowBridge;
  private checkpointManager: HumanCheckpointManager;
  private auditTrail: AuditTrail;
  private budgetGuard: BudgetGuard;
  private recovery: RecoveryEngine;
  private persistence: PersistenceEngine;
  private eventBus: EventBus;

  constructor(
    runtime: RuntimeCore,
    bridge: RuntimeWorkflowBridge,
    options: {
      persistence?: PersistenceEngine;
      eventBus?: EventBus;
    } = {}
  ) {
    this.runtime = runtime;
    this.bridge = bridge;
    this.persistence = options.persistence || new PersistenceEngine();
    this.eventBus = options.eventBus || globalEventBus;
    
    // 从 bridge 获取组件
    this.checkpointManager = bridge.getCheckpointManager();
    this.budgetGuard = bridge.getBudgetGuard();
    this.recovery = bridge.getRecoveryEngine();
    
    // 创建审计追踪
    this.auditTrail = new AuditTrail(this.persistence);
    this.auditTrail.start();
    
    // 注册事件监听
    this.registerEventListeners();
  }

  /**
   * 注册事件监听
   */
  private registerEventListeners(): void {
    // 监听状态流转事件
    this.eventBus.on(RuntimeEventType.LOOP_DISCOVER, async (event) => {
      this.auditTrail.recordStateTransition(
        event.taskId,
        RuntimeState.DISCOVERED,
        RuntimeState.QUEUED,
        "Task discovered"
      );
    });

    this.eventBus.on(RuntimeEventType.LOOP_EXECUTE, async (event) => {
      this.auditTrail.recordStateTransition(
        event.taskId,
        RuntimeState.QUEUED,
        RuntimeState.RUNNING,
        "Execution started"
      );
    });

    this.eventBus.on(RuntimeEventType.LOOP_COMPLETE, async (event) => {
      this.auditTrail.recordStateTransition(
        event.taskId,
        RuntimeState.VERIFYING,
        RuntimeState.COMPLETED,
        "Task completed"
      );
    });

    this.eventBus.on(RuntimeEventType.LOOP_REJECT, async (event) => {
      this.auditTrail.recordStateTransition(
        event.taskId,
        RuntimeState.VERIFYING,
        RuntimeState.FAILED,
        event.error || "Task rejected"
      );
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GET /api/runtime/tasks
  // ═══════════════════════════════════════════════════════════════

  /**
   * 获取所有任务状态
   */
  async getTasks(): Promise<ApiResponse<TaskStatusView[]>> {
    try {
      const contexts = this.runtime.getAllTasks();
      const tasks: TaskStatusView[] = [];

      for (const context of contexts) {
        const taskId = context.taskId;
        const budgetConsumption = this.budgetGuard.getTaskConsumption(taskId);
        const budgetLimits = this.budgetGuard.getLimits();

        tasks.push({
          taskId,
          state: context.state,
          goal: context.metadata?.contract?.goal || "Unknown",
          createdAt: context.createdAt,
          updatedAt: context.updatedAt,
          budget: {
            tokensUsed: budgetConsumption?.tokensUsed || 0,
            costIncurred: budgetConsumption?.costIncurred || 0,
            retryCount: budgetConsumption?.retryCount || 0,
            maxTokens: budgetLimits.maxTokensPerTask,
            maxCost: budgetLimits.maxCostPerTask,
            maxRetries: budgetLimits.maxRetriesPerTask
          },
          execution: {
            executor: context.metadata?.executor || "unknown",
            reviewer: context.metadata?.reviewer,
            duration: context.updatedAt - context.createdAt,
            attempts: budgetConsumption?.retryCount || 0
          },
          verification: context.metadata?.verificationResult ? {
            verdict: context.metadata.verificationResult.verdict,
            score: context.metadata.verificationResult.score,
            checks: context.metadata.verificationResult.checks
          } : undefined
        });
      }

      return {
        success: true,
        data: tasks,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        timestamp: Date.now()
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GET /api/runtime/checkpoint/:taskId
  // ═══════════════════════════════════════════════════════════════

  /**
   * 获取审批快照
   */
  async getCheckpoint(taskId: string): Promise<ApiResponse<CheckpointView>> {
    try {
      const snapshot = this.checkpointManager.getCheckpoint(taskId);
      if (!snapshot) {
        return {
          success: false,
          error: `Checkpoint not found for task: ${taskId}`,
          timestamp: Date.now()
        };
      }

      // 生成审批报告
      const approvalReport = this.checkpointManager.generateApprovalReport(taskId);

      return {
        success: true,
        data: {
          taskId: snapshot.taskId,
          status: snapshot.status,
          createdAt: snapshot.createdAt,
          taskGoal: snapshot.taskGoal,
          taskState: snapshot.taskState,
          changes: snapshot.changes,
          evaluatorResult: snapshot.evaluatorResult ? {
            verdict: snapshot.evaluatorResult.verdict,
            score: snapshot.evaluatorResult.score,
            checks: snapshot.evaluatorResult.checks.map(c => ({
              ...c,
              stack: c.message?.includes("Error") ? c.message : undefined
            }))
          } : undefined,
          suspendReason: snapshot.suspendReason,
          recoveryHistory: snapshot.recoveryHistory,
          budgetConsumption: snapshot.budgetConsumption,
          approvalReport
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        timestamp: Date.now()
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // POST /api/runtime/checkpoint/:taskId/decide
  // ═══════════════════════════════════════════════════════════════

  // 决策锁（防止并发冲突）
  private decisionLocks: Map<string, boolean> = new Map();

  /**
   * 远程人工干预（带互斥锁）
   */
  async decideCheckpoint(
    taskId: string,
    decision: DecisionRequest
  ): Promise<ApiResponse<DecisionResponse>> {
    // 🚨 终极不变量 1: 互斥锁防并发
    if (this.decisionLocks.get(taskId)) {
      return {
        success: false,
        error: `Decision in progress for task: ${taskId}. Please wait.`,
        timestamp: Date.now()
      };
    }

    // 获取锁
    this.decisionLocks.set(taskId, true);

    try {
      const snapshot = this.checkpointManager.getCheckpoint(taskId);
      if (!snapshot) {
        return {
          success: false,
          error: `Checkpoint not found for task: ${taskId}`,
          timestamp: Date.now()
        };
      }

      // 双重检查状态（防止重入）
      if (snapshot.status !== "pending") {
        return {
          success: false,
          error: `Checkpoint is not pending: ${snapshot.status}`,
          timestamp: Date.now()
        };
      }

      let newState: RuntimeState;
      let message: string;

      if (decision.action === "APPROVE") {
        // 批准：触发 HydrationEngine 复水并反哺回队列
        await this.checkpointManager.approve(taskId, decision.reason, decision.operator);
        newState = RuntimeState.COMPLETED;
        message = "Task approved and resumed";

        // 记录审计事件
        this.auditTrail.recordHumanDecision(
          taskId,
          decision.operator || "unknown",
          "approve",
          decision.reason
        );
      } else {
        // 拒绝：立即走向销毁
        await this.checkpointManager.reject(taskId, decision.reason || "Rejected by human", decision.operator);
        newState = RuntimeState.FAILED;
        message = "Task rejected and aborted";

        // 记录审计事件
        this.auditTrail.recordHumanDecision(
          taskId,
          decision.operator || "unknown",
          "reject",
          decision.reason
        );
      }

      return {
        success: true,
        data: {
          taskId,
          decision: decision.action,
          newState,
          message
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        timestamp: Date.now()
      };
    } finally {
      // 🚨 释放锁
      this.decisionLocks.delete(taskId);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GET /api/runtime/audit/:taskId
  // ═══════════════════════════════════════════════════════════════

  /**
   * 获取合规审计溯源
   */
  async getAudit(taskId: string): Promise<ApiResponse<AuditView>> {
    try {
      const events = this.auditTrail.getTaskTrail(taskId);
      
      if (events.length === 0) {
        return {
          success: false,
          error: `No audit records found for task: ${taskId}`,
          timestamp: Date.now()
        };
      }

      const timeRange = {
        start: Math.min(...events.map(e => e.timestamp)),
        end: Math.max(...events.map(e => e.timestamp))
      };

      return {
        success: true,
        data: {
          taskId,
          events,
          totalEvents: events.length,
          timeRange
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        timestamp: Date.now()
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GET /api/runtime/stats (附加：系统统计)
  // ═══════════════════════════════════════════════════════════════

  /**
   * 获取系统统计
   */
  async getStats(): Promise<ApiResponse<{
    tasks: { total: number; byState: Record<string, number> };
    budget: { tokens: number; cost: number; runtime: number };
    checkpoints: { total: number; pending: number; approved: number; rejected: number };
    audit: { totalEvents: number; tasksTracked: number };
  }>> {
    try {
      const contexts = this.runtime.getAllTasks();
      const byState: Record<string, number> = {};
      
      for (const ctx of contexts) {
        byState[ctx.state] = (byState[ctx.state] || 0) + 1;
      }

      const dailyState = this.budgetGuard.getDailyState();
      const checkpointStatus = this.checkpointManager.getStatus();
      const auditStats = this.auditTrail.getStats();

      return {
        success: true,
        data: {
          tasks: {
            total: contexts.length,
            byState
          },
          budget: {
            tokens: dailyState.tokens,
            cost: dailyState.cost,
            runtime: dailyState.runtime
          },
          checkpoints: checkpointStatus,
          audit: {
            totalEvents: auditStats.totalEvents,
            tasksTracked: auditStats.tasksTracked
          }
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        timestamp: Date.now()
      };
    }
  }

  /**
   * 获取审计追踪实例
   */
  getAuditTrail(): AuditTrail {
    return this.auditTrail;
  }
}

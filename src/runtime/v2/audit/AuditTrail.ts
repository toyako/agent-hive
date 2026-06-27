/**
 * Audit Trail — Phase 4
 * 
 * 结构化审计持久化
 * 
 * 将状态机的所有流转轨迹持久化为不可篡改的流水账：
 * - Events 历史
 * - Budget 消耗曲线
 * - Evaluator 判定节点日志
 * - 人工审批记录
 * 
 * 用于合规审计
 */

import * as fs from "fs";
import * as path from "path";
import { RuntimeState } from "../state-machine/RuntimeStateMachine";
import { Verdict } from "../RuntimeCore";
import { PersistenceEngine } from "../persistence/PersistenceEngine";

// 审计事件类型
export enum AuditEventType {
  // 状态流转
  STATE_TRANSITION = "state_transition",
  
  // 执行事件
  EXECUTION_START = "execution_start",
  EXECUTION_END = "execution_end",
  EXECUTION_ERROR = "execution_error",
  
  // 验证事件
  EVALUATION_START = "evaluation_start",
  EVALUATION_RESULT = "evaluation_result",
  
  // 预算事件
  BUDGET_CONSUMPTION = "budget_consumption",
  BUDGET_EXCEEDED = "budget_exceeded",
  
  // 恢复事件
  RECOVERY_ATTEMPT = "recovery_attempt",
  RECOVERY_SUCCESS = "recovery_success",
  RECOVERY_ESCALATION = "recovery_escalation",
  
  // 检查点事件
  CHECKPOINT_CREATED = "checkpoint_created",
  CHECKPOINT_APPROVED = "checkpoint_approved",
  CHECKPOINT_REJECTED = "checkpoint_rejected",
  
  // 隔离事件
  SANDBOX_CREATED = "sandbox_created",
  SANDBOX_ROLLBACK = "sandbox_rollback",
  SANDBOX_DESTROYED = "sandbox_destroyed",
  
  // 策略事件
  POLICY_CHECK = "policy_check",
  POLICY_REJECTED = "policy_rejected",
  
  // 人工操作
  HUMAN_DECISION = "human_decision",
  
  // 系统事件
  SYSTEM_START = "system_start",
  SYSTEM_SHUTDOWN = "system_shutdown",
  SYSTEM_ERROR = "system_error"
}

// 审计事件
export interface AuditEvent {
  id: string;
  type: AuditEventType;
  taskId: string;
  timestamp: number;
  
  // 状态信息
  fromState?: RuntimeState;
  toState?: RuntimeState;
  
  // 执行信息
  agentId?: string;
  duration?: number;
  
  // 验证信息
  verdict?: Verdict;
  score?: number;
  checks?: Array<{ name: string; passed: boolean; message?: string }>;
  
  // 预算信息
  tokensUsed?: number;
  costIncurred?: number;
  
  // 错误信息
  error?: string;
  stackTrace?: string;
  
  // 人工操作
  operator?: string;
  reason?: string;
  
  // 元数据
  metadata?: Record<string, any>;
  
  // 不可篡改签名
  signature?: string;
}

// 审计查询条件
export interface AuditQuery {
  taskId?: string;
  type?: AuditEventType;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

// 审计统计
export interface AuditStats {
  totalEvents: number;
  eventsByType: Map<AuditEventType, number>;
  tasksTracked: number;
  timeRange: { start: number; end: number };
}

export class AuditTrail {
  private persistence: PersistenceEngine;
  private basePath: string;
  private events: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(persistence: PersistenceEngine, basePath: string = ".agent-hive/audit") {
    this.persistence = persistence;
    this.basePath = basePath;
    this.ensureDirectory(basePath);
  }

  /**
   * 启动审计追踪
   */
  start(): void {
    console.log("[AuditTrail] Started");
    
    // 定期刷新到磁盘
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 10000); // 10秒
  }

  /**
   * 停止审计追踪
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    this.flush();
    console.log("[AuditTrail] Stopped");
  }

  /**
   * 记录审计事件
   */
  record(event: Omit<AuditEvent, "id" | "timestamp" | "signature">): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      signature: this.calculateSignature(event)
    };

    this.events.push(fullEvent);
    
    // 如果事件数量超过阈值，刷新到磁盘
    if (this.events.length > 1000) {
      this.flush();
    }

    return fullEvent;
  }

  /**
   * 记录状态流转
   */
  recordStateTransition(
    taskId: string,
    fromState: RuntimeState,
    toState: RuntimeState,
    reason?: string,
    metadata?: Record<string, any>
  ): AuditEvent {
    return this.record({
      type: AuditEventType.STATE_TRANSITION,
      taskId,
      fromState,
      toState,
      reason,
      metadata
    });
  }

  /**
   * 记录执行事件
   */
  recordExecution(
    taskId: string,
    agentId: string,
    success: boolean,
    duration: number,
    error?: string,
    metadata?: Record<string, any>
  ): AuditEvent {
    return this.record({
      type: success ? AuditEventType.EXECUTION_END : AuditEventType.EXECUTION_ERROR,
      taskId,
      agentId,
      duration,
      error,
      metadata
    });
  }

  /**
   * 记录验证事件
   */
  recordEvaluation(
    taskId: string,
    verdict: Verdict,
    score: number,
    checks: Array<{ name: string; passed: boolean; message?: string }>,
    metadata?: Record<string, any>
  ): AuditEvent {
    return this.record({
      type: AuditEventType.EVALUATION_RESULT,
      taskId,
      verdict,
      score,
      checks,
      metadata
    });
  }

  /**
   * 记录预算消耗
   */
  recordBudgetConsumption(
    taskId: string,
    tokensUsed: number,
    costIncurred: number,
    metadata?: Record<string, any>
  ): AuditEvent {
    return this.record({
      type: AuditEventType.BUDGET_CONSUMPTION,
      taskId,
      tokensUsed,
      costIncurred,
      metadata
    });
  }

  /**
   * 记录人工决策
   */
  recordHumanDecision(
    taskId: string,
    operator: string,
    decision: "approve" | "reject",
    reason?: string,
    metadata?: Record<string, any>
  ): AuditEvent {
    return this.record({
      type: AuditEventType.HUMAN_DECISION,
      taskId,
      operator,
      reason,
      metadata: { ...metadata, decision }
    });
  }

  /**
   * 查询审计事件
   */
  query(query: AuditQuery): AuditEvent[] {
    let results = [...this.events];

    if (query.taskId) {
      results = results.filter(e => e.taskId === query.taskId);
    }

    if (query.type) {
      results = results.filter(e => e.type === query.type);
    }

    if (query.startTime) {
      results = results.filter(e => e.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      results = results.filter(e => e.timestamp <= query.endTime!);
    }

    // 按时间排序
    results.sort((a, b) => a.timestamp - b.timestamp);

    // 分页
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * 获取任务的完整审计轨迹
   */
  getTaskTrail(taskId: string): AuditEvent[] {
    return this.query({ taskId });
  }

  /**
   * 获取审计统计
   */
  getStats(): AuditStats {
    const eventsByType = new Map<AuditEventType, number>();
    const tasks = new Set<string>();
    let minTimestamp = Infinity;
    let maxTimestamp = 0;

    for (const event of this.events) {
      // 按类型统计
      const count = eventsByType.get(event.type) || 0;
      eventsByType.set(event.type, count + 1);

      // 任务统计
      tasks.add(event.taskId);

      // 时间范围
      if (event.timestamp < minTimestamp) minTimestamp = event.timestamp;
      if (event.timestamp > maxTimestamp) maxTimestamp = event.timestamp;
    }

    return {
      totalEvents: this.events.length,
      eventsByType,
      tasksTracked: tasks.size,
      timeRange: { start: minTimestamp, end: maxTimestamp }
    };
  }

  /**
   * 刷新到磁盘
   */
  private flush(): void {
    if (this.events.length === 0) return;

    const filePath = path.join(this.basePath, `audit-${Date.now()}.json`);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.events, null, 2));
      this.events = [];
    } catch (error) {
      console.error("[AuditTrail] Failed to flush:", error);
    }
  }

  /**
   * 生成事件 ID
   */
  private generateEventId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 计算签名（简单实现，生产环境应使用加密签名）
   */
  private calculateSignature(event: any): string {
    const crypto = require("crypto");
    const content = JSON.stringify(event);
    return crypto.createHash("sha256").update(content).digest("hex").substr(0, 16);
  }

  /**
   * 确保目录存在
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

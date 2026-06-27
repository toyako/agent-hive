/**
 * Runtime Events — Phase 1
 * 
 * 事件系统
 */

export enum RuntimeEventType {
  // Loop 生命周期事件
  LOOP_DISCOVER = "LOOP_DISCOVER",
  LOOP_QUEUE = "LOOP_QUEUE",
  LOOP_START = "LOOP_START",
  LOOP_PLAN = "LOOP_PLAN",
  LOOP_EXECUTE = "LOOP_EXECUTE",
  LOOP_REVIEW = "LOOP_REVIEW",
  LOOP_VERIFY = "LOOP_VERIFY",
  LOOP_PASS = "LOOP_PASS",
  LOOP_REJECT = "LOOP_REJECT",
  LOOP_RETRY = "LOOP_RETRY",
  LOOP_TIMEOUT = "LOOP_TIMEOUT",
  LOOP_BUDGET_LIMIT = "LOOP_BUDGET_LIMIT",
  LOOP_CHECKPOINT = "LOOP_CHECKPOINT",
  LOOP_RESUME = "LOOP_RESUME",
  LOOP_ABORT = "LOOP_ABORT",
  LOOP_COMPLETE = "LOOP_COMPLETE",
  LOOP_FAILED = "LOOP_FAILED",
  
  // 系统事件
  SYSTEM_START = "SYSTEM_START",
  SYSTEM_STOP = "SYSTEM_STOP",
  SYSTEM_ERROR = "SYSTEM_ERROR",
  
  // 发现事件
  DISCOVERY_SOURCE_ADDED = "DISCOVERY_SOURCE_ADDED",
  DISCOVERY_SOURCE_REMOVED = "DISCOVERY_SOURCE_REMOVED",
  DISCOVERY_TASK_FOUND = "DISCOVERY_TASK_FOUND",
  
  // 调度事件
  SCHEDULER_TASK_SCHEDULED = "SCHEDULER_TASK_SCHEDULED",
  SCHEDULER_TASK_DELAYED = "SCHEDULER_TASK_DELAYED",
  SCHEDULER_TASK_CANCELLED = "SCHEDULER_TASK_CANCELLED",
  
  // 策略事件
  POLICY_CHECK_PASSED = "POLICY_CHECK_PASSED",
  POLICY_CHECK_FAILED = "POLICY_CHECK_FAILED",
  POLICY_REJECTED = "POLICY_REJECTED",
  
  // 验证事件
  EVALUATOR_STARTED = "EVALUATOR_STARTED",
  EVALUATOR_PASSED = "EVALUATOR_PASSED",
  EVALUATOR_FAILED = "EVALUATOR_FAILED",
  
  // 检查点事件
  CHECKPOINT_REQUESTED = "CHECKPOINT_REQUESTED",
  CHECKPOINT_APPROVED = "CHECKPOINT_APPROVED",
  CHECKPOINT_REJECTED = "CHECKPOINT_REJECTED",
  
  // 预算事件
  BUDGET_WARNING = "BUDGET_WARNING",
  BUDGET_EXCEEDED = "BUDGET_EXCEEDED",
  
  // 恢复事件
  RECOVERY_STARTED = "RECOVERY_STARTED",
  RECOVERY_COMPLETED = "RECOVERY_COMPLETED",
  RECOVERY_FAILED = "RECOVERY_FAILED"
}

export interface RuntimeEvent {
  type: RuntimeEventType;
  taskId: string;
  timestamp: number;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export type EventHandler = (event: RuntimeEvent) => void | Promise<void>;

export class EventBus {
  private handlers: Map<RuntimeEventType, EventHandler[]> = new Map();
  private eventHistory: RuntimeEvent[] = [];
  private maxHistorySize: number = 1000;

  on(type: RuntimeEventType, handler: EventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: RuntimeEventType, handler: EventHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  async emit(event: RuntimeEvent): Promise<void> {
    // 记录事件历史
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // 触发处理器
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Event handler error for ${event.type}:`, error);
        }
      }
    }
  }

  getEventHistory(taskId?: string, type?: RuntimeEventType): RuntimeEvent[] {
    let events = this.eventHistory;
    if (taskId) {
      events = events.filter(e => e.taskId === taskId);
    }
    if (type) {
      events = events.filter(e => e.type === type);
    }
    return events;
  }

  clearHistory(): void {
    this.eventHistory = [];
  }
}

// 全局事件总线
export const globalEventBus = new EventBus();

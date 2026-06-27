/**
 * Runtime State Machine — Phase 1
 * 
 * 管理 Runtime 生命周期状态
 * 
 * 主状态:
 * DISCOVERED → QUEUED → PLANNED → RUNNING → REVIEWING → VERIFYING → WAITING_CHECKPOINT → COMPLETED → ARCHIVED
 * 
 * 附加状态:
 * FAILED, RETRYING, CANCELLED, TIMEOUT, BUDGET_LIMIT, ABORTED
 */

export enum RuntimeState {
  // 主状态
  DISCOVERED = "DISCOVERED",
  QUEUED = "QUEUED",
  PLANNED = "PLANNED",
  RUNNING = "RUNNING",
  REVIEWING = "REVIEWING",
  VERIFYING = "VERIFYING",
  WAITING_CHECKPOINT = "WAITING_CHECKPOINT",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
  
  // 附加状态
  FAILED = "FAILED",
  RETRYING = "RETRYING",
  CANCELLED = "CANCELLED",
  TIMEOUT = "TIMEOUT",
  BUDGET_LIMIT = "BUDGET_LIMIT",
  ABORTED = "ABORTED"
}

export interface RuntimeStateTransition {
  from: RuntimeState;
  to: RuntimeState;
  event: string;
  guard?: (context: RuntimeContext) => boolean;
  action?: (context: RuntimeContext) => void;
}

export interface RuntimeContext {
  taskId: string;
  intent: string;
  state: RuntimeState;
  stateHistory: Array<{ state: RuntimeState; timestamp: number; reason?: string }>;
  metadata: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export class RuntimeStateMachine {
  private transitions: Map<string, RuntimeStateTransition[]> = new Map();
  private contexts: Map<string, RuntimeContext> = new Map();

  constructor() {
    this.registerDefaultTransitions();
  }

  private registerDefaultTransitions(): void {
    // 主状态转换
    this.addTransition(RuntimeState.DISCOVERED, RuntimeState.QUEUED, "QUEUE");
    this.addTransition(RuntimeState.QUEUED, RuntimeState.PLANNED, "PLAN");
    this.addTransition(RuntimeState.PLANNED, RuntimeState.RUNNING, "EXECUTE");
    this.addTransition(RuntimeState.RUNNING, RuntimeState.REVIEWING, "REVIEW");
    this.addTransition(RuntimeState.REVIEWING, RuntimeState.VERIFYING, "VERIFY");
    this.addTransition(RuntimeState.VERIFYING, RuntimeState.WAITING_CHECKPOINT, "WAIT_CHECKPOINT");
    this.addTransition(RuntimeState.WAITING_CHECKPOINT, RuntimeState.COMPLETED, "CHECKPOINT_PASS");
    this.addTransition(RuntimeState.COMPLETED, RuntimeState.ARCHIVED, "ARCHIVE");

    // 失败转换
    this.addTransition(RuntimeState.RUNNING, RuntimeState.FAILED, "FAIL");
    this.addTransition(RuntimeState.REVIEWING, RuntimeState.FAILED, "FAIL");
    this.addTransition(RuntimeState.VERIFYING, RuntimeState.FAILED, "FAIL");

    // 重试转换
    this.addTransition(RuntimeState.FAILED, RuntimeState.RETRYING, "RETRY");
    this.addTransition(RuntimeState.RETRYING, RuntimeState.RUNNING, "EXECUTE");

    // 取消转换
    this.addTransition(RuntimeState.QUEUED, RuntimeState.CANCELLED, "CANCEL");
    this.addTransition(RuntimeState.PLANNED, RuntimeState.CANCELLED, "CANCEL");
    this.addTransition(RuntimeState.RUNNING, RuntimeState.CANCELLED, "CANCEL");

    // 超时转换
    this.addTransition(RuntimeState.RUNNING, RuntimeState.TIMEOUT, "TIMEOUT");
    this.addTransition(RuntimeState.REVIEWING, RuntimeState.TIMEOUT, "TIMEOUT");

    // 预算限制转换
    this.addTransition(RuntimeState.RUNNING, RuntimeState.BUDGET_LIMIT, "BUDGET_EXCEEDED");
    this.addTransition(RuntimeState.REVIEWING, RuntimeState.BUDGET_LIMIT, "BUDGET_EXCEEDED");

    // 中止转换
    this.addTransition(RuntimeState.RUNNING, RuntimeState.ABORTED, "ABORT");
    this.addTransition(RuntimeState.REVIEWING, RuntimeState.ABORTED, "ABORT");
    this.addTransition(RuntimeState.VERIFYING, RuntimeState.ABORTED, "ABORT");
  }

  addTransition(from: RuntimeState, to: RuntimeState, event: string, guard?: (context: RuntimeContext) => boolean, action?: (context: RuntimeContext) => void): void {
    const key = `${from}:${event}`;
    if (!this.transitions.has(key)) {
      this.transitions.set(key, []);
    }
    this.transitions.get(key)!.push({ from, to, event, guard, action });
  }

  createContext(taskId: string, intent: string, metadata: Record<string, any> = {}): RuntimeContext {
    const now = Date.now();
    const context: RuntimeContext = {
      taskId,
      intent,
      state: RuntimeState.DISCOVERED,
      stateHistory: [{ state: RuntimeState.DISCOVERED, timestamp: now, reason: "Task discovered" }],
      metadata,
      createdAt: now,
      updatedAt: now
    };
    this.contexts.set(taskId, context);
    return context;
  }

  getContext(taskId: string): RuntimeContext | undefined {
    return this.contexts.get(taskId);
  }

  transition(taskId: string, event: string, reason?: string): RuntimeState | null {
    const context = this.contexts.get(taskId);
    if (!context) return null;

    const key = `${context.state}:${event}`;
    const transitions = this.transitions.get(key);
    if (!transitions || transitions.length === 0) return null;

    for (const t of transitions) {
      if (t.guard && !t.guard(context)) continue;

      const now = Date.now();
      context.state = t.to;
      context.stateHistory.push({ state: t.to, timestamp: now, reason });
      context.updatedAt = now;

      if (t.action) t.action(context);
      return t.to;
    }

    return null;
  }

  canTransition(taskId: string, event: string): boolean {
    const context = this.contexts.get(taskId);
    if (!context) return false;

    const key = `${context.state}:${event}`;
    const transitions = this.transitions.get(key);
    if (!transitions || transitions.length === 0) return false;

    for (const t of transitions) {
      if (t.guard && !t.guard(context)) continue;
      return true;
    }

    return false;
  }

  getState(taskId: string): RuntimeState | null {
    const context = this.contexts.get(taskId);
    return context ? context.state : null;
  }

  getStateHistory(taskId: string): Array<{ state: RuntimeState; timestamp: number; reason?: string }> {
    const context = this.contexts.get(taskId);
    return context ? context.stateHistory : [];
  }

  removeContext(taskId: string): boolean {
    return this.contexts.delete(taskId);
  }

  getAllContexts(): RuntimeContext[] {
    return Array.from(this.contexts.values());
  }

  getContextsByState(state: RuntimeState): RuntimeContext[] {
    return Array.from(this.contexts.values()).filter(ctx => ctx.state === state);
  }
}

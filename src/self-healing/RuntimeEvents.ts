/**
 * RuntimeEvents — Self-Healing Runtime Phase 2
 * 
 * 统一事件：
 * - TASK_STARTED
 * - NODE_STARTED
 * - NODE_COMPLETED
 * - NODE_FAILED
 * - NODE_RETRY
 * - NODE_REPLAN
 * - LOOP_STARTED
 * - LOOP_COMPLETED
 * - LOOP_FAILED
 * - TASK_COMPLETED
 * 
 * 全部进入 EventBus
 */

// Event Type
export type RuntimeEventType = 
  | "TASK_STARTED"
  | "NODE_STARTED"
  | "NODE_COMPLETED"
  | "NODE_FAILED"
  | "NODE_RETRY"
  | "NODE_REPLAN"
  | "LOOP_STARTED"
  | "LOOP_COMPLETED"
  | "LOOP_FAILED"
  | "TASK_COMPLETED";

// Runtime Event
export interface RuntimeEvent {
  type: RuntimeEventType;
  timestamp: number;
  executionId: string;
  nodeId?: string;
  data?: any;
}

export class RuntimeEventEmitter {
  private events: RuntimeEvent[] = [];
  private listeners: Map<RuntimeEventType, Function[]> = new Map();

  /**
   * 发送事件
   */
  emit(event: Omit<RuntimeEvent, "timestamp">): void {
    const fullEvent: RuntimeEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.events.push(fullEvent);

    // 通知监听器
    const listeners = this.listeners.get(event.type) || [];
    for (const listener of listeners) {
      listener(fullEvent);
    }
  }

  /**
   * 监听事件
   */
  on(type: RuntimeEventType, listener: (event: RuntimeEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  /**
   * 获取所有事件
   */
  getEvents(): RuntimeEvent[] {
    return [...this.events];
  }

  /**
   * 获取指定类型的事件
   */
  getEventsByType(type: RuntimeEventType): RuntimeEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * 清空事件
   */
  clear(): void {
    this.events = [];
  }
}

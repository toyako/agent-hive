/**
 * EventStore — Production Runtime Phase 3
 * 
 * 统一事件：
 * - TASK_CREATED
 * - TASK_STARTED
 * - NODE_STARTED
 * - NODE_COMPLETED
 * - NODE_FAILED
 * - NODE_RETRY
 * - NODE_REPLAN
 * - CHECKPOINT_CREATED
 * - CHECKPOINT_RESTORED
 * - ROLLBACK_STARTED
 * - ROLLBACK_COMPLETED
 * - TASK_COMPLETED
 * - TASK_FAILED
 * 
 * Runtime State 完全可以由 Event Replay 重建
 * 支持：Replay, Audit, Analytics, Debug
 */

// Event Type
export type EventType = 
  | "TASK_CREATED"
  | "TASK_STARTED"
  | "NODE_STARTED"
  | "NODE_COMPLETED"
  | "NODE_FAILED"
  | "NODE_RETRY"
  | "NODE_REPLAN"
  | "CHECKPOINT_CREATED"
  | "CHECKPOINT_RESTORED"
  | "ROLLBACK_STARTED"
  | "ROLLBACK_COMPLETED"
  | "TASK_COMPLETED"
  | "TASK_FAILED";

// Event
export interface Event {
  id: string;
  type: EventType;
  executionId: string;
  nodeId?: string;
  timestamp: number;
  data?: any;
}

export class EventStore {
  private events: Map<string, Event[]> = new Map();

  /**
   * 追加事件
   */
  append(event: Omit<Event, "id" | "timestamp">): Event {
    const fullEvent: Event = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    const events = this.events.get(event.executionId) || [];
    events.push(fullEvent);
    this.events.set(event.executionId, events);

    return fullEvent;
  }

  /**
   * 获取执行的所有事件
   */
  getEvents(executionId: string): Event[] {
    return this.events.get(executionId) || [];
  }

  /**
   * Replay 执行
   */
  replay(executionId: string): Event[] {
    return this.getEvents(executionId).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取所有事件
   */
  getAllEvents(): Event[] {
    const allEvents: Event[] = [];
    for (const events of this.events.values()) {
      allEvents.push(...events);
    }
    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取指定类型的事件
   */
  getEventsByType(type: EventType): Event[] {
    return this.getAllEvents().filter(e => e.type === type);
  }
}

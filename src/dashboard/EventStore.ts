/**
 * ObservationEvent — unified event schema for all observations.
 * All metrics must be based on event_timestamp.
 */
export interface ObservationEvent {
  event_id: string;
  task_id: string;
  event_type: "execution" | "review" | "reset" | "eval";
  event_timestamp: string;
  task_commit_timestamp?: string;
  evaluation_timestamp?: string;
  data: Record<string, unknown>;
}

export class EventStore {
  private events: ObservationEvent[] = [];

  record(event: Omit<ObservationEvent, "event_id">): ObservationEvent {
    const full: ObservationEvent = {
      ...event,
      event_id: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    };
    this.events.push(full);
    return full;
  }

  getByTask(taskId: string): ObservationEvent[] {
    return this.events.filter(e => e.task_id === taskId);
  }

  getByType(type: ObservationEvent["event_type"]): ObservationEvent[] {
    return this.events.filter(e => e.event_type === type);
  }

  getRecent(n: number): ObservationEvent[] {
    return this.events.slice(-n);
  }

  all(): ObservationEvent[] { return [...this.events]; }
  count(): number { return this.events.length; }

  /** Replay last N tasks */
  replayLastN(n: number): ObservationEvent[] {
    const recent = this.getRecent(n * 3); // ~3 events per task
    return recent;
  }

  /** Replay failure chain for a task */
  replayFailureChain(taskId: string): ObservationEvent[] {
    return this.getByTask(taskId).filter(e =>
      e.event_type === "execution" || e.event_type === "reset"
    );
  }
}

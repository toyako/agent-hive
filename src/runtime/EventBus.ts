/**
 * EventBus — append-only, immutable event store.
 * Event sourcing compatible. Supports publish/subscribe/replay.
 */
import * as fs from "fs";
import * as path from "path";

export interface Event {
  id: string;
  traceId: string;
  timestamp: number;
  type: string;
  payload: unknown;
}

export class EventBus {
  private events: Event[] = [];
  private subscribers: Map<string, ((event: Event) => void)[]> = new Map();
  private logDir: string;

  constructor(logDir?: string) {
    this.logDir = logDir || path.resolve(process.cwd(), ".agent-hive/events");
    fs.mkdirSync(this.logDir, { recursive: true });
  }

  /** Publish an event (append-only, immutable) */
  publish(event: Event): void {
    this.events.push(event);

    // Persist to file
    const logFile = path.join(this.logDir, `${event.traceId}.jsonl`);
    fs.appendFileSync(logFile, JSON.stringify(event) + "\n");

    // Notify subscribers
    const handlers = this.subscribers.get(event.type) || [];
    for (const handler of handlers) {
      handler(event);
    }

    // Also notify wildcard subscribers
    const wildcardHandlers = this.subscribers.get("*") || [];
    for (const handler of wildcardHandlers) {
      handler(event);
    }
  }

  /** Subscribe to events by type */
  subscribe(eventType: string, handler: (event: Event) => void): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }

  /** Replay all events for a trace */
  replay(traceId: string): Event[] {
    // Try memory first, then file
    const memEvents = this.events.filter(e => e.traceId === traceId);
    if (memEvents.length > 0) return memEvents;

    const logFile = path.join(this.logDir, `${traceId}.jsonl`);
    if (!fs.existsSync(logFile)) return [];

    return fs.readFileSync(logFile, "utf-8")
      .split("\n")
      .filter(l => l.trim())
      .map(l => JSON.parse(l));
  }

  /** Get all events */
  all(): Event[] {
    return [...this.events];
  }

  /** Get events by type */
  byType(type: string): Event[] {
    return this.events.filter(e => e.type === type);
  }

  /** Generate a unique event ID */
  static generateId(): string {
    return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  }
}

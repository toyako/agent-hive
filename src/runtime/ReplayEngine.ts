/**
 * ReplayEngine — replay execution traces step by step.
 */
import { EventBus, Event } from "./EventBus";

export interface ReplayStep {
  step: number;
  event: Event;
  description: string;
}

export class ReplayEngine {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /** Replay a trace and output step-by-step */
  replay(traceId: string): ReplayStep[] {
    const events = this.eventBus.replay(traceId);
    if (events.length === 0) return [];

    return events.map((event, i) => ({
      step: i + 1,
      event,
      description: this.describe(event),
    }));
  }

  /** Format a replay as human-readable text */
  format(traceId: string): string {
    const steps = this.replay(traceId);
    if (steps.length === 0) return `No events found for trace: ${traceId}`;

    const lines = [`Replay: ${traceId}`, `Steps: ${steps.length}`, ""];

    for (const step of steps) {
      const time = new Date(step.event.timestamp).toISOString().slice(11, 23);
      lines.push(`  Step ${step.step} [${time}] ${step.description}`);
    }

    return lines.join("\n");
  }

  private describe(event: Event): string {
    const p = event.payload as any;
    switch (event.type) {
      case "ExecutionStarted": return `Execute: ${p.command} ${(p.args || []).join(" ")}`;
      case "ExecutionCompiled": return `Compiled: ${p.compiled?.executable} → ${p.compiled?.platform}`;
      case "ExecutionCompleted": return `Done: exit=${p.exitCode} (${p.durationMs}ms)`;
      case "ExecutionFailed": return `FAIL: ${p.error} (exit=${p.exitCode})`;
      case "AgentReceivedTask": return `Agent ${p.agentId} received task: ${p.taskId}`;
      case "AgentPlanned": return `Agent ${p.agentId} planned: ${p.plan?.slice(0, 60)}`;
      case "AgentExecuted": return `Agent ${p.agentId} executed: exit=${p.exitCode} (${p.durationMs}ms)`;
      case "AgentCompleted": return `Agent ${p.agentId} completed: score=${p.score}`;
      case "AgentFailed": return `Agent ${p.agentId} failed: ${p.error}`;
      case "DecisionMade": return `Decision: ${p.decision} (confidence=${p.confidence})`;
      default: return `${event.type}: ${JSON.stringify(p).slice(0, 80)}`;
    }
  }
}

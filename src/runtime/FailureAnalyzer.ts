/**
 * FailureAnalyzer — automatic failure root cause analysis.
 */
import { EventBus, Event } from "./EventBus";

export interface FailureReport {
  traceId: string;
  failedStep: number;
  rootCause: string;
  command: string;
  exitCode: number;
  durationMs: number;
  error: string;
  events: Event[];
}

export class FailureAnalyzer {
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /** Analyze a failed trace */
  analyze(traceId: string): FailureReport | null {
    const events = this.eventBus.replay(traceId);
    if (events.length === 0) return null;

    // Find the first failure event
    const failEvent = events.find(e =>
      e.type === "ExecutionFailed" || e.type === "AgentFailed"
    );

    if (!failEvent) return null;

    const failIndex = events.indexOf(failEvent);
    const p = failEvent.payload as any;

    // Find the preceding execution started event
    const startEvent = events.slice(0, failIndex).reverse().find(e =>
      e.type === "ExecutionStarted" || e.type === "AgentReceivedTask"
    );

    return {
      traceId,
      failedStep: failIndex + 1,
      rootCause: this.determineRootCause(failEvent, events),
      command: p.command || p.taskId || "unknown",
      exitCode: p.exitCode || 1,
      durationMs: p.durationMs || 0,
      error: p.error || "unknown error",
      events,
    };
  }

  /** Format a failure report */
  format(traceId: string): string {
    const report = this.analyze(traceId);
    if (!report) return `No failure found for trace: ${traceId}`;

    return [
      `Failure Report: ${traceId}`,
      `  Failed Step: ${report.failedStep}`,
      `  Root Cause: ${report.rootCause}`,
      `  Command: ${report.command}`,
      `  Exit Code: ${report.exitCode}`,
      `  Duration: ${report.durationMs}ms`,
      `  Error: ${report.error}`,
      `  Total Events: ${report.events.length}`,
    ].join("\n");
  }

  private determineRootCause(failEvent: Event, allEvents: Event[]): string {
    const p = failEvent.payload as any;

    if (p.error?.includes("TIMEOUT")) return "Execution timeout";
    if (p.exitCode === 127) return "Command not found";
    if (p.exitCode === 126) return "Permission denied";
    if (p.exitCode === 137) return "Process killed (OOM or SIGKILL)";
    if (p.exitCode === 139) return "Segmentation fault";
    if (p.error?.includes("ENOTFOUND")) return "Network error";
    if (p.error?.includes("ECONNREFUSED")) return "Connection refused";
    if (p.error?.includes("validation")) return "AST validation failed";

    return `Exit code ${p.exitCode}: ${p.error || "unknown"}`;
  }
}

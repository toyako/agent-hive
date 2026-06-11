/**
 * SystemEvent — system-level events.
 */

export interface SystemEvent {
  type: "SystemStarted" | "SystemShutdown" | "TaskSubmitted" | "TaskCompleted" | "TaskFailed";
  id: string;
  traceId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

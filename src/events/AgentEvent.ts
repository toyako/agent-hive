/**
 * AgentEvent — events related to agent lifecycle.
 */

export interface AgentReceivedTask {
  type: "AgentReceivedTask";
  id: string;
  traceId: string;
  timestamp: number;
  payload: { agentId: string; taskId: string; instruction: string };
}

export interface AgentPlanned {
  type: "AgentPlanned";
  id: string;
  traceId: string;
  timestamp: number;
  payload: { agentId: string; plan: string; taskId: string };
}

export interface AgentExecuted {
  type: "AgentExecuted";
  id: string;
  traceId: string;
  timestamp: number;
  payload: { agentId: string; taskId: string; output: string; exitCode: number; durationMs: number };
}

export interface AgentCompleted {
  type: "AgentCompleted";
  id: string;
  traceId: string;
  timestamp: number;
  payload: { agentId: string; taskId: string; score: number };
}

export interface AgentFailed {
  type: "AgentFailed";
  id: string;
  traceId: string;
  timestamp: number;
  payload: { agentId: string; taskId: string; error: string };
}

export type AgentEvent = AgentReceivedTask | AgentPlanned | AgentExecuted | AgentCompleted | AgentFailed;

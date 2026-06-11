/**
 * ExecutionEvent — events related to command execution.
 */
import { CompiledCommand } from "../compiler/CommandCompiler";

export interface ExecutionStarted {
  type: "ExecutionStarted";
  id: string;
  traceId: string;
  timestamp: number;
  payload: { command: string; args: string[] };
}

export interface ExecutionCompiled {
  type: "ExecutionCompiled";
  id: string;
  traceId: string;
  timestamp: number;
  payload: { compiled: CompiledCommand };
}

export interface ExecutionCompleted {
  type: "ExecutionCompleted";
  id: string;
  traceId: string;
  timestamp: number;
  payload: { stdout: string; stderr: string; exitCode: number; durationMs: number };
}

export interface ExecutionFailed {
  type: "ExecutionFailed";
  id: string;
  traceId: string;
  timestamp: number;
  payload: { error: string; exitCode: number; durationMs: number };
}

export type ExecutionEvent = ExecutionStarted | ExecutionCompiled | ExecutionCompleted | ExecutionFailed;

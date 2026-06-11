/**
 * Agent — unified agent contract.
 */
import { AgentProfile } from "../registry/AgentProfile";

export interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: number;
  dependencies: string[];
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  agentId: string;
  success: boolean;
  output: string;
  durationMs: number;
  artifacts?: string[];
}

export interface ReviewResult {
  taskId: string;
  reviewerId: string;
  score: number;
  findings: string[];
  approved: boolean;
}

export interface JudgeResult {
  taskId: string;
  judgeId: string;
  accepted: boolean;
  score: number;
  reason: string;
}

export interface Agent {
  profile: AgentProfile;
  canHandle(task: Task): boolean;
  execute(task: Task): Promise<TaskResult>;
  review?(result: TaskResult): Promise<ReviewResult>;
}

/**
 * Worker Agent — Executor Agent
 * 
 * 职责：
 * - 执行 step
 * - 使用 tools
 * - 返回结果
 */

import { Agent } from "./registry";

export class WorkerAgent implements Agent {
  name = "worker";
  type = "executor" as const;

  async execute(input: { input: string; context: any[] }): Promise<string> {
    // 简化实现：执行任务
    return `Executed: ${input.input}\nResult: Success`;
  }
}

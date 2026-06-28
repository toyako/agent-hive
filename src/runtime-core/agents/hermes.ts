/**
 * Hermes Agent — Planner Agent
 * 
 * 职责：
 * - 分解任务
 * - 生成 execution plan
 * - input → plan steps
 */

import { Agent } from "./registry";

export class HermesAgent implements Agent {
  name = "hermes";
  type = "planner" as const;

  async execute(input: { input: string; context: any[] }): Promise<string> {
    // 简化实现：分析任务并返回计划
    return `Plan for: ${input.input}\nSteps: 1. Analyze 2. Implement 3. Test`;
  }
}

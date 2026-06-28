/**
 * Orchestrator — 核心调度器
 * 
 * 职责：
 * - 接收 task
 * - 选择 agent
 * - 生成 execution plan
 * - 调度执行
 */

import { Agent, AgentRegistry } from "./agents/registry";
import { ToolRegistry } from "./tools/registry";

// Task
export interface Task {
  id: string;
  input: string;
  timestamp: number;
}

// Plan Step
export interface PlanStep {
  agent: string;
  input: string;
  tool?: string;
}

// Plan
export interface Plan {
  steps: PlanStep[];
}

// Result
export interface Result {
  output: string;
  logs: string[];
  artifacts: string[];
}

export class Orchestrator {
  private agentRegistry: AgentRegistry;
  private toolRegistry: ToolRegistry;

  constructor(agentRegistry: AgentRegistry, toolRegistry: ToolRegistry) {
    this.agentRegistry = agentRegistry;
    this.toolRegistry = toolRegistry;
  }

  /**
   * 执行任务
   */
  async execute(task: Task): Promise<Result> {
    const logs: string[] = [];
    const artifacts: string[] = [];

    // 1. 解析意图
    logs.push(`Parsing intent: ${task.input}`);
    const intent = this.parseIntent(task.input);

    // 2. 创建执行计划
    logs.push(`Creating execution plan...`);
    const plan = this.createPlan(intent);

    // 3. 执行计划
    const results: any[] = [];
    
    for (const step of plan.steps) {
      logs.push(`Executing step: ${step.agent} - ${step.input}`);

      // 选择 agent
      const agent = this.agentRegistry.get(step.agent);
      if (!agent) {
        throw new Error(`Agent not found: ${step.agent}`);
      }

      // 执行 agent
      const output = await agent.execute({
        input: step.input,
        context: results
      });

      // 如果需要工具
      if (step.tool) {
        logs.push(`Using tool: ${step.tool}`);
        const tool = this.toolRegistry.get(step.tool);
        if (tool) {
          const toolResult = await tool.run(output);
          results.push(toolResult);
          artifacts.push(toolResult);
        }
      } else {
        results.push(output);
      }
    }

    return {
      output: results.at(-1) || "",
      logs,
      artifacts
    };
  }

  /**
   * 解析意图
   */
  private parseIntent(input: string): string {
    // 简化实现
    return input;
  }

  /**
   * 创建执行计划
   */
  private createPlan(intent: string): Plan {
    // 简化实现：根据意图创建计划
    return {
      steps: [
        { agent: "hermes", input: `Analyze: ${intent}` },
        { agent: "worker", input: `Execute: ${intent}` }
      ]
    };
  }
}

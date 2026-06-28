/**
 * Runtime Core v1 — 核心执行引擎
 * 
 * Agent Hive Runtime v1 = A CLI-based multi-agent execution orchestrator
 */

import { Orchestrator, Task } from "./orchestrator";
import { AgentRegistry } from "./agents/registry";
import { HermesAgent } from "./agents/hermes";
import { WorkerAgent } from "./agents/worker";
import { ToolRegistry } from "./tools/registry";
import { FSTool } from "./tools/fs";

export class RuntimeCore {
  private orchestrator: Orchestrator;
  private agentRegistry: AgentRegistry;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.agentRegistry = new AgentRegistry();
    this.toolRegistry = new ToolRegistry();

    // 注册 Agents
    this.agentRegistry.register(new HermesAgent());
    this.agentRegistry.register(new WorkerAgent());

    // 注册 Tools
    this.toolRegistry.register(new FSTool());

    // 创建 Orchestrator
    this.orchestrator = new Orchestrator(this.agentRegistry, this.toolRegistry);
  }

  /**
   * 执行任务
   */
  async run(task: string): Promise<any> {
    const taskObj: Task = {
      id: `task_${Date.now()}`,
      input: task,
      timestamp: Date.now()
    };

    return this.orchestrator.execute(taskObj);
  }

  /**
   * 列出所有 Agents
   */
  listAgents(): string[] {
    return this.agentRegistry.list().map(a => a.name);
  }

  /**
   * 列出所有 Tools
   */
  listTools(): string[] {
    return this.toolRegistry.list().map(t => t.name);
  }
}

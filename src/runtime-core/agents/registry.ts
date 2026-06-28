/**
 * Agent Registry — Agent 注册表
 */

// Agent 接口
export interface Agent {
  name: string;
  type: "planner" | "executor" | "tool";
  execute(input: { input: string; context: any[] }): Promise<string>;
}

export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  /**
   * 注册 Agent
   */
  register(agent: Agent): void {
    this.agents.set(agent.name, agent);
  }

  /**
   * 获取 Agent
   */
  get(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * 列出所有 Agent
   */
  list(): Agent[] {
    return Array.from(this.agents.values());
  }
}

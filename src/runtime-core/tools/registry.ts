/**
 * Tool Registry — Tool 注册表
 */

// Tool 接口
export interface Tool {
  name: string;
  run(input: any): Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * 注册 Tool
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取 Tool
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 列出所有 Tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }
}

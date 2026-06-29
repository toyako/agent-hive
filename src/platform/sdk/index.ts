/**
 * Agent Hive SDK — Platform Phase 1
 * 
 * 使用示例：
 * const hive = new AgentHive({ apiKey: "..." });
 * await hive.run({ task: "Build REST API" });
 */

// SDK Config
export interface AgentHiveConfig {
  apiKey?: string;
  baseUrl?: string;
}

// Execution Result
export interface ExecutionResult {
  success: boolean;
  executionId: string;
  output?: any;
  duration: number;
}

export class AgentHive {
  private config: AgentHiveConfig;

  constructor(config: AgentHiveConfig = {}) {
    this.config = {
      baseUrl: "http://localhost:3000",
      ...config
    };
  }

  /**
   * 执行任务
   */
  async run(options: { task: string }): Promise<ExecutionResult> {
    const response = await this.request("POST", "/executions", { task: options.task });
    return response;
  }

  /**
   * 获取运行时状态
   */
  async status(): Promise<any> {
    return this.request("GET", "/runtime/status");
  }

  /**
   * 获取事件
   */
  async events(): Promise<any> {
    return this.request("GET", "/runtime/events");
  }

  /**
   * 获取指标
   */
  async metrics(): Promise<any> {
    return this.request("GET", "/runtime/metrics");
  }

  /**
   * 发送请求
   */
  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const options: RequestInit = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return response.json();
  }
}

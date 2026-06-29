/**
 * PolicyStore — Learning Loop Module 3
 * 
 * 存储"学习后的策略"，不是配置
 * 
 * 初始默认策略：
 * - NETWORK: RETRY
 * - TOOL: SWITCH_TOOL
 * - MODEL: RETRY
 * - PLANNER: REPLAN
 */

// Execution Policy
export interface ExecutionPolicy {
  retryStrategy: {
    baseDelay: number;
    maxRetries: number;
    backoff: "linear" | "exponential";
  };
  routingRules: Record<string, string>;
  failureMappings: Record<string, "RETRY" | "REPLAN" | "SWITCH_TOOL">;
  version: number;
}

// 默认策略
const DEFAULT_POLICY: ExecutionPolicy = {
  retryStrategy: {
    baseDelay: 100,
    maxRetries: 3,
    backoff: "exponential"
  },
  routingRules: {},
  failureMappings: {
    NETWORK: "RETRY",
    TOOL: "SWITCH_TOOL",
    MODEL: "RETRY",
    PLANNER: "REPLAN"
  },
  version: 1
};

export class PolicyStore {
  private currentPolicy: ExecutionPolicy;
  private history: ExecutionPolicy[] = [];

  constructor(initialPolicy?: ExecutionPolicy) {
    this.currentPolicy = initialPolicy || { ...DEFAULT_POLICY };
    this.history.push({ ...this.currentPolicy });
  }

  /**
   * 获取当前策略
   */
  getCurrent(): ExecutionPolicy {
    return { ...this.currentPolicy };
  }

  /**
   * 更新策略
   */
  update(policy: Partial<ExecutionPolicy>): void {
    this.currentPolicy = {
      ...this.currentPolicy,
      ...policy,
      version: this.currentPolicy.version + 1
    };
    this.history.push({ ...this.currentPolicy });
  }

  /**
   * 获取策略历史
   */
  getHistory(): ExecutionPolicy[] {
    return [...this.history];
  }

  /**
   * 回滚到上一个版本
   */
  rollback(): boolean {
    if (this.history.length < 2) return false;
    
    this.history.pop();
    this.currentPolicy = { ...this.history[this.history.length - 1] };
    return true;
  }

  /**
   * 获取版本号
   */
  getVersion(): number {
    return this.currentPolicy.version;
  }
}

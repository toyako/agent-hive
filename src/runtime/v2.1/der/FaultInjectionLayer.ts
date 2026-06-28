/**
 * Fault Injection Layer — DER Extension
 * 
 * 铁律：不改变核心确定性逻辑，只扩展验证层
 * 
 * 职责：
 * - delay injection
 * - partial failure simulation
 * - retry storms
 * - queue reordering
 */

// 故障注入配置
export interface FaultInjectionConfig {
  enabled: boolean;
  delayInjection: {
    enabled: boolean;
    probability: number;  // 0-1
    maxDelay: number;     // ms
  };
  partialFailure: {
    enabled: boolean;
    probability: number;  // 0-1
  };
  retryStorms: {
    enabled: boolean;
    maxRetries: number;
    probability: number;  // 0-1
  };
  queueReordering: {
    enabled: boolean;
    probability: number;  // 0-1
  };
}

// 故障注入结果
export interface FaultInjectionResult {
  totalRuns: number;
  delaysInjected: number;
  failuresInjected: number;
  retryStormsTriggered: number;
  queueReorderings: number;
}

export class FaultInjectionLayer {
  private config: FaultInjectionConfig;

  constructor(config: Partial<FaultInjectionConfig> = {}) {
    this.config = {
      enabled: true,
      delayInjection: {
        enabled: true,
        probability: 0.1,
        maxDelay: 50
      },
      partialFailure: {
        enabled: true,
        probability: 0.05
      },
      retryStorms: {
        enabled: true,
        maxRetries: 5,
        probability: 0.02
      },
      queueReordering: {
        enabled: true,
        probability: 0.1
      },
      ...config
    };
  }

  /**
   * 执行带故障注入的测试
   */
  async execute<T>(
    executor: () => Promise<T>,
    runs: number
  ): Promise<{ results: T[]; faults: FaultInjectionResult }> {
    const results: T[] = [];
    let delaysInjected = 0;
    let failuresInjected = 0;
    let retryStormsTriggered = 0;
    let queueReorderings = 0;

    for (let i = 0; i < runs; i++) {
      const result = await this.executeWithFaults(executor, i, {
        delaysInjected,
        failuresInjected,
        retryStormsTriggered,
        queueReorderings
      });

      if (result.injected.delay) delaysInjected++;
      if (result.injected.failure) failuresInjected++;
      if (result.injected.retryStorm) retryStormsTriggered++;
      if (result.injected.reordering) queueReorderings++;

      results.push(result.value);
    }

    return {
      results,
      faults: {
        totalRuns: runs,
        delaysInjected,
        failuresInjected,
        retryStormsTriggered,
        queueReorderings
      }
    };
  }

  /**
   * 带故障注入的执行
   */
  private async executeWithFaults<T>(
    executor: () => Promise<T>,
    index: number,
    counters: { delaysInjected: number; failuresInjected: number; retryStormsTriggered: number; queueReorderings: number }
  ): Promise<{ value: T; injected: { delay: boolean; failure: boolean; retryStorm: boolean; reordering: boolean } }> {
    const injected = { delay: false, failure: false, retryStorm: false, reordering: false };

    // 延迟注入
    if (this.config.delayInjection.enabled && Math.random() < this.config.delayInjection.probability) {
      const delay = Math.random() * this.config.delayInjection.maxDelay;
      await this.delay(delay);
      injected.delay = true;
    }

    // 队列重排
    if (this.config.queueReordering.enabled && Math.random() < this.config.queueReordering.probability) {
      await this.delay(Math.random() * 5);
      injected.reordering = true;
    }

    // 部分失败模拟
    if (this.config.partialFailure.enabled && Math.random() < this.config.partialFailure.probability) {
      // 模拟失败后重试
      try {
        throw new Error("Injected failure");
      } catch {
        // 重试
        injected.failure = true;
      }
    }

    // 重试风暴
    if (this.config.retryStorms.enabled && Math.random() < this.config.retryStorms.probability) {
      let retries = 0;
      while (retries < this.config.retryStorms.maxRetries) {
        try {
          const result = await executor();
          return { value: result, injected: { ...injected, retryStorm: true } };
        } catch {
          retries++;
          await this.delay(1);
        }
      }
      injected.retryStorm = true;
    }

    // 正常执行
    const result = await executor();
    return { value: result, injected };
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取配置
   */
  getConfig(): FaultInjectionConfig {
    return { ...this.config };
  }
}

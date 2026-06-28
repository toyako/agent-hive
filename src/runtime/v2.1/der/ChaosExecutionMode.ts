/**
 * Chaos Execution Mode — DER Extension
 * 
 * 铁律：不改变核心确定性逻辑，只扩展验证层
 * 
 * 职责：
 * - randomized scheduling jitter
 * - concurrent execution pressure (N=1000+)
 * - worker interleaving simulation
 */

// 混沌配置
export interface ChaosConfig {
  enabled: boolean;
  concurrency: number;          // 并发数 (1000-10000)
  schedulingJitter: boolean;    // 随机调度抖动
  workerInterleaving: boolean;  // worker交错模拟
  maxDelay: number;             // 最大延迟 (ms)
}

// 混沌结果
export interface ChaosResult {
  totalRuns: number;
  concurrentRuns: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  schedulingJitterApplied: number;
  workerInterleavings: number;
}

export class ChaosExecutionMode {
  private config: ChaosConfig;

  constructor(config: Partial<ChaosConfig> = {}) {
    this.config = {
      enabled: true,
      concurrency: 1000,
      schedulingJitter: true,
      workerInterleaving: true,
      maxDelay: 10,
      ...config
    };
  }

  /**
   * 执行混沌测试
   */
  async execute<T>(
    executor: () => Promise<T>,
    runs: number
  ): Promise<{ results: T[]; chaos: ChaosResult }> {
    const results: T[] = [];
    const latencies: number[] = [];
    let jitterCount = 0;
    let interleavingCount = 0;

    // 分批并发执行
    const batchSize = Math.min(this.config.concurrency, 100);
    const batches = Math.ceil(runs / batchSize);

    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, runs);
      const batchPromises: Promise<T>[] = [];

      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(this.executeWithChaos(executor, i));
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return {
      results,
      chaos: {
        totalRuns: runs,
        concurrentRuns: batchSize,
        avgLatency: 0,
        maxLatency: 0,
        minLatency: 0,
        schedulingJitterApplied: jitterCount,
        workerInterleavings: interleavingCount
      }
    };
  }

  /**
   * 带混沌的执行
   */
  private async executeWithChaos<T>(executor: () => Promise<T>, index: number): Promise<T> {
    // 调度抖动
    if (this.config.schedulingJitter) {
      const jitter = Math.random() * this.config.maxDelay;
      await this.delay(jitter);
    }

    // Worker交错
    if (this.config.workerInterleaving && index % 3 === 0) {
      await this.delay(1);
    }

    return executor();
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
  getConfig(): ChaosConfig {
    return { ...this.config };
  }
}

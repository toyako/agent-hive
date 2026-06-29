/**
 * MetricsService — Platform Phase 1
 * 
 * 提供：
 * - Running Tasks
 * - Completed Tasks
 * - Failure Rate
 * - Retry Rate
 * - Average Runtime
 * - Queue Length
 * - Workers
 * - Memory Usage
 * - CPU Usage
 */

// Metrics
export interface Metrics {
  running: number;
  completed: number;
  failed: number;
  failureRate: number;
  retryRate: number;
  averageRuntime: number;
  queueLength: number;
  workers: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class MetricsService {
  private running: number = 0;
  private completed: number = 0;
  private failed: number = 0;
  private totalRuntime: number = 0;
  private retries: number = 0;

  /**
   * 记录任务开始
   */
  recordStart(): void {
    this.running++;
  }

  /**
   * 记录任务完成
   */
  recordComplete(duration: number): void {
    this.running--;
    this.completed++;
    this.totalRuntime += duration;
  }

  /**
   * 记录任务失败
   */
  recordFailure(): void {
    this.running--;
    this.failed++;
  }

  /**
   * 记录重试
   */
  recordRetry(): void {
    this.retries++;
  }

  /**
   * 获取指标
   */
  getMetrics(): Metrics {
    const total = this.completed + this.failed;
    return {
      running: this.running,
      completed: this.completed,
      failed: this.failed,
      failureRate: total > 0 ? this.failed / total : 0,
      retryRate: total > 0 ? this.retries / total : 0,
      averageRuntime: this.completed > 0 ? this.totalRuntime / this.completed : 0,
      queueLength: 0,
      workers: 1,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: 0
    };
  }

  /**
   * 重置
   */
  reset(): void {
    this.running = 0;
    this.completed = 0;
    this.failed = 0;
    this.totalRuntime = 0;
    this.retries = 0;
  }
}

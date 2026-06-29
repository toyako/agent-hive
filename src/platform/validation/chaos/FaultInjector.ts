/**
 * FaultInjector — Chaos Engineering Phase 3
 * 
 * 支持：
 * - Network Timeout
 * - API Timeout
 * - Provider Down
 * - Worker Crash
 * - Disk Full
 * - Memory Pressure
 * - Scheduler Failure
 * - Plugin Failure
 */

// Fault Type
export type FaultType = 
  | "NETWORK_TIMEOUT"
  | "API_TIMEOUT"
  | "PROVIDER_DOWN"
  | "WORKER_CRASH"
  | "DISK_FULL"
  | "MEMORY_PRESSURE"
  | "SCHEDULER_FAILURE"
  | "PLUGIN_FAILURE";

// Fault Config
export interface FaultConfig {
  type: FaultType;
  probability: number; // 0-1
  duration?: number; // ms
}

// Fault Result
export interface FaultResult {
  injected: boolean;
  type: FaultType;
  duration: number;
}

export class FaultInjector {
  private faults: FaultConfig[] = [];

  /**
   * 添加故障配置
   */
  addFault(config: FaultConfig): void {
    this.faults.push(config);
  }

  /**
   * 注入故障
   */
  async inject(): Promise<FaultResult | null> {
    for (const fault of this.faults) {
      if (Math.random() < fault.probability) {
        const duration = fault.duration || Math.random() * 1000;
        
        // 模拟故障延迟
        await this.delay(duration);

        return {
          injected: true,
          type: fault.type,
          duration
        };
      }
    }

    return null;
  }

  /**
   * 清除所有故障配置
   */
  clear(): void {
    this.faults = [];
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

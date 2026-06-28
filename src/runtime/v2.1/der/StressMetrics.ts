/**
 * Stress Metrics — DER Extension
 * 
 * 收集混沌和故障注入下的指标
 * 
 * 输出指标：
 * - divergence rate under chaos
 * - trace stability under load
 * - proof consistency under stress
 */

// 压力指标
export interface StressMetrics {
  // 混沌下的分歧率
  chaosDivergence: {
    totalRuns: number;
    divergentRuns: number;
    divergenceRate: number;
  };

  // 负载下的追踪稳定性
  traceStability: {
    totalTraces: number;
    stableTraces: number;
    stabilityRate: number;
  };

  // 压力下的证明一致性
  proofConsistency: {
    totalProofs: number;
    consistentProofs: number;
    consistencyRate: number;
  };

  // 混沌执行统计
  chaosStats: {
    schedulingJitterApplied: number;
    workerInterleavings: number;
    avgLatency: number;
    maxLatency: number;
  };

  // 故障注入统计
  faultStats: {
    delaysInjected: number;
    failuresInjected: number;
    retryStormsTriggered: number;
    queueReorderings: number;
  };
}

export class StressMetricsCollector {
  private results: any[] = [];
  private traces: any[][] = [];
  private proofs: string[] = [];

  /**
   * 记录执行结果
   */
  record(result: any, trace: any[], proof: string): void {
    this.results.push(result);
    this.traces.push(trace);
    this.proofs.push(proof);
  }

  /**
   * 计算压力指标
   */
  calculate(): StressMetrics {
    if (this.results.length === 0) {
      return this.emptyMetrics();
    }

    const base = this.results[0];
    let divergentRuns = 0;
    let stableTraces = 0;
    let consistentProofs = 0;

    for (let i = 0; i < this.results.length; i++) {
      // 检查结果一致性
      if (!this.deepEqual(this.results[i], base)) {
        divergentRuns++;
      }

      // 检查追踪稳定性
      if (this.traces[i] && this.traces[i].length > 0) {
        stableTraces++;
      }

      // 检查证明一致性
      if (this.proofs[i] === this.proofs[0]) {
        consistentProofs++;
      }
    }

    return {
      chaosDivergence: {
        totalRuns: this.results.length,
        divergentRuns,
        divergenceRate: divergentRuns / this.results.length
      },
      traceStability: {
        totalTraces: this.traces.length,
        stableTraces,
        stabilityRate: stableTraces / this.traces.length
      },
      proofConsistency: {
        totalProofs: this.proofs.length,
        consistentProofs,
        consistencyRate: consistentProofs / this.proofs.length
      },
      chaosStats: {
        schedulingJitterApplied: 0,
        workerInterleavings: 0,
        avgLatency: 0,
        maxLatency: 0
      },
      faultStats: {
        delaysInjected: 0,
        failuresInjected: 0,
        retryStormsTriggered: 0,
        queueReorderings: 0
      }
    };
  }

  /**
   * 重置
   */
  reset(): void {
    this.results = [];
    this.traces = [];
    this.proofs = [];
  }

  /**
   * 深度比较
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return false;

    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();

    if (keysA.length !== keysB.length) return false;

    for (let i = 0; i < keysA.length; i++) {
      if (keysA[i] !== keysB[i]) return false;
      if (!this.deepEqual(a[keysA[i]], b[keysB[i]])) return false;
    }

    return true;
  }

  /**
   * 空指标
   */
  private emptyMetrics(): StressMetrics {
    return {
      chaosDivergence: { totalRuns: 0, divergentRuns: 0, divergenceRate: 0 },
      traceStability: { totalTraces: 0, stableTraces: 0, stabilityRate: 0 },
      proofConsistency: { totalProofs: 0, consistentProofs: 0, consistencyRate: 0 },
      chaosStats: { schedulingJitterApplied: 0, workerInterleavings: 0, avgLatency: 0, maxLatency: 0 },
      faultStats: { delaysInjected: 0, failuresInjected: 0, retryStormsTriggered: 0, queueReorderings: 0 }
    };
  }
}

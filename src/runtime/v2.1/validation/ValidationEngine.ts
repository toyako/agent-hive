/**
 * Validation Engine — v2.1
 * 
 * Shadow Validation 核心引擎
 * 
 * 职责：
 * - 验证 Shadow 与 Runtime 的一致性
 * - 收集验证指标
 * - 生成验证报告
 */

import { ControlPlane, DualExecutionResult, ControlPlaneFlags } from "../ControlPlane";
import { ExecutionContract } from "../contract/ShadowContractLayer";
import { TraceEvent, DivergenceReport } from "../observability/ShadowObservabilityLayer";

// 验证指标
export interface ValidationMetrics {
  // 执行统计
  totalExecutions: number;
  shadowExecutions: number;
  
  // 差异率
  divergenceRate: number;
  divergentRuns: number;
  
  // Contract 稳定性
  contractStability: number;
  contractHashMatches: number;
  
  // Replay 一致性
  replayConsistency: number;
  successfulReplays: number;
  failedReplays: number;
  
  // 性能开销
  shadowLatency: number;
  avgShadowLatency: number;
  
  // 时间范围
  startTime: number;
  lastUpdateTime: number;
}

// 验证报告
export interface ValidationReport {
  timestamp: number;
  metrics: ValidationMetrics;
  cutoverReady: boolean;
  cutoverConditions: Array<{ condition: string; met: boolean; current: string; required: string }>;
  rollbackRisk: boolean;
  recommendations: string[];
}

// 验证配置
export interface ValidationConfig {
  cutoverThresholds: {
    contractStability: number;      // 100%
    replayConsistency: number;      // > 99.9%
    divergenceRate: number;         // < 1%
    shadowLatency: number;          // < 5%
    minExecutions: number;          // >= 1000
  };
  rollbackThresholds: {
    replayConsistency: number;      // < 99%
    divergenceRate: number;         // > 5%
  };
  persistMetrics: boolean;
}

export class ValidationEngine {
  private controlPlane: ControlPlane;
  private config: ValidationConfig;
  private metrics: ValidationMetrics;
  private executionHistory: Array<{
    executionId: string;
    contractHash: string;
    timestamp: number;
    diverged: boolean;
  }> = [];

  constructor(
    controlPlane: ControlPlane,
    config: Partial<ValidationConfig> = {}
  ) {
    this.controlPlane = controlPlane;
    this.config = {
      cutoverThresholds: {
        contractStability: 1.0,      // 100%
        replayConsistency: 0.999,    // > 99.9%
        divergenceRate: 0.01,        // < 1%
        shadowLatency: 0.05,         // < 5%
        minExecutions: 1000           // >= 1000
      },
      rollbackThresholds: {
        replayConsistency: 0.99,     // < 99%
        divergenceRate: 0.05          // > 5%
      },
      persistMetrics: true,
      ...config
    };

    this.metrics = this.initializeMetrics();
  }

  /**
   * 验证执行
   */
  async validateExecution(
    intent: string,
    candidates: any[],
    context: any = {}
  ): Promise<{
    result: DualExecutionResult;
    validation: {
      diverged: boolean;
      contractHash: string;
      metrics: ValidationMetrics;
    };
  }> {
    const startTime = Date.now();

    // 执行双轨模式
    const result = await this.controlPlane.processIntent(intent, candidates, context);

    // 检查是否分歧
    const diverged = result.divergence_report.length > 0;

    // 获取 Contract Hash
    const contractHash = result.v2_1_shadow.contract?.deterministicHash || "";

    // 更新指标
    this.updateMetrics(diverged, contractHash, Date.now() - startTime);

    // 记录执行历史
    this.executionHistory.push({
      executionId: result.v2_0_result?.taskId || "unknown",
      contractHash,
      timestamp: Date.now(),
      diverged
    });

    return {
      result,
      validation: {
        diverged,
        contractHash,
        metrics: { ...this.metrics }
      }
    };
  }

  /**
   * 生成验证报告
   */
  generateReport(): ValidationReport {
    const cutoverConditions = this.checkCutoverConditions();
    const cutoverReady = cutoverConditions.every(c => c.met);
    const rollbackRisk = this.checkRollbackRisk();

    return {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
      cutoverReady,
      cutoverConditions,
      rollbackRisk,
      recommendations: this.generateRecommendations(cutoverReady, rollbackRisk)
    };
  }

  /**
   * 获取指标
   */
  getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.executionHistory = [];
  }

  // ═══════════════════════════════════════════════════════════════
  // 私有方法
  // ═══════════════════════════════════════════════════════════════

  private initializeMetrics(): ValidationMetrics {
    return {
      totalExecutions: 0,
      shadowExecutions: 0,
      divergenceRate: 0,
      divergentRuns: 0,
      contractStability: 1.0,
      contractHashMatches: 0,
      replayConsistency: 1.0,
      successfulReplays: 0,
      failedReplays: 0,
      shadowLatency: 0,
      avgShadowLatency: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now()
    };
  }

  private updateMetrics(diverged: boolean, contractHash: string, latency: number): void {
    this.metrics.totalExecutions++;
    this.metrics.shadowExecutions++;
    this.metrics.lastUpdateTime = Date.now();

    if (diverged) {
      this.metrics.divergentRuns++;
    }

    // 计算差异率
    this.metrics.divergenceRate = this.metrics.divergentRuns / this.metrics.totalExecutions;

    // 检查 Contract 稳定性
    const hashMatches = this.executionHistory.filter(
      h => h.contractHash === contractHash
    ).length;
    this.metrics.contractHashMatches = hashMatches;
    this.metrics.contractStability = hashMatches / this.metrics.totalExecutions;

    // 更新延迟
    this.metrics.shadowLatency = latency;
    this.metrics.avgShadowLatency = (
      (this.metrics.avgShadowLatency * (this.metrics.totalExecutions - 1) + latency) /
      this.metrics.totalExecutions
    );
  }

  private checkCutoverConditions(): Array<{
    condition: string;
    met: boolean;
    current: string;
    required: string;
  }> {
    const { cutoverThresholds } = this.config;

    return [
      {
        condition: "Contract Stability",
        met: this.metrics.contractStability >= cutoverThresholds.contractStability,
        current: `${(this.metrics.contractStability * 100).toFixed(1)}%`,
        required: `${(cutoverThresholds.contractStability * 100).toFixed(0)}%`
      },
      {
        condition: "Replay Consistency",
        met: this.metrics.replayConsistency >= cutoverThresholds.replayConsistency,
        current: `${(this.metrics.replayConsistency * 100).toFixed(1)}%`,
        required: `> ${(cutoverThresholds.replayConsistency * 100).toFixed(1)}%`
      },
      {
        condition: "Divergence Rate",
        met: this.metrics.divergenceRate <= cutoverThresholds.divergenceRate,
        current: `${(this.metrics.divergenceRate * 100).toFixed(2)}%`,
        required: `< ${(cutoverThresholds.divergenceRate * 100).toFixed(0)}%`
      },
      {
        condition: "Shadow Latency",
        met: this.metrics.avgShadowLatency <= cutoverThresholds.shadowLatency * 1000,
        current: `${this.metrics.avgShadowLatency.toFixed(0)}ms`,
        required: `< ${(cutoverThresholds.shadowLatency * 1000).toFixed(0)}ms`
      },
      {
        condition: "Min Executions",
        met: this.metrics.totalExecutions >= cutoverThresholds.minExecutions,
        current: `${this.metrics.totalExecutions}`,
        required: `>= ${cutoverThresholds.minExecutions}`
      }
    ];
  }

  private checkRollbackRisk(): boolean {
    const { rollbackThresholds } = this.config;

    return (
      this.metrics.replayConsistency < rollbackThresholds.replayConsistency ||
      this.metrics.divergenceRate > rollbackThresholds.divergenceRate
    );
  }

  private generateRecommendations(cutoverReady: boolean, rollbackRisk: boolean): string[] {
    const recommendations: string[] = [];

    if (rollbackRisk) {
      recommendations.push("⚠️ Rollback risk detected. Consider disabling cutover.");
    }

    if (!cutoverReady) {
      if (this.metrics.totalExecutions < this.config.cutoverThresholds.minExecutions) {
        recommendations.push(`Continue validation: ${this.metrics.totalExecutions}/${this.config.cutoverThresholds.minExecutions} executions`);
      }

      if (this.metrics.divergenceRate > this.config.cutoverThresholds.divergenceRate) {
        recommendations.push(`Reduce divergence rate: ${(this.metrics.divergenceRate * 100).toFixed(2)}% > ${(this.config.cutoverThresholds.divergenceRate * 100).toFixed(0)}%`);
      }
    }

    if (cutoverReady) {
      recommendations.push("✅ All cutover conditions met. Ready for production migration.");
    }

    return recommendations;
  }
}

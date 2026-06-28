/**
 * Validation Dashboard — v2.1
 * 
 * 验证仪表板
 * 
 * 展示：
 * - Shadow Executions
 * - Successful Replays
 * - Divergence Rate
 * - Contract Stability
 * - Average Shadow Latency
 * - Replay Consistency
 */

import { ValidationEngine, ValidationMetrics, ValidationReport } from "./ValidationEngine";

// Dashboard 数据
export interface DashboardData {
  // 实时指标
  shadowExecutions: number;
  successfulReplays: number;
  divergenceRate: number;
  contractStability: number;
  avgShadowLatency: number;
  replayConsistency: number;
  
  // 状态
  cutoverReady: boolean;
  rollbackRisk: boolean;
  
  // 时间
  startTime: number;
  lastUpdateTime: number;
  uptime: number;
}

export class ValidationDashboard {
  private validationEngine: ValidationEngine;
  private startTime: number;

  constructor(validationEngine: ValidationEngine) {
    this.validationEngine = validationEngine;
    this.startTime = Date.now();
  }

  /**
   * 获取仪表板数据
   */
  getData(): DashboardData {
    const metrics = this.validationEngine.getMetrics();
    const report = this.validationEngine.generateReport();

    return {
      shadowExecutions: metrics.shadowExecutions,
      successfulReplays: metrics.successfulReplays,
      divergenceRate: metrics.divergenceRate,
      contractStability: metrics.contractStability,
      avgShadowLatency: metrics.avgShadowLatency,
      replayConsistency: metrics.replayConsistency,
      cutoverReady: report.cutoverReady,
      rollbackRisk: report.rollbackRisk,
      startTime: this.startTime,
      lastUpdateTime: metrics.lastUpdateTime,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * 生成文本报告
   */
  generateTextReport(): string {
    const data = this.getData();
    const report = this.validationEngine.generateReport();

    const lines: string[] = [
      "═══════════════════════════════════════════════════════════════",
      "          🎖️  SHADOW VALIDATION DASHBOARD  🎖️",
      "═══════════════════════════════════════════════════════════════",
      "",
      "📊 REAL-TIME METRICS",
      "───────────────────────────────────────────────────────────────",
      `  Shadow Executions:     ${data.shadowExecutions}`,
      `  Successful Replays:    ${data.successfulReplays}`,
      `  Divergence Rate:       ${(data.divergenceRate * 100).toFixed(2)}%`,
      `  Contract Stability:    ${(data.contractStability * 100).toFixed(1)}%`,
      `  Avg Shadow Latency:    ${data.avgShadowLatency.toFixed(0)}ms`,
      `  Replay Consistency:    ${(data.replayConsistency * 100).toFixed(1)}%`,
      "",
      "🚦 STATUS",
      "───────────────────────────────────────────────────────────────",
      `  Cutover Ready:         ${data.cutoverReady ? "✅ YES" : "❌ NO"}`,
      `  Rollback Risk:         ${data.rollbackRisk ? "⚠️ YES" : "✅ NO"}`,
      "",
      "⏱️ TIMING",
      "───────────────────────────────────────────────────────────────",
      `  Uptime:                ${this.formatDuration(data.uptime)}`,
      `  Last Update:           ${new Date(data.lastUpdateTime).toISOString()}`,
      "",
      "📋 CUTOVER CONDITIONS",
      "───────────────────────────────────────────────────────────────"
    ];

    for (const condition of report.cutoverConditions) {
      const status = condition.met ? "✅" : "❌";
      lines.push(`  ${status} ${condition.condition}: ${condition.current} (required: ${condition.required})`);
    }

    if (report.recommendations.length > 0) {
      lines.push("");
      lines.push("💡 RECOMMENDATIONS");
      lines.push("───────────────────────────────────────────────────────────────");
      for (const rec of report.recommendations) {
        lines.push(`  • ${rec}`);
      }
    }

    lines.push("");
    lines.push("═══════════════════════════════════════════════════════════════");

    return lines.join("\n");
  }

  /**
   * 格式化持续时间
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

/**
 * Divergence Analyzer — v2.1
 * 
 * 差异分析器
 * 
 * 职责：
 * - 检测 Shadow 与 Runtime 的差异
 * - 分类差异类型
 * - 保存差异详情
 */

import { DivergenceReport } from "../observability/ShadowObservabilityLayer";

// 差异类型
export enum DivergenceType {
  ORDER_MISMATCH = "ORDER_MISMATCH",
  PLAN_MISMATCH = "PLAN_MISMATCH",
  RECOVERY_MISMATCH = "RECOVERY_MISMATCH",
  POLICY_MISMATCH = "POLICY_MISMATCH",
  UNKNOWN = "UNKNOWN"
}

// 差异详情
export interface DivergenceDetail {
  id: string;
  type: DivergenceType;
  contractId: string;
  timestamp: number;
  
  // 差异内容
  runtimeOutput: any;
  shadowOutput: any;
  contractHash: string;
  replayResult?: any;
  
  // 分析
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string;
}

export class DivergenceAnalyzer {
  private divergences: DivergenceDetail[] = [];

  /**
   * 分析差异
   */
  analyzeDivergence(report: DivergenceReport): DivergenceDetail {
    const type = this.classifyDivergence(report);
    const severity = this.assessSeverity(type);
    const recommendation = this.generateRecommendation(type);

    const detail: DivergenceDetail = {
      id: `div-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      contractId: report.contractId,
      timestamp: report.timestamp,
      runtimeOutput: report.v2_0_state,
      shadowOutput: report.v2_1_state,
      contractHash: "",
      description: report.description,
      severity,
      recommendation
    };

    this.divergences.push(detail);
    return detail;
  }

  /**
   * 获取所有差异
   */
  getDivergences(type?: DivergenceType): DivergenceDetail[] {
    if (type) {
      return this.divergences.filter(d => d.type === type);
    }
    return [...this.divergences];
  }

  /**
   * 获取差异统计
   */
  getStats(): {
    total: number;
    byType: Record<DivergenceType, number>;
    bySeverity: Record<string, number>;
  } {
    const byType = {} as Record<DivergenceType, number>;
    const bySeverity: Record<string, number> = {};

    for (const div of this.divergences) {
      byType[div.type] = (byType[div.type] || 0) + 1;
      bySeverity[div.severity] = (bySeverity[div.severity] || 0) + 1;
    }

    return {
      total: this.divergences.length,
      byType,
      bySeverity
    };
  }

  /**
   * 清除旧差异
   */
  clearOldDivergences(maxAge: number): number {
    const cutoff = Date.now() - maxAge;
    const before = this.divergences.length;
    this.divergences = this.divergences.filter(d => d.timestamp > cutoff);
    return before - this.divergences.length;
  }

  // ═══════════════════════════════════════════════════════════════
  // 私有方法
  // ═══════════════════════════════════════════════════════════════

  private classifyDivergence(report: DivergenceReport): DivergenceType {
    const desc = report.description.toLowerCase();

    if (desc.includes("order") || desc.includes("sequence")) {
      return DivergenceType.ORDER_MISMATCH;
    }
    if (desc.includes("plan") || desc.includes("step")) {
      return DivergenceType.PLAN_MISMATCH;
    }
    if (desc.includes("recovery") || desc.includes("retry")) {
      return DivergenceType.RECOVERY_MISMATCH;
    }
    if (desc.includes("policy") || desc.includes("rule")) {
      return DivergenceType.POLICY_MISMATCH;
    }

    return DivergenceType.UNKNOWN;
  }

  private assessSeverity(type: DivergenceType): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    switch (type) {
      case DivergenceType.ORDER_MISMATCH:
        return "MEDIUM";
      case DivergenceType.PLAN_MISMATCH:
        return "HIGH";
      case DivergenceType.RECOVERY_MISMATCH:
        return "HIGH";
      case DivergenceType.POLICY_MISMATCH:
        return "CRITICAL";
      default:
        return "LOW";
    }
  }

  private generateRecommendation(type: DivergenceType): string {
    switch (type) {
      case DivergenceType.ORDER_MISMATCH:
        return "Check DAG topological sort implementation";
      case DivergenceType.PLAN_MISMATCH:
        return "Review plan normalization logic";
      case DivergenceType.RECOVERY_MISMATCH:
        return "Verify recovery strategy consistency";
      case DivergenceType.POLICY_MISMATCH:
        return "Critical: Review policy enforcement logic";
      default:
        return "Investigate divergence root cause";
    }
  }
}

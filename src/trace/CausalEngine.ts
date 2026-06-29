/**
 * Causal Engine — v5.1
 * 
 * 反向调试能力：
 * Given a failure, explain why it happened.
 * 
 * 返回：
 * - responsible layer
 * - decision path
 * - missing constraints
 * - incorrect assumptions
 * - runtime behavior
 */

import { ExecutionTrace, FailureAnalysisTrace } from "./ExecutionTraceModel";

// Causal Explanation
export interface CausalExplanation {
  responsibleLayer: string;
  decisionPath: string[];
  missingConstraints: string[];
  incorrectAssumptions: string[];
  runtimeBehavior: string;
  recommendation: string;
}

export class CausalEngine {
  /**
   * 分析失败原因
   */
  explainFailure(trace: ExecutionTrace): CausalExplanation {
    const failure = trace.failureAnalysis;

    return {
      responsibleLayer: failure.layerAttribution,
      decisionPath: this.extractDecisionPath(trace),
      missingConstraints: this.identifyMissingConstraints(trace),
      incorrectAssumptions: this.identifyIncorrectAssumptions(trace),
      runtimeBehavior: this.describeRuntimeBehavior(trace),
      recommendation: this.generateRecommendation(trace)
    };
  }

  /**
   * 提取决策路径
   */
  private extractDecisionPath(trace: ExecutionTrace): string[] {
    const path: string[] = [];

    if (trace.input.normalized) {
      path.push(`Input: ${trace.input.raw.substring(0, 50)}...`);
    }
    if (trace.intent.parsedIntent) {
      path.push(`Intent: ${JSON.stringify(trace.intent.parsedIntent).substring(0, 50)}...`);
    }
    if (trace.architecture.selectedArchitecture) {
      path.push(`Architecture: ${JSON.stringify(trace.architecture.selectedArchitecture).substring(0, 50)}...`);
    }

    return path;
  }

  /**
   * 识别缺失约束
   */
  private identifyMissingConstraints(trace: ExecutionTrace): string[] {
    const missing: string[] = [];

    if (trace.governance.violations.length > 0) {
      for (const violation of trace.governance.violations) {
        missing.push(`Governance violation: ${violation}`);
      }
    }

    if (trace.failureAnalysis.layerAttribution === "Architecture Reasoning") {
      missing.push("Missing scale constraint validation");
    }

    return missing;
  }

  /**
   * 识别错误假设
   */
  private identifyIncorrectAssumptions(trace: ExecutionTrace): string[] {
    const assumptions: string[] = [];

    if (trace.failureAnalysis.failureType === "NETWORK") {
      assumptions.push("Assumed network reliability");
    }
    if (trace.failureAnalysis.failureType === "TIMEOUT") {
      assumptions.push("Assumed response time within bounds");
    }

    return assumptions;
  }

  /**
   * 描述运行时行为
   */
  private describeRuntimeBehavior(trace: ExecutionTrace): string {
    const nodeExecs = trace.runtime.nodeExecutions;
    const failedNodes = nodeExecs.filter(n => n.status === "failed");
    const retriedNodes = nodeExecs.filter(n => n.retryCount > 0);

    return `Executed ${nodeExecs.length} nodes, ${failedNodes.length} failed, ${retriedNodes.length} retried`;
  }

  /**
   * 生成建议
   */
  private generateRecommendation(trace: ExecutionTrace): string {
    const layer = trace.failureAnalysis.layerAttribution;

    switch (layer) {
      case "Runtime":
        return "Add retry policy or circuit breaker";
      case "Architecture Reasoning":
        return "Review architecture constraints";
      case "Planning":
        return "Adjust sprint scope or dependencies";
      case "Governance":
        return "Fix governance violations before execution";
      default:
        return "Review layer input/output consistency";
    }
  }

  /**
   * 跨层一致性验证
   */
  validateConsistency(trace: ExecutionTrace): { consistent: boolean; mismatches: string[] } {
    const mismatches: string[] = [];

    // Intent vs Product
    if (trace.intent.parsedIntent && trace.product.requirements) {
      // 简化检查
    }

    // Architecture vs Runtime
    if (trace.architecture.selectedArchitecture && trace.runtime.dag) {
      // 简化检查
    }

    // Planning vs Execution
    if (trace.planning.milestones.length > 0 && trace.runtime.nodeExecutions.length === 0) {
      mismatches.push("Planning defined but no execution occurred");
    }

    // Governance vs Runtime
    if (trace.governance.violations.length > 0 && trace.finalResult.success) {
      mismatches.push("Governance violations exist but execution succeeded");
    }

    return {
      consistent: mismatches.length === 0,
      mismatches
    };
  }
}

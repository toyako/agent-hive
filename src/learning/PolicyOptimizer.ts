/**
 * PolicyOptimizer — Learning Loop Module 4
 * 
 * 根据 Insight 更新 Policy
 * 
 * 更新规则：
 * 1. TOOL failure 高频 → increase retry count → enable tool fallback
 * 2. NETWORK failure → increase backoff multiplier
 * 3. bottleneck node repeatedly appears → mark routing preference away
 * 4. low recovery effectiveness → reduce retry attempts → switch to REPLAN
 */

import { ExecutionInsight } from "./InsightEngine";
import { ExecutionPolicy, PolicyStore } from "./PolicyStore";

// Safety Guard
const MIN_CONFIDENCE = 0.6;

export class PolicyOptimizer {
  private policyStore: PolicyStore;

  constructor(policyStore: PolicyStore) {
    this.policyStore = policyStore;
  }

  /**
   * 根据 insight 优化策略
   */
  optimize(insight: ExecutionInsight): boolean {
    // Safety Guard: 检查置信度
    if (insight.confidence < MIN_CONFIDENCE) {
      return false;
    }

    const current = this.policyStore.getCurrent();
    const updates: Partial<ExecutionPolicy> = {};

    // 规则 1: TOOL failure 高频 → increase retry count
    if (insight.failureType === "TOOL" && insight.bottleneckScore > 0.5) {
      updates.retryStrategy = {
        ...current.retryStrategy,
        maxRetries: Math.min(current.retryStrategy.maxRetries + 1, 5)
      };
      updates.failureMappings = {
        ...current.failureMappings,
        TOOL: "SWITCH_TOOL"
      };
    }

    // 规则 2: NETWORK failure → increase backoff
    if (insight.failureType === "NETWORK") {
      updates.retryStrategy = {
        ...current.retryStrategy,
        backoff: "exponential"
      };
    }

    // 规则 3: bottleneck node → routing preference
    if (insight.criticalNode && insight.bottleneckScore > 0.7) {
      updates.routingRules = {
        ...current.routingRules,
        [insight.criticalNode]: "AVOID"
      };
    }

    // 规则 4: low recovery effectiveness → switch to REPLAN
    if (insight.retryEffectiveness < 0.5) {
      updates.retryStrategy = {
        ...current.retryStrategy,
        maxRetries: Math.max(current.retryStrategy.maxRetries - 1, 1)
      };
      if (insight.failureType !== "UNKNOWN") {
        updates.failureMappings = {
          ...current.failureMappings,
          [insight.failureType]: "REPLAN"
        };
      }
    }

    // 应用更新
    if (Object.keys(updates).length > 0) {
      this.policyStore.update(updates);
      return true;
    }

    return false;
  }

  /**
   * 检测振荡（policy flip）
   */
  detectOscillation(): boolean {
    const history = this.policyStore.getHistory();
    if (history.length < 3) return false;

    const recent = history.slice(-3);
    const versions = recent.map(p => p.version);
    
    // 简单振荡检测：版本号跳跃
    return versions[2] - versions[0] > 2;
  }
}

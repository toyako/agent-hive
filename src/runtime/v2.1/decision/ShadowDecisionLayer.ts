/**
 * Shadow Decision Layer — v2.1
 * 
 * 影子仲裁系统
 * 
 * 职责：
 * - 接收 Intent
 * - 生成 Candidate Plans（不影响执行）
 * - 执行 arbitration scoring
 * - 输出 shadow decision
 * 
 * 规则：
 * ❌ 不允许触发 execution
 * ❌ 不允许影响 queue
 * ✔ 只做计算 + trace
 */

import { Plan } from "../contract/ShadowContractLayer";

// Shadow Decision
export interface ShadowDecision {
  decisionId: string;
  candidates: Plan[];
  selectedPlan: Plan;
  scoreMap: Record<string, number>;
  rationale: string;
  timestamp: number;
}

// 仲裁配置
export interface ArbitrationConfig {
  weights: {
    cost: number;
    risk: number;
    confidence: number;
    policyWeight: number;
  };
  topK: number;
}

export class ShadowDecisionLayer {
  private config: ArbitrationConfig;

  constructor(config: Partial<ArbitrationConfig> = {}) {
    this.config = {
      weights: {
        cost: 0.3,
        risk: 0.2,
        confidence: 0.3,
        policyWeight: 0.2
      },
      topK: 3,
      ...config
    };
  }

  /**
   * 生成 Shadow Decision
   * 
   * 不影响 v2.0 执行
   */
  async arbitrate(
    intent: string,
    candidates: Plan[],
    context: {
      policyScore?: number;
      budgetRemaining?: number;
    } = {}
  ): Promise<ShadowDecision> {
    // 计算每个 candidate 的分数
    const scoreMap: Record<string, number> = {};
    
    for (const candidate of candidates) {
      const score = this.scoreCandidate(candidate, context);
      scoreMap[candidate.planId] = score;
    }

    // 选择最高分
    const sortedCandidates = [...candidates].sort(
      (a, b) => (scoreMap[b.planId] || 0) - (scoreMap[a.planId] || 0)
    );

    const selectedPlan = sortedCandidates[0];
    const topK = sortedCandidates.slice(0, this.config.topK);

    // 生成 rationale
    const rationale = this.generateRationale(selectedPlan, scoreMap, topK);

    return {
      decisionId: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      candidates: topK,
      selectedPlan,
      scoreMap,
      rationale,
      timestamp: Date.now()
    };
  }

  /**
   * 评分函数
   * 
   * score = f(cost, risk, confidence, policyWeight)
   */
  private scoreCandidate(
    plan: Plan,
    context: {
      policyScore?: number;
      budgetRemaining?: number;
    }
  ): number {
    const { weights } = this.config;

    // 成本分（越低越好）
    const costScore = context.budgetRemaining 
      ? Math.min(1, context.budgetRemaining / 100) 
      : 0.5;

    // 风险分（步骤越少风险越低）
    const riskScore = Math.max(0, 1 - (plan.steps.length / 10));

    // 置信度（依赖越少越确定）
    const confidenceScore = Math.max(0, 1 - (plan.dependencies.length / 10));

    // 策略分
    const policyScore = context.policyScore || 0.5;

    return (
      costScore * weights.cost +
      riskScore * weights.risk +
      confidenceScore * weights.confidence +
      policyScore * weights.policyWeight
    );
  }

  /**
   * 生成决策理由
   */
  private generateRationale(
    selected: Plan,
    scoreMap: Record<string, number>,
    topK: Plan[]
  ): string {
    const selectedScore = scoreMap[selected.planId] || 0;
    const reasons: string[] = [];

    reasons.push(`Selected plan ${selected.planId} with score ${selectedScore.toFixed(2)}`);
    reasons.push(`Steps: ${selected.steps.length}, Dependencies: ${selected.dependencies.length}`);

    if (topK.length > 1) {
      const alternatives = topK.slice(1).map(p => 
        `${p.planId} (${(scoreMap[p.planId] || 0).toFixed(2)})`
      );
      reasons.push(`Alternatives: ${alternatives.join(", ")}`);
    }

    return reasons.join(". ");
  }

  /**
   * 获取配置
   */
  getConfig(): ArbitrationConfig {
    return { ...this.config };
  }
}

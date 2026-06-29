/**
 * Decision Engine — Architecture Reasoning Layer 6
 * 
 * 输出必须可审计
 */

import { ArchitectureCandidate } from "./ArchitectureCandidateGenerator";
import { TradeoffAnalysis } from "./TradeoffReasoningEngine";
import { FailureSimulation } from "./FailureSimulationEngine";

// Architecture Decision
export interface ArchitectureDecision {
  selected: string;
  confidence: number;
  reasoningChain: string[];
  rejectedCandidates: {
    type: string;
    reasonRejected: string;
  }[];
  constraintConflicts: string[];
}

export class DecisionEngine {
  /**
   * 做出架构决策
   */
  decide(
    candidates: ArchitectureCandidate[],
    tradeoffs: Map<string, TradeoffAnalysis>,
    simulations: Map<string, FailureSimulation>
  ): ArchitectureDecision {
    if (candidates.length === 0) {
      throw new Error("No candidates to decide from");
    }

    // 选择得分最高的候选
    const selected = candidates[0];
    
    // 计算置信度
    const confidence = this.calculateConfidence(selected, candidates);

    // 生成推理链
    const reasoningChain = this.generateReasoningChain(selected, tradeoffs, simulations);

    // 记录被拒绝的候选
    const rejectedCandidates = candidates.slice(1).map(c => ({
      type: c.type,
      reasonRejected: this.getRejectionReason(c, selected)
    }));

    return {
      selected: selected.type,
      confidence,
      reasoningChain,
      rejectedCandidates,
      constraintConflicts: []
    };
  }

  private calculateConfidence(
    selected: ArchitectureCandidate,
    allCandidates: ArchitectureCandidate[]
  ): number {
    if (allCandidates.length === 1) return 1.0;

    const secondBest = allCandidates[1];
    const scoreDiff = selected.score - secondBest.score;
    
    // 分数差距越大，置信度越高
    return Math.min(1.0, 0.5 + scoreDiff * 2);
  }

  private generateReasoningChain(
    candidate: ArchitectureCandidate,
    tradeoffs: Map<string, TradeoffAnalysis>,
    simulations: Map<string, FailureSimulation>
  ): string[] {
    const chain: string[] = [];
    const [pattern, db, backend] = candidate.type.split("+");

    chain.push(`Selected ${pattern} architecture with ${db} and ${backend}`);
    chain.push(`Score: ${candidate.score.toFixed(2)}`);

    const tradeoff = tradeoffs.get(candidate.type);
    if (tradeoff) {
      chain.push(`Pros: ${tradeoff.pros.join(", ")}`);
      chain.push(`Risks: ${tradeoff.risks.join(", ")}`);
    }

    const simulation = simulations.get(candidate.type);
    if (simulation) {
      chain.push(`Bottlenecks: ${simulation.bottlenecks.join(", ")}`);
    }

    return chain;
  }

  private getRejectionReason(candidate: ArchitectureCandidate, selected: ArchitectureCandidate): string {
    const scoreDiff = selected.score - candidate.score;
    return `Lower score (${candidate.score.toFixed(2)} vs ${selected.score.toFixed(2)}), diff: ${scoreDiff.toFixed(2)}`;
  }
}

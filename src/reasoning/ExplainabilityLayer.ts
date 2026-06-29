/**
 * Explainability Layer — Architecture Reasoning Layer 7
 * 
 * 必须输出：
 * - WHY this architecture
 * - WHY not others
 * - WHAT will break first
 * - WHEN system fails
 */

import { ArchitectureDecision } from "./DecisionEngine";
import { TradeoffAnalysis } from "./TradeoffReasoningEngine";
import { FailureSimulation } from "./FailureSimulationEngine";

// Architecture Explanation
export interface ArchitectureExplanation {
  whyThis: string;
  whyNotOthers: string[];
  whatBreaksFirst: string;
  whenSystemFails: string;
}

export class ExplainabilityLayer {
  /**
   * 生成解释
   */
  explain(
    decision: ArchitectureDecision,
    tradeoff?: TradeoffAnalysis,
    simulation?: FailureSimulation
  ): ArchitectureExplanation {
    return {
      whyThis: this.generateWhyThis(decision, tradeoff),
      whyNotOthers: this.generateWhyNotOthers(decision),
      whatBreaksFirst: this.generateWhatBreaksFirst(simulation),
      whenSystemFails: this.generateWhenSystemFails(simulation)
    };
  }

  private generateWhyThis(decision: ArchitectureDecision, tradeoff?: TradeoffAnalysis): string {
    const reasons: string[] = [];
    
    reasons.push(`Selected ${decision.selected}`);
    reasons.push(`Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
    
    if (tradeoff) {
      reasons.push(`Key advantages: ${tradeoff.pros.slice(0, 2).join(", ")}`);
    }

    return reasons.join(". ");
  }

  private generateWhyNotOthers(decision: ArchitectureDecision): string[] {
    return decision.rejectedCandidates.map(c => 
      `${c.type}: ${c.reasonRejected}`
    );
  }

  private generateWhatBreaksFirst(simulation?: FailureSimulation): string {
    if (!simulation || simulation.bottlenecks.length === 0) {
      return "Unknown - no simulation data";
    }
    return simulation.bottlenecks[0];
  }

  private generateWhenSystemFails(simulation?: FailureSimulation): string {
    if (!simulation || simulation.saturationPoints.length === 0) {
      return "Unknown - no saturation data";
    }
    return `System saturates at: ${simulation.saturationPoints.join(", ")}`;
  }
}

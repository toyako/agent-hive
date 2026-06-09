import { CapabilityDiscovery, CapabilityReport } from "./CapabilityDiscovery";
import { RuntimeScoreManager } from "./RuntimeScoreManager";
import { AgentRegistry } from "../broker/AgentRegistry";

export interface SelectionRequest {
  taskType: string;  // "coding" | "review" | "planning" | etc.
  preferred?: string;  // Optional preferred runtime id
  exclude?: string[];  // Runtimes to exclude
}

export interface SelectionResult {
  runtimeId: string;
  score: number;
  reason: string;
  alternatives: { runtimeId: string; score: number }[];
}

// Weights for scoring
const DEFAULT_WEIGHTS = {
  capability: 0.4,    // Does it have the capability?
  successRate: 0.25,  // Historical success rate
  latency: 0.15,      // Speed
  reviewScore: 0.2,   // Quality of output
};

export class RuntimeSelector {
  private capabilityDiscovery: CapabilityDiscovery;
  private scoreManager: RuntimeScoreManager;
  private registry: AgentRegistry;

  constructor(
    capabilityDiscovery: CapabilityDiscovery,
    scoreManager: RuntimeScoreManager,
    registry: AgentRegistry
  ) {
    this.capabilityDiscovery = capabilityDiscovery;
    this.scoreManager = scoreManager;
    this.registry = registry;
  }

  /**
   * Select the best runtime for a given task type.
   */
  select(request: SelectionRequest): SelectionResult | null {
    const { taskType, preferred, exclude = [] } = request;

    // If preferred is specified and available, use it
    if (preferred) {
      const entry = this.registry.getEntry(preferred);
      if (entry && entry.healthy && !exclude.includes(preferred)) {
        return {
          runtimeId: preferred,
          score: 1.0,
          reason: `Preferred runtime: ${preferred}`,
          alternatives: [],
        };
      }
    }

    // Find all runtimes with the required capability
    const candidates = this.capabilityDiscovery
      .findByCapability(taskType)
      .filter(r => {
        const entry = this.registry.getEntry(r.runtimeId);
        return entry && entry.healthy && !exclude.includes(r.runtimeId);
      });

    if (candidates.length === 0) {
      // Fallback: try any healthy runtime
      const fallback = this.registry.healthy().filter(e => !exclude.includes(e.name));
      if (fallback.length === 0) return null;

      return {
        runtimeId: fallback[0].name,
        score: 0.3,
        reason: `No runtime with capability '${taskType}' found, using fallback: ${fallback[0].name}`,
        alternatives: [],
      };
    }

    // Score each candidate
    const scored = candidates.map(c => ({
      runtimeId: c.runtimeId,
      score: this.calculateScore(c, taskType),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return {
      runtimeId: scored[0].runtimeId,
      score: scored[0].score,
      reason: `Best runtime for '${taskType}' based on capability + performance`,
      alternatives: scored.slice(1),
    };
  }

  /**
   * Calculate composite score for a runtime candidate.
   */
  private calculateScore(report: CapabilityReport, taskType: string): number {
    const w = DEFAULT_WEIGHTS;

    // Capability match (has the capability)
    const capabilityScore = report.capabilities.includes(taskType) ? 1.0 : 0.0;

    // Confidence from capability discovery
    const confidenceScore = report.confidence;

    // Performance score from RuntimeScoreManager
    const performanceScore = this.scoreManager.getScore(report.runtimeId);

    return (
      w.capability * capabilityScore * confidenceScore +
      (w.successRate + w.latency + w.reviewScore) * performanceScore
    );
  }
}

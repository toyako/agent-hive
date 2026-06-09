/**
 * AutoTopologySelector
 *
 * Selects the best executor, reviewer, and graph topology
 * based on task intent and available runtimes.
 */

import { TaskIntent } from "./TaskIntentClassifier";
import { AgentAdapter } from "../types";

export interface TopologySelection {
  executor: string;
  reviewer: string;
  topology: "simpleChain" | "planExecuteReview" | "peerReview";
  reason: string;
}

// Capability requirements per intent
const INTENT_REQUIREMENTS: Record<TaskIntent, {
  executorCaps: string[];
  reviewerCaps: string[];
  topology: "simpleChain" | "planExecuteReview" | "peerReview";
}> = {
  coding: {
    executorCaps: ["coding"],
    reviewerCaps: ["review"],
    topology: "simpleChain",
  },
  review: {
    executorCaps: ["review"],
    reviewerCaps: ["review", "security-scan"],
    topology: "peerReview",
  },
  planning: {
    executorCaps: ["planning"],
    reviewerCaps: ["review"],
    topology: "planExecuteReview",
  },
  refactor: {
    executorCaps: ["refactor", "coding"],
    reviewerCaps: ["review"],
    topology: "simpleChain",
  },
  architecture: {
    executorCaps: ["architecture", "coding"],
    reviewerCaps: ["review", "architecture"],
    topology: "planExecuteReview",
  },
  research: {
    executorCaps: ["research", "planning"],
    reviewerCaps: ["review"],
    topology: "planExecuteReview",
  },
};

export class AutoTopologySelector {
  private adapters: AgentAdapter[];

  constructor(adapters: AgentAdapter[]) {
    this.adapters = adapters;
  }

  /**
   * Select the best topology for a given task intent.
   */
  select(intent: TaskIntent): TopologySelection {
    const req = INTENT_REQUIREMENTS[intent];

    // Find best executor: adapter whose capabilities best match executorCaps
    const executor = this.findBest(req.executorCaps, [req.reviewerCaps[0]]);

    // Find best reviewer: different from executor, matches reviewerCaps
    const reviewer = this.findBest(req.reviewerCaps, [], executor?.name);

    if (!executor || !reviewer) {
      // Fallback: use first two available adapters
      const available = this.adapters.filter(a => a.detect !== undefined);
      return {
        executor: available[0]?.name || "codex",
        reviewer: available[1]?.name || "claude",
        topology: "simpleChain",
        reason: "Fallback: using available runtimes",
      };
    }

    const reason = `Intent="${intent}" → executor=${executor.name}(${this.matchScore(executor, req.executorCaps)}) reviewer=${reviewer.name}(${this.matchScore(reviewer, req.reviewerCaps)}) topology=${req.topology}`;

    return {
      executor: executor.name,
      reviewer: reviewer.name,
      topology: req.topology,
      reason,
    };
  }

  /**
   * Find the adapter with the best capability match.
   * excludeName: skip this adapter (to avoid same adapter as executor+reviewer)
   * preferNot: capabilities to deprioritize (to differentiate executor vs reviewer)
   */
  private findBest(
    requiredCaps: string[],
    preferNot: string[] = [],
    excludeName?: string
  ): AgentAdapter | null {
    let best: AgentAdapter | null = null;
    let bestScore = -1;

    for (const adapter of this.adapters) {
      if (excludeName && adapter.name === excludeName) continue;

      let score = 0;
      for (const cap of requiredCaps) {
        if (adapter.capabilities.includes(cap)) score += 2;
      }
      // Deprioritize if it has capabilities we'd rather not use for this role
      for (const cap of preferNot) {
        if (adapter.capabilities.includes(cap)) score -= 1;
      }

      if (score > bestScore) {
        bestScore = score;
        best = adapter;
      }
    }

    return best;
  }

  private matchScore(adapter: AgentAdapter, caps: string[]): number {
    let score = 0;
    for (const cap of caps) {
      if (adapter.capabilities.includes(cap)) score++;
    }
    return score;
  }
}

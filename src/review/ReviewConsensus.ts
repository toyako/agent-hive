import { ReviewResult, Task, AgentAdapter } from "../types";

/**
 * ReviewConsensus
 *
 * Multi-reviewer consensus mechanism for v2.0.
 * Supports three consensus strategies and three disagreement resolution methods.
 */

export interface ReviewConsensusConfig {
  minReviewers: number;  // default 1
  consensusStrategy: "unanimous" | "majority" | "best-score";
  onDisagreement: "escalate" | "third-reviewer" | "highest-score";
}

export interface ReviewVote {
  reviewerId: string;
  result: ReviewResult;
  timestamp: number;
}

export type ConsensusDecision = "PASS" | "FAIL" | "DISAGREEMENT";

export interface ConsensusResult {
  decision: ConsensusDecision;
  finalDecision: "PASS" | "FAIL";  // resolved decision
  votes: ReviewVote[];
  strategy: string;
  resolution?: string;  // how disagreement was resolved
  score: number;  // aggregated score
  issues: string[];  // aggregated issues
}

const DEFAULT_CONFIG: ReviewConsensusConfig = {
  minReviewers: 1,
  consensusStrategy: "majority",
  onDisagreement: "highest-score",
};

export class ReviewConsensus {
  private config: ReviewConsensusConfig;
  private thirdPartyReviewer?: AgentAdapter;

  constructor(config?: Partial<ReviewConsensusConfig>, thirdPartyReviewer?: AgentAdapter) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.thirdPartyReviewer = thirdPartyReviewer;
  }

  /**
   * Collect reviews from multiple reviewers concurrently.
   * Returns votes once minReviewers have responded.
   */
  async collectReviews(
    task: Task,
    reviewers: AgentAdapter[]
  ): Promise<ReviewVote[]> {
    if (reviewers.length < this.config.minReviewers) {
      throw new Error(
        `Need at least ${this.config.minReviewers} reviewers, got ${reviewers.length}`
      );
    }

    const reviewPromises = reviewers.map(async (reviewer) => {
      if (!reviewer.review) {
        throw new Error(`${reviewer.name} has no review capability`);
      }
      const result = await reviewer.review(task);
      return {
        reviewerId: reviewer.name,
        result,
        timestamp: Date.now(),
      } as ReviewVote;
    });

    // Wait for all reviewers
    const votes = await Promise.all(reviewPromises);
    return votes;
  }

  /**
   * Resolve consensus from collected votes.
   * Returns ConsensusResult with final decision.
   */
  resolve(votes: ReviewVote[]): ConsensusResult {
    if (votes.length === 0) {
      return {
        decision: "FAIL",
        finalDecision: "FAIL",
        votes: [],
        strategy: this.config.consensusStrategy,
        resolution: "no-votes",
        score: 0,
        issues: ["No reviews collected"],
      };
    }

    const passVotes = votes.filter((v) => v.result.decision === "PASS");
    const failVotes = votes.filter((v) => v.result.decision === "FAIL");
    const passRatio = passVotes.length / votes.length;

    // Apply consensus strategy
    let rawDecision: ConsensusDecision;
    let resolution: string | undefined;

    switch (this.config.consensusStrategy) {
      case "unanimous":
        rawDecision = passVotes.length === votes.length ? "PASS" : "FAIL";
        break;

      case "majority":
        if (passRatio > 0.5) {
          rawDecision = "PASS";
        } else if (passRatio < 0.5) {
          rawDecision = "FAIL";
        } else {
          rawDecision = "DISAGREEMENT";  // exact tie
        }
        break;

      case "best-score":
        const bestVote = [...votes].sort(
          (a, b) => b.result.score - a.result.score
        )[0];
        rawDecision = bestVote.result.score >= 60 ? "PASS" : "FAIL";
        resolution = `best-score: ${bestVote.result.score} from ${bestVote.reviewerId}`;
        break;

      default:
        rawDecision = "FAIL";
    }

    // For majority/unanimous: if strategy already gave a clear answer, use it directly
    // Only use disagreement resolution when strategy says DISAGREEMENT
    let finalDecision: "PASS" | "FAIL";
    if (rawDecision === "DISAGREEMENT") {
      // Strategy couldn't decide — use disagreement resolution
      const resolved = this.resolveDisagreement(votes, passVotes, failVotes);
      finalDecision = resolved.decision;
      resolution = resolved.resolution;
    } else {
      // Strategy gave a clear answer (PASS or FAIL) — honor it
      finalDecision = rawDecision === "PASS" ? "PASS" : "FAIL";
    }

    // Aggregate score and issues
    const avgScore =
      votes.reduce((sum, v) => sum + v.result.score, 0) / votes.length;
    const allIssues = [
      ...new Set(votes.flatMap((v) => v.result.issues)),
    ];

    return {
      decision: rawDecision,
      finalDecision,
      votes,
      strategy: this.config.consensusStrategy,
      resolution,
      score: Math.round(avgScore),
      issues: allIssues,
    };
  }

  /**
   * Resolve a disagreement based on onDisagreement config.
   */
  private resolveDisagreement(
    votes: ReviewVote[],
    passVotes: ReviewVote[],
    failVotes: ReviewVote[]
  ): { decision: "PASS" | "FAIL"; resolution: string } {
    switch (this.config.onDisagreement) {
      case "highest-score": {
        const bestVote = [...votes].sort(
          (a, b) => b.result.score - a.result.score
        )[0];
        return {
          decision: bestVote.result.decision,
          resolution: `highest-score: ${bestVote.result.score} from ${bestVote.reviewerId}`,
        };
      }

      case "third-reviewer": {
        if (this.thirdPartyReviewer?.review) {
          // Note: third-party review is async, but resolve is sync.
          // For sync resolution, fall back to highest-score.
          // Real third-party review should be done via collectReviews with an extra reviewer.
          const bestVote = [...votes].sort(
            (a, b) => b.result.score - a.result.score
          )[0];
          return {
            decision: bestVote.result.decision,
            resolution: `third-reviewer-fallback (highest-score): ${bestVote.result.score} from ${bestVote.reviewerId}`,
          };
        }
        // No third-party available, fall back to highest-score
        const best = [...votes].sort(
          (a, b) => b.result.score - a.result.score
        )[0];
        return {
          decision: best.result.decision,
          resolution: `no-third-reviewer (highest-score): ${best.result.score} from ${best.reviewerId}`,
        };
      }

      case "escalate": {
        // Signal escalation - caller should handle
        const bestVote = [...votes].sort(
          (a, b) => b.result.score - a.result.score
        )[0];
        return {
          decision: bestVote.result.decision,
          resolution: `escalated (highest-score used): ${bestVote.result.score} from ${bestVote.reviewerId}`,
        };
      }

      default: {
        // Default: fail on disagreement
        return {
          decision: "FAIL",
          resolution: "disagreement-default: FAIL",
        };
      }
    }
  }

  /**
   * Convenience: collect reviews and resolve in one call.
   */
  async review(
    task: Task,
    reviewers: AgentAdapter[]
  ): Promise<ConsensusResult> {
    const votes = await this.collectReviews(task, reviewers);
    return this.resolve(votes);
  }

  /**
   * Get current config.
   */
  getConfig(): ReviewConsensusConfig {
    return { ...this.config };
  }
}

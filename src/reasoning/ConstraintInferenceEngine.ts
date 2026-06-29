/**
 * Constraint Inference Engine — Architecture Reasoning Layer 1
 * 
 * 从 Domain Model + User Intent + System Context 推断约束
 * 
 * HARD RULES:
 * - IF dataVolume = massive → prohibit sqlite
 * - IF concurrency = high → require stateless backend
 * - IF consistency = strong → require transactional DB
 * - IF teamScale = enterprise → modular architecture required
 */

// Constraints
export interface Constraints {
  scale: "small" | "medium" | "large";
  concurrency: "low" | "medium" | "high";
  dataVolume: "small" | "large" | "massive";
  consistency: "eventual" | "strong";
  deploymentModel: "single-server" | "cloud" | "distributed";
  teamScale: "solo" | "team" | "enterprise";
}

export class ConstraintInferenceEngine {
  /**
   * 推断约束
   */
  infer(context: {
    domain?: string;
    intent?: string;
    scale?: string;
    users?: number;
    teamSize?: number;
  }): Constraints {
    return {
      scale: this.inferScale(context),
      concurrency: this.inferConcurrency(context),
      dataVolume: this.inferDataVolume(context),
      consistency: this.inferConsistency(context),
      deploymentModel: this.inferDeploymentModel(context),
      teamScale: this.inferTeamScale(context)
    };
  }

  /**
   * 应用 HARD RULES
   */
  applyHardRules(constraints: Constraints): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // IF dataVolume = massive → prohibit sqlite
    if (constraints.dataVolume === "massive") {
      violations.push("SQLite prohibited for massive data volume");
    }

    // IF concurrency = high → require stateless backend
    if (constraints.concurrency === "high") {
      // 这是要求，不是禁止
    }

    // IF consistency = strong → require transactional DB
    if (constraints.consistency === "strong") {
      violations.push("Transactional DB required for strong consistency");
    }

    // IF teamScale = enterprise → modular architecture required
    if (constraints.teamScale === "enterprise") {
      violations.push("Modular architecture required for enterprise team");
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  private inferScale(context: any): Constraints["scale"] {
    if (context.scale === "large" || (context.users && context.users > 100000)) return "large";
    if (context.scale === "medium" || (context.users && context.users > 10000)) return "medium";
    return "small";
  }

  private inferConcurrency(context: any): Constraints["concurrency"] {
    if (context.users && context.users > 100000) return "high";
    if (context.users && context.users > 10000) return "medium";
    return "low";
  }

  private inferDataVolume(context: any): Constraints["dataVolume"] {
    if (context.users && context.users > 1000000) return "massive";
    if (context.users && context.users > 100000) return "large";
    return "small";
  }

  private inferConsistency(context: any): Constraints["consistency"] {
    if (context.domain === "finance" || context.domain === "healthcare") return "strong";
    return "eventual";
  }

  private inferDeploymentModel(context: any): Constraints["deploymentModel"] {
    if (context.users && context.users > 100000) return "distributed";
    if (context.users && context.users > 10000) return "cloud";
    return "single-server";
  }

  private inferTeamScale(context: any): Constraints["teamScale"] {
    if (context.teamSize && context.teamSize > 10) return "enterprise";
    if (context.teamSize && context.teamSize > 3) return "team";
    return "solo";
  }
}

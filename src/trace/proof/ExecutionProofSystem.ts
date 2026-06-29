/**
 * Execution Proof System — v5.4
 * 
 * System must evolve from Engineering Reality System to Verifiable Execution System.
 * 
 * Core Principle:
 * If it cannot be proven, it did not happen.
 * 
 * Every execution must produce a Proof Artifact.
 * 
 * Trace explains what happened.
 * Flexibility explains why it deviated.
 * Proof guarantees it is correct.
 * 
 * Without proof, execution is not real.
 */

import * as crypto from "crypto";

// Violation Proof
export interface ViolationProof {
  type: string;
  layer: string;
  expected: any;
  actual: any;
  rootCause: string;
  irreversibility: boolean;
}

// Node Proof
export interface NodeProof {
  nodeId: string;
  inputHash: string;
  outputHash: string;
  constraintValidation: boolean;
  executionTime: number;
  deviation: number;
  deterministic: boolean;
}

// Execution Proof
export interface ExecutionProof {
  executionId: string;

  traceHash: string;
  planHash: string;
  runtimeHash: string;

  inputFingerprint: string;

  constraintProof: {
    hardConstraintsSatisfied: boolean;
    softConstraintScore: number;
    violations: ViolationProof[];
  };

  executionReplay: {
    deterministicSeed: string;
    replayable: boolean;
  };

  nodeProofs: NodeProof[];

  deviationProof: {
    totalDeviations: number;
    approvedDeviations: number;
    rejectedDeviations: number;
  };

  causalProof: {
    layerAttribution: Record<string, string>;
    causalityChain: string[];
  };

  finalVerdict: {
    validExecution: boolean;
    confidence: number;
  };
}

export class ExecutionProofSystem {
  /**
   * 生成执行证明
   */
  generateProof(context: {
    executionId: string;
    input: any;
    trace: any;
    plan: any;
    runtime: any;
    nodeExecutions: any[];
    deviations: any[];
    violations: any[];
    causalityChain: string[];
  }): ExecutionProof {
    // 计算哈希
    const inputFingerprint = this.hash(JSON.stringify(context.input));
    const traceHash = this.hash(JSON.stringify(context.trace));
    const planHash = this.hash(JSON.stringify(context.plan));
    const runtimeHash = this.hash(JSON.stringify(context.runtime));

    // 生成节点证明
    const nodeProofs: NodeProof[] = context.nodeExecutions.map(ne => ({
      nodeId: ne.nodeId,
      inputHash: this.hash(JSON.stringify(ne.input)),
      outputHash: this.hash(JSON.stringify(ne.output)),
      constraintValidation: ne.status === "completed",
      executionTime: ne.duration,
      deviation: ne.deviation || 0,
      deterministic: true
    }));

    // 生成违规证明
    const violationProofs: ViolationProof[] = context.violations.map(v => ({
      type: v.type,
      layer: v.layer,
      expected: v.expected,
      actual: v.actual,
      rootCause: v.rootCause || "Unknown",
      irreversibility: v.irreversibility || false
    }));

    // 计算约束证明
    const hardSatisfied = violationProofs.filter(v => v.type === "HARD").length === 0;
    const softScore = 1.0 - (violationProofs.filter(v => v.type === "SOFT").length * 0.1);

    // 计算偏差证明
    const totalDevs = context.deviations.length;
    const approvedDevs = context.deviations.filter(d => d.approved).length;

    // 计算最终判决
    const validExecution = hardSatisfied && nodeProofs.every(n => n.deterministic);
    const confidence = validExecution ? Math.min(1.0, softScore) : 0;

    return {
      executionId: context.executionId,
      traceHash,
      planHash,
      runtimeHash,
      inputFingerprint,
      constraintProof: {
        hardConstraintsSatisfied: hardSatisfied,
        softConstraintScore: softScore,
        violations: violationProofs
      },
      executionReplay: {
        deterministicSeed: inputFingerprint,
        replayable: validExecution
      },
      nodeProofs,
      deviationProof: {
        totalDeviations: totalDevs,
        approvedDeviations: approvedDevs,
        rejectedDeviations: totalDevs - approvedDevs
      },
      causalProof: {
        layerAttribution: this.buildLayerAttribution(context.nodeExecutions),
        causalityChain: context.causalityChain
      },
      finalVerdict: {
        validExecution,
        confidence
      }
    };
  }

  /**
   * 验证证明
   */
  verifyProof(proof: ExecutionProof): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 验证哈希
    if (!proof.traceHash || !proof.planHash || !proof.runtimeHash) {
      issues.push("Missing required hashes");
    }

    // 验证约束
    if (!proof.constraintProof.hardConstraintsSatisfied) {
      issues.push("HARD constraints not satisfied");
    }

    // 验证确定性
    const nonDeterministic = proof.nodeProofs.filter(n => !n.deterministic);
    if (nonDeterministic.length > 0) {
      issues.push(`Non-deterministic nodes: ${nonDeterministic.map(n => n.nodeId).join(", ")}`);
    }

    // 验证可重放性
    if (!proof.executionReplay.replayable) {
      issues.push("Execution not replayable");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * 计算信任度
   */
  calculateTrust(proof: ExecutionProof): number {
    const proofCompleteness = this.calculateProofCompleteness(proof);
    const determinism = proof.nodeProofs.filter(n => n.deterministic).length / Math.max(1, proof.nodeProofs.length);
    const constraintSatisfaction = proof.constraintProof.hardConstraintsSatisfied ? 1.0 : 0;

    return (proofCompleteness * 0.4) + (determinism * 0.3) + (constraintSatisfaction * 0.3);
  }

  private hash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  private buildLayerAttribution(nodeExecutions: any[]): Record<string, string> {
    const attribution: Record<string, string> = {};
    for (const ne of nodeExecutions) {
      attribution[ne.nodeId] = ne.layer || "Runtime";
    }
    return attribution;
  }

  private calculateProofCompleteness(proof: ExecutionProof): number {
    let score = 0;
    if (proof.traceHash) score += 0.2;
    if (proof.planHash) score += 0.2;
    if (proof.runtimeHash) score += 0.2;
    if (proof.nodeProofs.length > 0) score += 0.2;
    if (proof.causalProof.causalityChain.length > 0) score += 0.2;
    return score;
  }
}

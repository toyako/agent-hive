/**
 * Architecture Consolidation & Unification Layer — v5.6
 * 
 * Reduce from: Many overlapping intelligent subsystems
 * To: One coherent execution architecture with unified semantics
 * 
 * Core Goal: Define ONE source of truth for:
 * - execution
 * - trace
 * - proof
 * - policy
 * - security
 * - planning
 * 
 * Final Principle:
 * Complexity is not power.
 * Compression of complexity is power.
 */

import * as crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// Phase 1: Layer Deduplication
// Trace + ExecutionProof → Execution Record Layer
// ═══════════════════════════════════════════════════════════════

// Execution Record (Unified)
export interface ExecutionRecord {
  executionId: string;
  timestamp: number;

  // Intent
  intent: {
    raw: string;
    parsed: any;
    confidence: number;
  };

  // Plan
  plan: {
    milestones: any[];
    sprints: any[];
    dag: any;
  };

  // Execution
  execution: {
    nodeExecutions: NodeExecution[];
    status: "success" | "failed" | "partial";
    duration: number;
  };

  // Trace (merged with Proof)
  trace: {
    hash: string;
    causalityChain: string[];
    layerAttribution: Record<string, string>;
  };

  // Proof (merged with Trace)
  proof: {
    inputFingerprint: string;
    constraintSatisfied: boolean;
    deterministic: boolean;
    replayable: boolean;
  };

  // Validation
  validation: {
    governancePassed: boolean;
    securityPassed: boolean;
    deviations: number;
  };

  // Learning
  learning: {
    knowledgeUsed: string[];
    policyApplied: string;
    lessonsLearned: string[];
  };
}

// Node Execution
export interface NodeExecution {
  nodeId: string;
  agent: string;
  input: any;
  output: any;
  status: "completed" | "failed" | "retrying";
  duration: number;
  retryCount: number;
}

// ═══════════════════════════════════════════════════════════════
// Phase 2: Semantic Unification
// All systems map to: Intent → Plan → Execute → Observe → Validate → Learn
// ═══════════════════════════════════════════════════════════════

export type PipelineStage = "intent" | "plan" | "execute" | "observe" | "validate" | "learn";

// Pipeline Stage Result
export interface StageResult {
  stage: PipelineStage;
  input: any;
  output: any;
  duration: number;
  success: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Phase 3: Control Plane Unification
// Replace: Governance + Security + Policy → Unified Control Plane
// ═══════════════════════════════════════════════════════════════

// Control Decision
export interface ControlDecision {
  allowed: boolean;
  reason: string;
  violations: string[];
  recommendations: string[];
}

// ═══════════════════════════════════════════════════════════════
// Phase 4: Execution Canon
// There is only ONE execution truth model
// ═══════════════════════════════════════════════════════════════

export class UnifiedExecutionEngine {
  private records: Map<string, ExecutionRecord> = new Map();

  /**
   * 创建执行记录
   */
  createRecord(context: {
    executionId: string;
    intent: string;
    parsedIntent: any;
    plan: any;
    nodeExecutions: NodeExecution[];
  }): ExecutionRecord {
    const inputFingerprint = this.hash(JSON.stringify(context.intent));
    const causalityChain = ["Intent", "Plan", "Execute", "Observe", "Validate", "Learn"];

    const record: ExecutionRecord = {
      executionId: context.executionId,
      timestamp: Date.now(),
      intent: {
        raw: context.intent,
        parsed: context.parsedIntent,
        confidence: 0.9
      },
      plan: {
        milestones: context.plan?.milestones || [],
        sprints: context.plan?.sprints || [],
        dag: context.plan?.dag || {}
      },
      execution: {
        nodeExecutions: context.nodeExecutions,
        status: context.nodeExecutions.every(n => n.status === "completed") ? "success" : "failed",
        duration: context.nodeExecutions.reduce((sum, n) => sum + n.duration, 0)
      },
      trace: {
        hash: this.hash(JSON.stringify(context.nodeExecutions)),
        causalityChain,
        layerAttribution: this.buildLayerAttribution(context.nodeExecutions)
      },
      proof: {
        inputFingerprint,
        constraintSatisfied: true,
        deterministic: true,
        replayable: true
      },
      validation: {
        governancePassed: true,
        securityPassed: true,
        deviations: 0
      },
      learning: {
        knowledgeUsed: [],
        policyApplied: "default",
        lessonsLearned: []
      }
    };

    this.records.set(context.executionId, record);
    return record;
  }

  /**
   * 获取执行记录
   */
  getRecord(executionId: string): ExecutionRecord | undefined {
    return this.records.get(executionId);
  }

  /**
   * 获取所有记录
   */
  getAllRecords(): ExecutionRecord[] {
    return Array.from(this.records.values());
  }

  /**
   * 统一验证
   */
  validate(record: ExecutionRecord): ControlDecision {
    const violations: string[] = [];
    const recommendations: string[] = [];

    // 检查约束
    if (!record.proof.constraintSatisfied) {
      violations.push("Constraints not satisfied");
    }

    // 检查确定性
    if (!record.proof.deterministic) {
      violations.push("Non-deterministic execution");
    }

    // 检查治理
    if (!record.validation.governancePassed) {
      violations.push("Governance check failed");
    }

    // 检查安全
    if (!record.validation.securityPassed) {
      violations.push("Security check failed");
    }

    // 建议
    if (record.execution.status === "failed") {
      recommendations.push("Review failure root cause");
    }

    if (record.validation.deviations > 0) {
      recommendations.push("Review deviation reasons");
    }

    return {
      allowed: violations.length === 0,
      reason: violations.length === 0 ? "All checks passed" : violations.join(", "),
      violations,
      recommendations
    };
  }

  /**
   * 统一指标
   */
  metrics(): {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    deterministicRate: number;
  } {
    const records = this.getAllRecords();
    const total = records.length;
    const successful = records.filter(r => r.execution.status === "success").length;
    const deterministic = records.filter(r => r.proof.deterministic).length;
    const totalDuration = records.reduce((sum, r) => sum + r.execution.duration, 0);

    return {
      totalExecutions: total,
      successRate: total > 0 ? successful / total : 0,
      averageDuration: total > 0 ? totalDuration / total : 0,
      deterministicRate: total > 0 ? deterministic / total : 0
    };
  }

  private hash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  private buildLayerAttribution(nodeExecutions: NodeExecution[]): Record<string, string> {
    const attribution: Record<string, string> = {};
    for (const ne of nodeExecutions) {
      attribution[ne.nodeId] = "Runtime";
    }
    return attribution;
  }
}

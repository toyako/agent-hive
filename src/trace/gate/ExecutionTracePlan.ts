/**
 * Execution Trace Plan (ETP) — v5.2
 * 
 * Trace is no longer output.
 * Trace is the contract of execution.
 * 
 * If execution deviates from trace → system MUST block, retry, or replan.
 */

// Trace Node
export interface TraceNode {
  id: string;
  layer: string;
  expectedInput: any;
  expectedOutputSchema: any;
}

// Trace Edge
export interface TraceEdge {
  from: string;
  to: string;
}

// Validation Rule
export interface ValidationRule {
  type: string;
  condition: string;
  action: "BLOCK" | "RETRY" | "REPLAN";
}

// Execution Trace Plan
export interface ExecutionTracePlan {
  executionId: string;
  intent: any;
  causalGraph: {
    nodes: TraceNode[];
    edges: TraceEdge[];
  };
  executionStages: string[];
  expectedNodeOrder: string[];
  constraints: {
    mustExecuteInOrder: boolean;
    allowedDeviations: string[];
    forbiddenSkips: string[];
  };
  validationRules: ValidationRule[];
  failureRecoveryPolicy: {
    retryAllowed: boolean;
    maxRetries: number;
    fallbackPlan: string;
  };
}

export class ExecutionTracePlanGenerator {
  /**
   * 生成追踪计划
   */
  generate(intent: any, dag: any): ExecutionTracePlan {
    const executionId = `etp-${Date.now()}`;
    
    // 从 DAG 生成追踪节点
    const nodes: TraceNode[] = (dag.nodes || []).map((nodeId: string) => ({
      id: nodeId,
      layer: this.inferLayer(nodeId),
      expectedInput: {},
      expectedOutputSchema: {}
    }));

    // 从 DAG 生成追踪边
    const edges: TraceEdge[] = (dag.edges || []).map((edge: [string, string]) => ({
      from: edge[0],
      to: edge[1]
    }));

    return {
      executionId,
      intent,
      causalGraph: { nodes, edges },
      executionStages: ["intent", "product", "architecture", "planning", "runtime", "governance", "observation"],
      expectedNodeOrder: nodes.map(n => n.id),
      constraints: {
        mustExecuteInOrder: true,
        allowedDeviations: [],
        forbiddenSkips: nodes.map(n => n.id)
      },
      validationRules: [
        { type: "ORDER", condition: "strict", action: "BLOCK" },
        { type: "INPUT", condition: "match", action: "RETRY" },
        { type: "OUTPUT", condition: "match", action: "REPLAN" }
      ],
      failureRecoveryPolicy: {
        retryAllowed: true,
        maxRetries: 3,
        fallbackPlan: "REPLAN"
      }
    };
  }

  /**
   * 推断层
   */
  private inferLayer(nodeId: string): string {
    if (nodeId.includes("hermes") || nodeId.includes("planner")) return "Planning";
    if (nodeId.includes("worker")) return "Runtime";
    if (nodeId.includes("reviewer")) return "Governance";
    return "Runtime";
  }
}

/**
 * Execution Trace Model — v5.1
 * 
 * No execution without causality.
 * No result without traceability.
 * No layer without accountability.
 * 
 * If it is not traceable, it did not happen.
 */

// Layer Trace
export interface LayerTrace {
  layer: string;
  input: any;
  output: any;
  reasoning: string;
  confidence: number;
  duration: number;
  skipped: boolean;
}

// Node Execution
export interface NodeExecutionTrace {
  nodeId: string;
  agent: string;
  input: any;
  output: any;
  status: "completed" | "failed" | "retrying";
  duration: number;
  retryCount: number;
  error?: string;
}

// Failure Analysis
export interface FailureAnalysisTrace {
  failedNode?: string;
  failureType?: string;
  rootCause?: string;
  layerAttribution: "Intent" | "Product Engineering" | "Architecture Reasoning" | "Planning" | "Governance" | "Runtime" | "Knowledge" | "Unknown";
}

// Execution Trace
export interface ExecutionTrace {
  executionId: string;
  timestamp: number;

  input: {
    raw: string;
    normalized: any;
  };

  intent: {
    parsedIntent: any;
    confidence: number;
  };

  product: {
    requirements: any;
    features: any[];
  };

  architecture: {
    selectedArchitecture: any;
    alternatives: any[];
    reasoning: string;
  };

  planning: {
    milestones: any[];
    sprints: any[];
    dependencies: any[];
  };

  runtime: {
    dag: any;
    nodeExecutions: NodeExecutionTrace[];
  };

  governance: {
    checks: any[];
    violations: any[];
  };

  observation: {
    logs: any[];
    metrics: any;
  };

  failureAnalysis: FailureAnalysisTrace;

  recovery: {
    actions: string[];
    retryCount: number;
    finalStatus: string;
  };

  knowledge: {
    usedEntries: string[];
    influenceScore: number;
  };

  finalResult: {
    success: boolean;
    output: any;
  };
}

export class ExecutionTraceModel {
  private traces: Map<string, ExecutionTrace> = new Map();

  /**
   * 创建追踪
   */
  create(executionId: string, rawInput: string): ExecutionTrace {
    const trace: ExecutionTrace = {
      executionId,
      timestamp: Date.now(),
      input: { raw: rawInput, normalized: null },
      intent: { parsedIntent: null, confidence: 0 },
      product: { requirements: null, features: [] },
      architecture: { selectedArchitecture: null, alternatives: [], reasoning: "" },
      planning: { milestones: [], sprints: [], dependencies: [] },
      runtime: { dag: null, nodeExecutions: [] },
      governance: { checks: [], violations: [] },
      observation: { logs: [], metrics: null },
      failureAnalysis: { layerAttribution: "Unknown" },
      recovery: { actions: [], retryCount: 0, finalStatus: "pending" },
      knowledge: { usedEntries: [], influenceScore: 0 },
      finalResult: { success: false, output: null }
    };

    this.traces.set(executionId, trace);
    return trace;
  }

  /**
   * 获取追踪
   */
  get(executionId: string): ExecutionTrace | undefined {
    return this.traces.get(executionId);
  }

  /**
   * 更新层追踪
   */
  updateLayer(executionId: string, layerTrace: LayerTrace): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;

    // 根据层类型更新对应的字段
    switch (layerTrace.layer) {
      case "Input Normalization":
        trace.input.normalized = layerTrace.output;
        break;
      case "Intent Compiler":
        trace.intent.parsedIntent = layerTrace.output;
        trace.intent.confidence = layerTrace.confidence;
        break;
      case "Product Engineering":
        trace.product.requirements = layerTrace.output;
        break;
      case "Architecture Reasoning":
        trace.architecture.selectedArchitecture = layerTrace.output;
        trace.architecture.reasoning = layerTrace.reasoning;
        break;
      case "Project Planning":
        trace.planning.milestones = layerTrace.output?.milestones || [];
        break;
      case "Governance":
        trace.governance.checks = layerTrace.output?.qualityGates || [];
        break;
      case "Runtime":
        trace.runtime.dag = layerTrace.output;
        break;
    }
  }

  /**
   * 记录节点执行
   */
  recordNodeExecution(executionId: string, nodeExec: NodeExecutionTrace): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;
    trace.runtime.nodeExecutions.push(nodeExec);
  }

  /**
   * 记录失败
   */
  recordFailure(executionId: string, failure: FailureAnalysisTrace): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;
    trace.failureAnalysis = failure;
  }

  /**
   * 完成追踪
   */
  complete(executionId: string, success: boolean, output: any): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;
    trace.finalResult = { success, output };
    trace.recovery.finalStatus = success ? "success" : "failed";
  }

  /**
   * 获取所有追踪
   */
  getAll(): ExecutionTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * 计算指标
   */
  metrics(): {
    totalExecutions: number;
    successRate: number;
    failureDistribution: Record<string, number>;
    averageDuration: number;
  } {
    const traces = this.getAll();
    const total = traces.length;
    const successful = traces.filter(t => t.finalResult.success).length;

    // 失败分布
    const failureDist: Record<string, number> = {};
    for (const trace of traces) {
      if (!trace.finalResult.success) {
        const layer = trace.failureAnalysis.layerAttribution;
        failureDist[layer] = (failureDist[layer] || 0) + 1;
      }
    }

    return {
      totalExecutions: total,
      successRate: total > 0 ? successful / total : 0,
      failureDistribution: failureDist,
      averageDuration: 0
    };
  }
}

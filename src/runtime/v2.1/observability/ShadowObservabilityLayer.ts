/**
 * Shadow Observability Layer — v2.1
 * 
 * 影子观测系统
 * 
 * 职责：
 * - 记录 v2.1 全链路但不影响 v2.0
 * - trace collection
 * - causal graph construction
 * - replay support
 * 
 * 规则：
 * ❌ Observability must NOT affect execution
 */

// Trace Event
export interface TraceEvent {
  traceId: string;
  contractId: string;
  source: "v2.0" | "v2.1-shadow";
  type: "DECISION" | "CONTRACT" | "BRIDGE" | "EXECUTION" | "ERROR";
  payload: any;
  timestamp: number;
}

// Causal Graph Node
export interface CausalNode {
  id: string;
  type: string;
  parentId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Divergence Report
export interface DivergenceReport {
  contractId: string;
  type: "ORDER_MISMATCH" | "STEP_LOSS" | "EXTRA_EXECUTION" | "RECOVERY_DIFFERENCE";
  description: string;
  v2_0_state: any;
  v2_1_state: any;
  timestamp: number;
}

export class ShadowObservabilityLayer {
  private traces: TraceEvent[] = [];
  private causalGraph: CausalNode[] = [];
  private divergences: DivergenceReport[] = [];

  /**
   * 记录 Trace Event
   */
  recordTrace(event: Omit<TraceEvent, "timestamp">): TraceEvent {
    const fullEvent: TraceEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.traces.push(fullEvent);

    // 构建因果图
    this.addToCausalGraph(fullEvent);

    return fullEvent;
  }

  /**
   * 记录决策追踪
   */
  recordDecision(contractId: string, decision: any): TraceEvent {
    return this.recordTrace({
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId,
      source: "v2.1-shadow",
      type: "DECISION",
      payload: decision
    });
  }

  /**
   * 记录 Contract 生成
   */
  recordContract(contractId: string, contract: any): TraceEvent {
    return this.recordTrace({
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId,
      source: "v2.1-shadow",
      type: "CONTRACT",
      payload: contract
    });
  }

  /**
   * 记录 Bridge 映射
   */
  recordBridge(contractId: string, mapping: any): TraceEvent {
    return this.recordTrace({
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId,
      source: "v2.1-shadow",
      type: "BRIDGE",
      payload: mapping
    });
  }

  /**
   * 记录执行追踪
   */
  recordExecution(contractId: string, execution: any): TraceEvent {
    return this.recordTrace({
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId,
      source: "v2.1-shadow",
      type: "EXECUTION",
      payload: execution
    });
  }

  /**
   * 记录错误
   */
  recordError(contractId: string, error: any): TraceEvent {
    return this.recordTrace({
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      contractId,
      source: "v2.1-shadow",
      type: "ERROR",
      payload: error
    });
  }

  /**
   * 记录 Divergence
   */
  recordDivergence(report: Omit<DivergenceReport, "timestamp">): DivergenceReport {
    const fullReport: DivergenceReport = {
      ...report,
      timestamp: Date.now()
    };

    this.divergences.push(fullReport);
    return fullReport;
  }

  /**
   * 获取 Contract 的所有追踪
   */
  getTracesByContract(contractId: string): TraceEvent[] {
    return this.traces.filter(t => t.contractId === contractId);
  }

  /**
   * 获取因果图
   */
  getCausalGraph(contractId?: string): CausalNode[] {
    if (contractId) {
      return this.causalGraph.filter(n => n.metadata?.contractId === contractId);
    }
    return [...this.causalGraph];
  }

  /**
   * 获取 Divergence 报告
   */
  getDivergences(contractId?: string): DivergenceReport[] {
    if (contractId) {
      return this.divergences.filter(d => d.contractId === contractId);
    }
    return [...this.divergences];
  }

  /**
   * 重放追踪
   */
  replay(contractId: string): TraceEvent[] {
    return this.getTracesByContract(contractId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取统计
   */
  getStats(): {
    totalTraces: number;
    totalDivergences: number;
    tracesByType: Record<string, number>;
  } {
    const tracesByType: Record<string, number> = {};
    for (const trace of this.traces) {
      tracesByType[trace.type] = (tracesByType[trace.type] || 0) + 1;
    }

    return {
      totalTraces: this.traces.length,
      totalDivergences: this.divergences.length,
      tracesByType
    };
  }

  /**
   * 添加到因果图
   */
  private addToCausalGraph(event: TraceEvent): void {
    const node: CausalNode = {
      id: event.traceId,
      type: event.type,
      timestamp: event.timestamp,
      metadata: {
        contractId: event.contractId,
        source: event.source
      }
    };

    // 找到父节点（同一 contract 的上一个事件）
    const contractTraces = this.traces.filter(
      t => t.contractId === event.contractId && t.timestamp < event.timestamp
    );

    if (contractTraces.length > 0) {
      const parent = contractTraces[contractTraces.length - 1];
      node.parentId = parent.traceId;
    }

    this.causalGraph.push(node);
  }
}

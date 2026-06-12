/**
 * DecisionTrace — tracks why each agent made its decision.
 */
export interface DecisionTrace {
  traceId: string;
  agent: string;
  decision: string;
  rationale: string;
  confidence: number;
  timestamp: number;
}

export class DecisionTraceCollector {
  private traces: DecisionTrace[] = [];

  record(trace: DecisionTrace): void {
    this.traces.push(trace);
  }

  getByAgent(agent: string): DecisionTrace[] {
    return this.traces.filter(t => t.agent === agent);
  }

  getByTraceId(traceId: string): DecisionTrace[] {
    return this.traces.filter(t => t.traceId === traceId);
  }

  all(): DecisionTrace[] {
    return [...this.traces];
  }

  reset(): void { this.traces = []; }
}

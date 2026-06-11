/**
 * DecisionEvent — events related to agent decisions.
 */

export interface DecisionEvent {
  type: "DecisionMade";
  id: string;
  traceId: string;
  timestamp: number;
  payload: {
    agentId: string;
    decision: string;
    reason: string;
    confidence: number;
  };
}

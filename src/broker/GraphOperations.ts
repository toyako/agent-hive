import { AgentGraph } from "../graph/AgentGraph";
import { AgentRegistry } from "./AgentRegistry";
import { MessageRouter } from "./MessageRouter";
import { ConversationManager } from "../conversation/ConversationManager";
import { CircuitBreaker } from "../safety/CircuitBreaker";
import { HopCounter } from "../safety/HopCounter";
import { MessageDeduplicator } from "../safety/MessageDeduplicator";
import { TimeBudget } from "../safety/TimeBudget";
import { MessageEnvelope, AgentAdapter } from "../types";

/**
 * GraphOperations — v2.0 graph-related helpers.
 * Manages graph, message router, conversation, and safety components.
 */
export class GraphOperations {
  readonly graph: AgentGraph;
  readonly messageRouter: MessageRouter;
  readonly conversations: ConversationManager;
  readonly circuitBreaker: CircuitBreaker;
  readonly hopCounter: HopCounter;
  readonly deduplicator: MessageDeduplicator;
  readonly timeBudget: TimeBudget;

  constructor(graph: AgentGraph, registry: AgentRegistry) {
    this.graph = graph;
    this.messageRouter = new MessageRouter(graph);
    this.conversations = new ConversationManager();
    this.circuitBreaker = new CircuitBreaker();
    this.hopCounter = new HopCounter();
    this.deduplicator = new MessageDeduplicator();
    this.timeBudget = new TimeBudget();
  }

  registerRuntime(adapter: AgentAdapter): void {
    if (!this.graph.hasAgent(adapter.name)) {
      this.graph.addAgent({
        id: adapter.name,
        runtimeId: adapter.name,
        role: adapter.role,
        maxConcurrency: 1,
        status: "idle",
      });
    }
  }

  createEnvelope(
    from: string, to: string, taskId: string, conversationId: string,
    type: MessageEnvelope["type"], payload: any
  ): MessageEnvelope {
    return {
      id: `env-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      taskId,
      conversationId,
      from,
      to,
      type,
      payload,
      metadata: this.hopCounter.createMetadata(from),
      timestamp: Date.now(),
    };
  }

  getCircuitBreaker(): CircuitBreaker { return this.circuitBreaker; }
  getConversations(): ConversationManager { return this.conversations; }

  getSafetyStatus() {
    return {
      circuitBreaker: this.circuitBreaker.allStates(),
      hopCounter: { defaultMaxHops: 10 },
      deduplicator: this.deduplicator.stats(),
    };
  }
}

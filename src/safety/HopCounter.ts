import { MessageEnvelope } from "../types";

/**
 * HopCounter
 *
 * Prevents infinite message loops by tracking hop counts.
 * Each message has a hopCount that's incremented at each routing step.
 * If hopCount exceeds maxHops, the message is dropped.
 */
export class HopCounter {
  private defaultMaxHops: number;

  constructor(defaultMaxHops: number = 10) {
    this.defaultMaxHops = defaultMaxHops;
  }

  /**
   * Check if a message has exceeded its hop limit.
   */
  isExceeded(msg: MessageEnvelope): boolean {
    return msg.metadata.hopCount >= this.defaultMaxHops;
  }

  /**
   * Increment hop count on a message (returns new envelope).
   */
  increment(msg: MessageEnvelope): MessageEnvelope {
    return {
      ...msg,
      metadata: {
        ...msg.metadata,
        hopCount: msg.metadata.hopCount + 1,
        routingPath: [...msg.metadata.routingPath, msg.to],
      },
    };
  }

  /**
   * Create initial metadata for a new message.
   */
  createMetadata(from: string, maxHops?: number): MessageEnvelope["metadata"] {
    return {
      hopCount: 0,
      maxHops: maxHops ?? this.defaultMaxHops,
      priority: 5,
      routingPath: [from],
    };
  }

  /**
   * Check if adding this hop would create a cycle.
   * Returns true if the target agent is already in the routing path.
   */
  wouldCreateCycle(msg: MessageEnvelope, targetAgent: string): boolean {
    return msg.metadata.routingPath.includes(targetAgent);
  }
}

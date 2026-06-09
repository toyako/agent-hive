import { MessageEnvelope } from "../types";
import { createHash } from "crypto";

/**
 * MessageDeduplicator
 *
 * Prevents duplicate messages within a time window.
 * Uses content-based fingerprinting.
 */
export class MessageDeduplicator {
  private seen: Map<string, number> = new Map(); // fingerprint → timestamp
  private windowMs: number;

  constructor(windowMs: number = 30_000) {
    this.windowMs = windowMs;
  }

  /**
   * Check if a message is a duplicate.
   * Returns true if duplicate, false if new.
   */
  isDuplicate(msg: MessageEnvelope): boolean {
    const fingerprint = this.fingerprint(msg);
    const now = Date.now();

    // Clean old entries
    this.cleanup(now);

    if (this.seen.has(fingerprint)) {
      const lastSeen = this.seen.get(fingerprint)!;
      if (now - lastSeen < this.windowMs) {
        return true; // Duplicate within window
      }
    }

    // Record this message
    this.seen.set(fingerprint, now);
    return false;
  }

  /**
   * Generate a fingerprint for a message.
   */
  private fingerprint(msg: MessageEnvelope): string {
    const key = `${msg.from}:${msg.to}:${msg.type}:${msg.taskId}:${JSON.stringify(msg.payload)}`;
    return createHash("md5").update(key).digest("hex");
  }

  /**
   * Clean up expired entries.
   */
  private cleanup(now: number): void {
    for (const [fingerprint, timestamp] of this.seen) {
      if (now - timestamp > this.windowMs * 2) {
        this.seen.delete(fingerprint);
      }
    }
  }

  /**
   * Get stats for monitoring.
   */
  stats(): { tracked: number; windowMs: number } {
    return {
      tracked: this.seen.size,
      windowMs: this.windowMs,
    };
  }
}

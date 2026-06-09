import { CircuitBreakerState } from "../types";

/**
 * CircuitBreaker
 *
 * Prevents cascading failures by tracking agent failure rates.
 * States: CLOSED (normal) → OPEN (blocking) → HALF_OPEN (testing) → CLOSED
 */
export class CircuitBreaker {
  private states: Map<string, CircuitBreakerState> = new Map();
  private threshold: number;
  private windowMs: number;
  private cooldownMs: number;

  constructor(opts?: { threshold?: number; windowMs?: number; cooldownMs?: number }) {
    this.threshold = opts?.threshold ?? 5;
    this.windowMs = opts?.windowMs ?? 300_000; // 5 minutes
    this.cooldownMs = opts?.cooldownMs ?? 60_000; // 1 minute
  }

  /**
   * Check if agent is available (circuit is not open).
   */
  isAvailable(agentId: string): boolean {
    const state = this.getState(agentId);

    if (state.state === "closed") return true;

    if (state.state === "open") {
      // Check if cooldown has passed
      if (state.nextRetryAt && Date.now() >= state.nextRetryAt) {
        state.state = "half-open";
        this.states.set(agentId, state);
        return true; // Allow one attempt
      }
      return false;
    }

    // half-open: allow one attempt
    return true;
  }

  /**
   * Record a failure for an agent.
   */
  recordFailure(agentId: string): void {
    const state = this.getState(agentId);
    const now = Date.now();

    // Clean old failures outside window
    state.failures = (state.failures || 0) + 1;
    state.lastFailure = now;

    if (state.failures >= this.threshold) {
      state.state = "open";
      state.nextRetryAt = now + this.cooldownMs;
    }

    this.states.set(agentId, state);
  }

  /**
   * Record a success for an agent (resets failure count).
   */
  recordSuccess(agentId: string): void {
    const state = this.getState(agentId);
    state.failures = 0;
    state.state = "closed";
    state.nextRetryAt = undefined;
    this.states.set(agentId, state);
  }

  /**
   * Get circuit breaker state for an agent.
   */
  getState(agentId: string): CircuitBreakerState {
    return this.states.get(agentId) || {
      agentId,
      failures: 0,
      lastFailure: 0,
      state: "closed",
    };
  }

  /**
   * Reset circuit breaker for an agent.
   */
  reset(agentId: string): void {
    this.states.delete(agentId);
  }

  /**
   * Get all states (for monitoring).
   */
  allStates(): CircuitBreakerState[] {
    return Array.from(this.states.values());
  }
}

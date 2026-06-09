import { AgentAdapter, AgentResult, ReviewResult, Task } from "../types";

/**
 * Mock Claude Adapter
 * Simulates code review.
 *
 * Behavior:
 * - failCount: how many times to fail before passing (default: 0 = always pass)
 * - score: base score for reviews
 */
export class MockClaudeAdapter implements AgentAdapter {
  name = "claude";
  role = "reviewer" as const;
  capabilities = ["review", "architecture"];

  private failCount: number;
  private baseScore: number;
  private callCount = 0;

  constructor(opts?: { failCount?: number; score?: number }) {
    this.failCount = opts?.failCount ?? 0;
    this.baseScore = opts?.score ?? 85;
  }

  async detect(): Promise<boolean> {
    return true;
  }

  async health(): Promise<boolean> {
    return true;
  }

  async execute(task: Task): Promise<AgentResult> {
    return { success: true, output: "[MockClaude] Review-only agent" };
  }

  async review(task: Task): Promise<ReviewResult> {
    await this.sleep(300);
    this.callCount++;

    if (this.callCount <= this.failCount) {
      return {
        decision: "FAIL",
        score: Math.max(30, this.baseScore - 40),
        issues: [
          `Mock issue #1: simulated code smell (review ${this.callCount}/${this.failCount})`,
          `Mock issue #2: needs refactoring`,
        ],
      };
    }

    return {
      decision: "PASS",
      score: this.baseScore,
      issues: [],
    };
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}

/**
 * TaskQualityGate — validates tasks before they enter the system.
 * Rejects tasks that don't meet quality standards.
 */

export type TaskPriority = "P0" | "P1" | "P2" | "P3";

export interface TaskEntry {
  task_id: string;
  task_type: TaskPriority;
  description: string;
  data_source?: string;
  success_criteria: string;
  input_data?: string;
  novelty_score?: number;
}

export interface QualityCheckResult {
  accepted: boolean;
  checks: {
    input_validity: boolean;
    output_verifiability: boolean;
    failure_traceability: boolean;
  };
  rejection_reason?: string;
}

export class TaskQualityGate {
  private seenPatterns: Set<string> = new Set();
  private specVersion = "1.0.0";

  /** Validate a task before it enters the system */
  validate(entry: TaskEntry): QualityCheckResult {
    const checks = {
      input_validity: this.checkInputValidity(entry),
      output_verifiability: this.checkOutputVerifiability(entry),
      failure_traceability: this.checkFailureTraceability(entry),
    };

    const accepted = checks.input_validity && checks.output_verifiability && checks.failure_traceability;

    if (!accepted) {
      const failed = Object.entries(checks).filter(([_, v]) => !v).map(([k]) => k);
      return { accepted: false, checks, rejection_reason: `Failed checks: ${failed.join(", ")}` };
    }

    // Track pattern for Blind Evaluation
    this.seenPatterns.add(this.normalizePattern(entry.description));

    return { accepted: true, checks };
  }

  /** Check if task has valid input */
  private checkInputValidity(entry: TaskEntry): boolean {
    // Must have description
    if (!entry.description || entry.description.trim().length < 10) return false;

    // Must not be purely hypothetical
    const hypothetical = ["what if", "imagine", "suppose", "hypothetically"];
    const lower = entry.description.toLowerCase();
    if (hypothetical.some(h => lower.startsWith(h))) return false;

    return true;
  }

  /** Check if output is verifiable */
  private checkOutputVerifiability(entry: TaskEntry): boolean {
    // Must have success_criteria
    if (!entry.success_criteria || entry.success_criteria.trim().length < 5) return false;

    // Must not be unverifiable
    const unverifiable = ["see if it works", "check manually", "feel", "look at"];
    const lower = entry.success_criteria.toLowerCase();
    if (unverifiable.some(u => lower.includes(u))) return false;

    return true;
  }

  /** Check if failure is traceable */
  private checkFailureTraceability(entry: TaskEntry): boolean {
    // Must have task_id
    if (!entry.task_id || entry.task_id.trim().length === 0) return false;

    // Must have task_type
    if (!entry.task_type) return false;

    return true;
  }

  /** Check if task is novel (Blind Evaluation) */
  isNovel(description: string, track = true): boolean {
    const pattern = this.normalizePattern(description);
    const novel = !this.seenPatterns.has(pattern);
    if (track && novel) this.seenPatterns.add(pattern);
    return novel;
  }

  /** Get novelty score */
  getNoveltyScore(description: string): number {
    const pattern = this.normalizePattern(description);
    if (!this.seenPatterns.has(pattern)) return 1.0; // Completely new

    // Partial novelty based on word overlap
    const words = pattern.split(" ");
    let maxOverlap = 0;
    for (const seen of this.seenPatterns) {
      const seenWords = seen.split(" ");
      const overlap = words.filter(w => seenWords.includes(w)).length;
      const ratio = overlap / Math.max(words.length, seenWords.length);
      maxOverlap = Math.max(maxOverlap, ratio);
    }

    return Math.max(0, 1 - maxOverlap);
  }

  private normalizePattern(description: string): string {
    return description.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 50);
  }
}

import * as fs from "fs";
import * as path from "path";

const DECISIONS_DIR = path.resolve(process.cwd(), ".agent-hive/traces");

export interface Decision {
  taskId: string;
  decision: string;
  reason: string;
  selected?: string;
  candidates?: string[];
  data?: Record<string, any>;
  timestamp: number;
}

export class DecisionRecorder {
  private decisions: Map<string, Decision[]> = new Map(); // taskId → decisions

  constructor() {
    fs.mkdirSync(DECISIONS_DIR, { recursive: true });
  }

  record(decision: Omit<Decision, "timestamp">): void {
    const entry: Decision = { ...decision, timestamp: Date.now() };

    const list = this.decisions.get(decision.taskId) || [];
    list.push(entry);
    this.decisions.set(decision.taskId, list);

    // Append to trace file
    const fp = path.join(DECISIONS_DIR, `decisions-${decision.taskId}.jsonl`);
    fs.appendFileSync(fp, JSON.stringify(entry) + "\n");
  }

  get(taskId: string): Decision[] {
    return this.decisions.get(taskId) || [];
  }

  format(taskId: string): string {
    const list = this.decisions.get(taskId);
    if (!list || list.length === 0) return `No decisions recorded for ${taskId}`;

    const lines: string[] = [];
    lines.push(`Decisions for ${taskId}:`);
    lines.push("");

    for (const d of list) {
      lines.push(`  [${d.decision}]`);
      lines.push(`    reason: ${d.reason}`);
      if (d.selected) lines.push(`    selected: ${d.selected}`);
      if (d.candidates) lines.push(`    candidates: ${d.candidates.join(", ")}`);
      if (d.data) lines.push(`    data: ${JSON.stringify(d.data)}`);
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Record a runtime selection decision.
   */
  runtimeSelection(taskId: string, selected: string, candidates: string[], reason: string): void {
    this.record({
      taskId,
      decision: "runtime-selection",
      reason,
      selected,
      candidates,
    });
  }

  /**
   * Record an escalation decision.
   */
  escalation(taskId: string, from: string, to: string, reason: string): void {
    this.record({
      taskId,
      decision: "escalation",
      reason,
      data: { from, to },
    });
  }

  /**
   * Record a consensus decision.
   */
  consensus(taskId: string, strategy: string, pass: number, fail: number, result: string): void {
    this.record({
      taskId,
      decision: "consensus",
      reason: `${strategy}: ${pass} PASS, ${fail} FAIL → ${result}`,
      data: { strategy, pass, fail, result },
    });
  }
}

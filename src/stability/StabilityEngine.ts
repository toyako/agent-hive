/**
 * StabilityEngine — overlay layer for tracking consecutive stable tasks.
 * Doesn't change execution. Only judges, counts, and logs.
 */
import * as fs from "fs";
import * as path from "path";

export type FailureType = "execution_failure" | "reasoning_failure" | "context_failure" | "reviewer_failure" | "silent_failure" | "human_override" | "non_reproducible_failure" | null;

export interface StabilityRecord {
  task_id: string;
  stable: boolean;
  failure_type: FailureType;
  reset_agent: string | null;
  counter_after: number;
  task_output: string;
  timestamp: string;
  system_version: string;
  environment_id: string;
  runtime_hash: string;
}

export interface StabilityWindowStats {
  stable_window_avg: number;
  stable_window_max: number;
  stable_window_min: number;
  total_tasks: number;
  total_stable: number;
  total_resets: number;
  failure_density: number;
}

export class StabilityEngine {
  private counter = 0;
  private records: StabilityRecord[] = [];
  private windows: number[] = []; // window sizes after each reset
  private currentWindow = 0;
  private logDir: string;
  private systemVersion: string;

  constructor(logDir?: string, systemVersion = "v1.10.0") {
    this.logDir = logDir || path.resolve(process.cwd(), ".agent-hive/stability");
    fs.mkdirSync(this.logDir, { recursive: true });
    this.systemVersion = systemVersion;
  }

  /** Evaluate a task and update stability counter */
  evaluate(task: {
    task_id: string;
    execution_success: boolean;
    reasoning_failure?: boolean;
    context_failure?: boolean;
    reviewer_failure?: boolean;
    silent_failure?: boolean;
    human_override?: boolean;
    non_reproducible?: boolean;
    task_output?: string;
    reset_agent?: string;
  }): StabilityRecord {
    // Determine stability
    const failureType = this.detectFailure(task);
    const isStable = failureType === null;

    // Update counter
    if (isStable) {
      this.counter++;
      this.currentWindow++;
    } else {
      // Hard reset
      if (this.currentWindow > 0) {
        this.windows.push(this.currentWindow);
      }
      this.counter = 0;
      this.currentWindow = 0;
    }

    // Build record
    const record: StabilityRecord = {
      task_id: task.task_id,
      stable: isStable,
      failure_type: failureType,
      reset_agent: isStable ? null : (task.reset_agent || null),
      counter_after: this.counter,
      task_output: task.task_output || "",
      timestamp: new Date().toISOString(),
      system_version: this.systemVersion,
      environment_id: process.platform + "-" + process.arch,
      runtime_hash: this.hashRecord(task),
    };

    this.records.push(record);
    this.persistRecord(record);

    return record;
  }

  /** Get current consecutive stable count */
  getCounter(): number {
    return this.counter;
  }

  /** Get stability tier */
  getTier(): string {
    if (this.counter >= 300) return "system_maturity";
    if (this.counter >= 100) return "architecture_freeze";
    if (this.counter >= 30) return "light_observation";
    return "warm_up";
  }

  /** Get window statistics */
  getStats(): StabilityWindowStats {
    const allWindows = [...this.windows, this.currentWindow];
    const stableCount = this.records.filter(r => r.stable).length;
    const resetCount = this.records.filter(r => !r.stable).length;

    return {
      stable_window_avg: allWindows.length > 0 ? allWindows.reduce((a, b) => a + b, 0) / allWindows.length : 0,
      stable_window_max: allWindows.length > 0 ? Math.max(...allWindows) : 0,
      stable_window_min: allWindows.length > 0 ? Math.min(...allWindows) : 0,
      total_tasks: this.records.length,
      total_stable: stableCount,
      total_resets: resetCount,
      failure_density: this.records.length > 0 ? resetCount / this.records.length : 0,
    };
  }

  /** Get all records */
  getRecords(): StabilityRecord[] {
    return [...this.records];
  }

  /** Get recent records */
  getRecent(count: number): StabilityRecord[] {
    return this.records.slice(-count);
  }

  private detectFailure(task: any): FailureType {
    if (!task.execution_success) return "execution_failure";
    if (task.reasoning_failure) return "reasoning_failure";
    if (task.context_failure) return "context_failure";
    if (task.reviewer_failure) return "reviewer_failure";
    if (task.silent_failure) return "silent_failure";
    if (task.human_override) return "human_override";
    if (task.non_reproducible) return "non_reproducible_failure";
    return null;
  }

  private hashRecord(task: any): string {
    const data = JSON.stringify({ task_id: task.task_id, output: task.task_output, success: task.execution_success });
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private persistRecord(record: StabilityRecord): void {
    const date = record.timestamp.slice(0, 10).replace(/-/g, "");
    const time = record.timestamp.slice(11, 16).replace(/:/g, "");
    const logFile = path.join(this.logDir, `stability_window_trace_${date}_${time}.json`);
    fs.writeFileSync(logFile, JSON.stringify(record, null, 2));
  }
}

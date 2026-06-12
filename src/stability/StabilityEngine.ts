/**
 * StabilityEngine v2 — overlay layer for tracking consecutive stable tasks.
 * Adds: input_exception, counter trace log, hidden failure rate.
 */
import * as fs from "fs";
import * as path from "path";

export type FailureType = "execution_failure" | "reasoning_failure" | "context_failure" | "reviewer_failure" | "silent_failure" | "human_override" | "non_reproducible_failure" | "input_exception" | null;

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
  hidden_failure_rate: number;
}

export class StabilityEngine {
  private counter = 0;
  private records: StabilityRecord[] = [];
  private windows: number[] = [];
  private currentWindow = 0;
  private logDir: string;
  private systemVersion: string;
  private counterTraceFile: string;

  constructor(logDir?: string, systemVersion = "v1.11.0") {
    this.logDir = logDir || path.resolve(process.cwd(), ".agent-hive/stability");
    fs.mkdirSync(this.logDir, { recursive: true });
    this.systemVersion = systemVersion;
    this.counterTraceFile = path.join(this.logDir, "stability_counter_trace.log");
  }

  evaluate(task: {
    task_id: string;
    execution_success: boolean;
    reasoning_failure?: boolean;
    context_failure?: boolean;
    reviewer_failure?: boolean;
    silent_failure?: boolean;
    human_override?: boolean;
    non_reproducible?: boolean;
    input_exception?: boolean;
    task_output?: string;
    reset_agent?: string;
  }): StabilityRecord {
    const failureType = this.detectFailure(task);
    const isStable = failureType === null;

    if (isStable) {
      this.counter++;
      this.currentWindow++;
    } else {
      if (this.currentWindow > 0) this.windows.push(this.currentWindow);
      this.counter = 0;
      this.currentWindow = 0;
    }

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
      runtime_hash: this.computeHash(task),
    };

    this.records.push(record);
    this.writeLog(record);
    this.writeCounterTrace(record);

    return record;
  }

  getCounter(): number { return this.counter; }

  getTier(): string {
    if (this.counter >= 300) return "system_maturity";
    if (this.counter >= 100) return "architecture_freeze";
    if (this.counter >= 30) return "light_observation";
    return "warm_up";
  }

  getStats(): StabilityWindowStats {
    const allWindows = [...this.windows, this.currentWindow];
    const stable = this.records.filter(r => r.stable).length;
    const resets = this.records.filter(r => !r.stable).length;
    const hidden = this.records.filter(r => r.failure_type === "silent_failure").length;

    return {
      stable_window_avg: allWindows.length > 0 ? allWindows.reduce((a, b) => a + b, 0) / allWindows.length : 0,
      stable_window_max: allWindows.length > 0 ? Math.max(...allWindows) : 0,
      stable_window_min: allWindows.length > 0 ? Math.min(...allWindows) : 0,
      total_tasks: this.records.length,
      total_stable: stable,
      total_resets: resets,
      failure_density: this.records.length > 0 ? resets / this.records.length : 0,
      hidden_failure_rate: this.records.length > 0 ? hidden / this.records.length : 0,
    };
  }

  getRecords(): StabilityRecord[] { return [...this.records]; }
  getRecent(n: number): StabilityRecord[] { return this.records.slice(-n); }

  private detectFailure(task: any): FailureType {
    if (!task.execution_success) return "execution_failure";
    if (task.reasoning_failure) return "reasoning_failure";
    if (task.context_failure) return "context_failure";
    if (task.reviewer_failure) return "reviewer_failure";
    if (task.silent_failure) return "silent_failure";
    if (task.human_override) return "human_override";
    if (task.non_reproducible) return "non_reproducible_failure";
    if (task.input_exception) return "input_exception";
    return null;
  }

  private computeHash(task: any): string {
    const data = JSON.stringify({ id: task.task_id, out: task.task_output, ok: task.execution_success });
    let h = 0;
    for (let i = 0; i < data.length; i++) h = ((h << 5) - h + data.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  }

  private writeLog(record: StabilityRecord): void {
    const d = record.timestamp.slice(0, 10).replace(/-/g, "");
    const t = record.timestamp.slice(11, 16).replace(/:/g, "");
    fs.writeFileSync(path.join(this.logDir, `stability_window_trace_${d}_${t}.json`), JSON.stringify(record, null, 2));
  }

  private writeCounterTrace(record: StabilityRecord): void {
    const status = record.stable ? "STABLE" : "RESET";
    const line = `[${record.timestamp}] ${status} counter=${record.counter_after} task=${record.task_id} failure=${record.failure_type || "none"}\n`;
    fs.appendFileSync(this.counterTraceFile, line);
  }
}

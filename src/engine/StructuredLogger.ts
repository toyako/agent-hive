/**
 * StructuredLogger — structured logging with traceId support.
 * All execution steps are logged with full context.
 */
import * as fs from "fs";
import * as path from "path";

export interface LogEntry {
  timestamp: number;
  platform: string;
  command: string;
  stage: "start" | "compiled" | "complete" | "error" | "info";
  exitCode?: number;
  durationMs?: number;
  error?: string;
  traceId: string;
  compiledCommand?: any;
}

export class StructuredLogger {
  private logDir: string;
  private entries: LogEntry[] = [];

  constructor(logDir?: string) {
    this.logDir = logDir || path.resolve(process.cwd(), ".agent-hive/logs");
    fs.mkdirSync(this.logDir, { recursive: true });
  }

  /** Log an entry */
  log(entry: LogEntry): void {
    this.entries.push(entry);

    // Also write to file
    const logFile = path.join(this.logDir, `${entry.traceId}.jsonl`);
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
  }

  /** Get all entries for a trace */
  getTrace(traceId: string): LogEntry[] {
    const logFile = path.join(this.logDir, `${traceId}.jsonl`);
    if (!fs.existsSync(logFile)) return [];
    return fs.readFileSync(logFile, "utf-8")
      .split("\n")
      .filter(l => l.trim())
      .map(l => JSON.parse(l));
  }

  /** Get all entries from this session */
  getSessionEntries(): LogEntry[] {
    return this.entries;
  }

  /** Format a log entry for display */
  format(entry: LogEntry): string {
    const time = new Date(entry.timestamp).toISOString().slice(11, 19);
    const duration = entry.durationMs ? ` (${entry.durationMs}ms)` : "";
    const exit = entry.exitCode !== undefined ? ` [exit=${entry.exitCode}]` : "";
    const err = entry.error ? ` ERROR: ${entry.error}` : "";
    return `[${time}] ${entry.platform} ${entry.stage} ${entry.command}${exit}${duration}${err}`;
  }
}

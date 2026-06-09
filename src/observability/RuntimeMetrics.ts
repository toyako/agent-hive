import * as fs from "fs";
import * as path from "path";

const METRICS_FILE = path.resolve(process.cwd(), ".agent-hive/metrics/runtime.json");

export interface RuntimeMetric {
  runtimeId: string;
  taskCount: number;
  successCount: number;
  failureCount: number;
  totalLatency: number;
  totalReviewScore: number;
  // Derived
  successRate: number;
  avgLatency: number;
  avgReviewScore: number;
  lastUpdated: number;
}

export class RuntimeMetrics {
  private metrics: Map<string, RuntimeMetric> = new Map();

  constructor() {
    fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
    this.loadPersisted();
  }

  record(runtimeId: string, opts: { success: boolean; latencyMs: number; reviewScore?: number }): void {
    let m = this.metrics.get(runtimeId);
    if (!m) {
      m = {
        runtimeId,
        taskCount: 0,
        successCount: 0,
        failureCount: 0,
        totalLatency: 0,
        totalReviewScore: 0,
        successRate: 0,
        avgLatency: 0,
        avgReviewScore: 0,
        lastUpdated: Date.now(),
      };
      this.metrics.set(runtimeId, m);
    }

    m.taskCount++;
    if (opts.success) m.successCount++;
    else m.failureCount++;
    m.totalLatency += opts.latencyMs;
    if (opts.reviewScore !== undefined) m.totalReviewScore += opts.reviewScore;

    m.successRate = m.taskCount > 0 ? m.successCount / m.taskCount : 0;
    m.avgLatency = m.taskCount > 0 ? m.totalLatency / m.taskCount : 0;
    m.avgReviewScore = m.taskCount > 0 ? m.totalReviewScore / m.taskCount : 0;
    m.lastUpdated = Date.now();

    this.persist();
  }

  get(runtimeId: string): RuntimeMetric | undefined {
    return this.metrics.get(runtimeId);
  }

  all(): RuntimeMetric[] {
    return Array.from(this.metrics.values());
  }

  format(): string {
    const all = this.all();
    if (all.length === 0) return "No metrics recorded.";

    const lines: string[] = [];
    lines.push("Runtime Metrics:");
    lines.push("─".repeat(60));
    lines.push(
      "Runtime".padEnd(12) +
      "Tasks".padStart(6) +
      "Success".padStart(8) +
      "Latency".padStart(10) +
      "Score".padStart(8)
    );
    lines.push("─".repeat(60));

    for (const m of all.sort((a, b) => b.taskCount - a.taskCount)) {
      lines.push(
        m.runtimeId.padEnd(12) +
        String(m.taskCount).padStart(6) +
        (m.successRate * 100).toFixed(0).padStart(7) + "%" +
        m.avgLatency.toFixed(0).padStart(8) + "ms" +
        m.avgReviewScore.toFixed(1).padStart(8)
      );
    }

    return lines.join("\n");
  }

  private persist(): void {
    const data: Record<string, RuntimeMetric> = {};
    for (const [k, v] of this.metrics) data[k] = v;
    fs.writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2));
  }

  private loadPersisted(): void {
    if (!fs.existsSync(METRICS_FILE)) return;
    try {
      const data = JSON.parse(fs.readFileSync(METRICS_FILE, "utf-8"));
      for (const [k, v] of Object.entries(data)) {
        this.metrics.set(k, v as RuntimeMetric);
      }
    } catch {}
  }
}

import * as fs from "fs";
import * as path from "path";

const STATS_FILE = path.resolve(process.cwd(), ".agent-hive/runtime-stats.json");

export interface RuntimeStats {
  runtimeId: string;
  successCount: number;
  failureCount: number;
  totalLatency: number;
  totalReviewScore: number;
  totalRevisionCount: number;
  taskCount: number;
  // Derived
  successRate: number;
  avgLatency: number;
  avgReviewScore: number;
  avgRevisionCount: number;
}

export interface TaskRecord {
  runtimeId: string;
  role: "executor" | "reviewer";
  success: boolean;
  latencyMs: number;
  reviewScore?: number;
  revisionCount?: number;
}

export class RuntimeScoreManager {
  private stats: Map<string, RuntimeStats> = new Map();

  constructor() {
    this.loadPersisted();
  }

  /**
   * Record a completed task for a runtime.
   */
  record(record: TaskRecord): void {
    let stats = this.stats.get(record.runtimeId);
    if (!stats) {
      stats = {
        runtimeId: record.runtimeId,
        successCount: 0,
        failureCount: 0,
        totalLatency: 0,
        totalReviewScore: 0,
        totalRevisionCount: 0,
        taskCount: 0,
        successRate: 0,
        avgLatency: 0,
        avgReviewScore: 0,
        avgRevisionCount: 0,
      };
      this.stats.set(record.runtimeId, stats);
    }

    stats.taskCount++;
    if (record.success) stats.successCount++;
    else stats.failureCount++;
    stats.totalLatency += record.latencyMs;
    if (record.reviewScore !== undefined) stats.totalReviewScore += record.reviewScore;
    if (record.revisionCount !== undefined) stats.totalRevisionCount += record.revisionCount;

    // Recalculate derived
    stats.successRate = stats.taskCount > 0 ? stats.successCount / stats.taskCount : 0;
    stats.avgLatency = stats.taskCount > 0 ? stats.totalLatency / stats.taskCount : 0;
    const reviewTasks = stats.successCount + stats.failureCount;
    stats.avgReviewScore = reviewTasks > 0 ? stats.totalReviewScore / reviewTasks : 0;
    stats.avgRevisionCount = reviewTasks > 0 ? stats.totalRevisionCount / reviewTasks : 0;

    this.persist();
  }

  /**
   * Get stats for a runtime.
   */
  get(runtimeId: string): RuntimeStats | undefined {
    return this.stats.get(runtimeId);
  }

  /**
   * Get all stats.
   */
  all(): RuntimeStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get normalized score for a runtime (0-1).
   * Weighted combination of success rate, latency, review score.
   */
  getScore(runtimeId: string, weights?: { success?: number; latency?: number; review?: number }): number {
    const stats = this.stats.get(runtimeId);
    if (!stats || stats.taskCount === 0) return 0.5; // Default for unknown

    const w = {
      success: weights?.success ?? 0.4,
      latency: weights?.latency ?? 0.3,
      review: weights?.review ?? 0.3,
    };

    // Normalize latency (lower is better, cap at 60s)
    const latencyScore = Math.max(0, 1 - stats.avgLatency / 60_000);
    // Normalize review score (0-100 → 0-1)
    const reviewScore = stats.avgReviewScore / 100;

    return (
      w.success * stats.successRate +
      w.latency * latencyScore +
      w.review * reviewScore
    );
  }

  private persist(): void {
    const data: Record<string, RuntimeStats> = {};
    for (const [k, v] of this.stats) data[k] = v;
    fs.mkdirSync(path.dirname(STATS_FILE), { recursive: true });
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));
  }

  private loadPersisted(): void {
    if (!fs.existsSync(STATS_FILE)) return;
    try {
      const data = JSON.parse(fs.readFileSync(STATS_FILE, "utf-8"));
      for (const [k, v] of Object.entries(data)) {
        this.stats.set(k, v as RuntimeStats);
      }
    } catch {}
  }
}

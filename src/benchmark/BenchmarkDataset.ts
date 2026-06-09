import * as fs from "fs";
import * as path from "path";

const BENCHMARK_FILE = path.resolve(process.cwd(), ".agent-hive/benchmark/runtime-benchmark.json");

export interface RuntimeBenchmark {
  runtimeId: string;
  coding: number;
  review: number;
  planning: number;
  reasoning: number;
  latency: number;
  successRate: number;
  updatedAt: number;
}

export class BenchmarkDataset {
  private data: Map<string, RuntimeBenchmark> = new Map();

  constructor() {
    fs.mkdirSync(path.dirname(BENCHMARK_FILE), { recursive: true });
    this.loadPersisted();
  }

  set(benchmark: RuntimeBenchmark): void {
    benchmark.updatedAt = Date.now();
    this.data.set(benchmark.runtimeId, benchmark);
    this.persist();
  }

  get(runtimeId: string): RuntimeBenchmark | undefined {
    return this.data.get(runtimeId);
  }

  all(): RuntimeBenchmark[] {
    return Array.from(this.data.values());
  }

  /**
   * Get benchmark score for a specific category.
   */
  getCategoryScore(runtimeId: string, category: string): number {
    const b = this.data.get(runtimeId);
    if (!b) return 0;
    switch (category) {
      case "coding": return b.coding;
      case "review": return b.review;
      case "planning": return b.planning;
      case "reasoning": return b.reasoning;
      default: return 0;
    }
  }

  /**
   * Get overall benchmark score (weighted average).
   */
  getOverallScore(runtimeId: string): number {
    const b = this.data.get(runtimeId);
    if (!b) return 0;
    return (b.coding * 0.3 + b.review * 0.25 + b.planning * 0.25 + b.reasoning * 0.2);
  }

  private persist(): void {
    const data: Record<string, RuntimeBenchmark> = {};
    for (const [k, v] of this.data) data[k] = v;
    fs.writeFileSync(BENCHMARK_FILE, JSON.stringify(data, null, 2));
  }

  private loadPersisted(): void {
    if (!fs.existsSync(BENCHMARK_FILE)) return;
    try {
      const data = JSON.parse(fs.readFileSync(BENCHMARK_FILE, "utf-8"));
      for (const [k, v] of Object.entries(data)) {
        this.data.set(k, v as RuntimeBenchmark);
      }
    } catch {}
  }
}

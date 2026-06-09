import { BenchmarkDataset, RuntimeBenchmark } from "./BenchmarkDataset";
import { BenchmarkResult } from "./BenchmarkSuite";
import * as fs from "fs";
import * as path from "path";

const REPORTS_DIR = path.resolve(process.cwd(), ".agent-hive/reports");

export class BenchmarkReport {
  private dataset: BenchmarkDataset;

  constructor(dataset: BenchmarkDataset) {
    this.dataset = dataset;
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  /**
   * Generate JSON report.
   */
  generateJSON(allResults: Map<string, BenchmarkResult[]>): object {
    const rankings = this.getRankings();
    const details: Record<string, any> = {};

    for (const [runtime, results] of allResults) {
      details[runtime] = {
        benchmark: this.dataset.get(runtime),
        results: results.map(r => ({
          caseId: r.caseId,
          category: r.category,
          score: r.score,
          latencyMs: r.latencyMs,
          success: r.success,
        })),
      };
    }

    const report = {
      timestamp: new Date().toISOString(),
      rankings,
      details,
    };

    const fp = path.join(REPORTS_DIR, "benchmark-report.json");
    fs.writeFileSync(fp, JSON.stringify(report, null, 2));
    return report;
  }

  /**
   * Generate Markdown report.
   */
  generateMarkdown(): string {
    const rankings = this.getRankings();
    const lines: string[] = [];

    lines.push("# Runtime Benchmark Report");
    lines.push(`> Generated: ${new Date().toISOString()}`);
    lines.push("");

    // Overall ranking
    lines.push("## Overall Ranking");
    lines.push("");
    lines.push("| Rank | Runtime | Score | Coding | Review | Planning | Reasoning | Latency |");
    lines.push("|------|---------|-------|--------|--------|----------|-----------|---------|");

    rankings.overall.forEach((r, i) => {
      const b = this.dataset.get(r.runtimeId)!;
      lines.push(`| ${i + 1} | ${r.runtimeId} | **${r.score}** | ${b.coding} | ${b.review} | ${b.planning} | ${b.reasoning} | ${b.latency}ms |`);
    });

    // Per-category rankings
    for (const category of ["coding", "review", "planning", "reasoning"] as const) {
      lines.push("");
      lines.push(`## ${category.charAt(0).toUpperCase() + category.slice(1)} Ranking`);
      lines.push("");
      lines.push("| Rank | Runtime | Score |");
      lines.push("|------|---------|-------|");

      const catRankings = rankings[category];
      catRankings.forEach((r, i) => {
        lines.push(`| ${i + 1} | ${r.runtimeId} | ${r.score} |`);
      });
    }

    // Best runtime per category
    lines.push("");
    lines.push("## Best Runtime per Category");
    lines.push("");
    for (const category of ["coding", "review", "planning", "reasoning"] as const) {
      const best = rankings[category][0];
      if (best) {
        lines.push(`- **${category}**: ${best.runtimeId} (${best.score})`);
      }
    }

    const md = lines.join("\n");
    const fp = path.join(REPORTS_DIR, "benchmark-report.md");
    fs.writeFileSync(fp, md);
    return md;
  }

  /**
   * Get rankings for each category and overall.
   */
  getRankings(): {
    overall: { runtimeId: string; score: number }[];
    coding: { runtimeId: string; score: number }[];
    review: { runtimeId: string; score: number }[];
    planning: { runtimeId: string; score: number }[];
    reasoning: { runtimeId: string; score: number }[];
  } {
    const all = this.dataset.all();

    const rankBy = (getter: (b: RuntimeBenchmark) => number) =>
      all
        .map(b => ({ runtimeId: b.runtimeId, score: Math.round(getter(b)) }))
        .sort((a, b) => b.score - a.score);

    return {
      overall: rankBy(b => this.dataset.getOverallScore(b.runtimeId)),
      coding: rankBy(b => b.coding),
      review: rankBy(b => b.review),
      planning: rankBy(b => b.planning),
      reasoning: rankBy(b => b.reasoning),
    };
  }

  /**
   * Format rankings as text table.
   */
  formatRankings(): string {
    const rankings = this.getRankings();
    const lines: string[] = [];

    lines.push("Runtime Benchmark Rankings:");
    lines.push("─".repeat(65));
    lines.push("Rank  Runtime     Overall  Coding  Review  Planning  Reasoning");
    lines.push("─".repeat(65));

    rankings.overall.forEach((r, i) => {
      const b = this.dataset.get(r.runtimeId)!;
      lines.push(
        `${(i + 1).toString().padStart(4)}  ${r.runtimeId.padEnd(11)} ${r.score.toString().padStart(7)}  ${b.coding.toString().padStart(6)}  ${b.review.toString().padStart(6)}  ${b.planning.toString().padStart(8)}  ${b.reasoning.toString().padStart(9)}`
      );
    });

    return lines.join("\n");
  }
}

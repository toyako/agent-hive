/**
 * ObservationDashboard — read-only observation layer.
 * Aggregates Stability Engine data into actionable metrics.
 * Does NOT modify execution, routing, or stability logic.
 */
import { StabilityEngine, StabilityRecord, StabilityWindowStats } from "../stability/StabilityEngine";
import { StabilityCurveGenerator, StabilityCurve } from "./StabilityCurve";
import { EventStore, ObservationEvent } from "./EventStore";

export interface CoreMetrics {
  consecutive_stable: number;
  stability_tier: string;
  reset_frequency: number;
  hidden_failure_rate: number;
  human_override_rate: number;
  blind_eval_coverage: number;
}

export interface FailureHeatmap {
  execution_failure: number;
  reasoning_failure: number;
  reviewer_failure: number;
  silent_failure: number;
  context_failure: number;
  human_override: number;
  input_exception: number;
  dominant_type: string;
}

export interface ResetAnalysis {
  total_resets: number;
  top_triggers: { agent: string; count: number }[];
  agent_instability: { agent: string; rate: number }[];
}

export interface SystemDrift {
  drift_score: number;
  trend: "stable" | "degrading" | "improving";
  reviewer_bias_drift: number;
  output_variance: number;
}

export interface Confidence {
  data_completeness: number;
  signal_noise_ratio: number;
  sampling_coverage: number;
  overall: number;
}

export interface DashboardSnapshot {
  timestamp: string;
  core: CoreMetrics;
  failure_heatmap: FailureHeatmap;
  reset_analysis: ResetAnalysis;
  system_drift: SystemDrift;
  confidence: Confidence;
}

export class ObservationDashboard {
  private engine: StabilityEngine;
  private curveGen: StabilityCurveGenerator;
  private eventStore: EventStore;

  constructor(engine: StabilityEngine) {
    this.engine = engine;
    this.curveGen = new StabilityCurveGenerator();
    this.eventStore = new EventStore();
  }

  /** Get stability curve */
  getCurve(windowSize = 30): StabilityCurve {
    return this.curveGen.generate(this.engine.getRecords(), windowSize);
  }

  /** Get event store */
  getEventStore(): EventStore {
    return this.eventStore;
  }

  /** Record an observation event */
  recordEvent(event: Omit<ObservationEvent, "event_id">): ObservationEvent {
    return this.eventStore.record(event);
  }

  /** Check if output rhythm trigger is met */
  checkRhythm(): { snapshot: boolean; trend: boolean; evolution: boolean } {
    const count = this.eventStore.count();
    return {
      snapshot: count > 0 && count % 10 === 0,
      trend: count > 0 && count % 30 === 0,
      evolution: count > 0 && count % 100 === 0,
    };
  }

  /** Generate a full dashboard snapshot */
  snapshot(): DashboardSnapshot {
    const stats = this.engine.getStats();
    const records = this.engine.getRecords();

    return {
      timestamp: new Date().toISOString(),
      core: this.computeCoreMetrics(stats),
      failure_heatmap: this.computeFailureHeatmap(records),
      reset_analysis: this.computeResetAnalysis(records),
      system_drift: this.computeSystemDrift(records),
      confidence: this.computeConfidence(records),
    };
  }

  /** Format snapshot as text dashboard */
  format(snapshot: DashboardSnapshot): string {
    const lines: string[] = [];
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("Agent Hive — Observation Dashboard");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("");

    // Core Metrics
    lines.push("📊 Core Metrics");
    lines.push(`  Consecutive Stable: ${snapshot.core.consecutive_stable}`);
    lines.push(`  Stability Tier: ${snapshot.core.stability_tier}`);
    lines.push(`  Reset Frequency: ${(snapshot.core.reset_frequency * 100).toFixed(1)}%`);
    lines.push(`  Hidden Failure Rate: ${(snapshot.core.hidden_failure_rate * 100).toFixed(1)}%`);
    lines.push(`  Human Override Rate: ${(snapshot.core.human_override_rate * 100).toFixed(1)}%`);
    lines.push("");

    // Failure Heatmap
    lines.push("🔥 Failure Heatmap");
    const hm = snapshot.failure_heatmap;
    const types = ["execution_failure", "reasoning_failure", "reviewer_failure", "silent_failure", "context_failure", "human_override", "input_exception"];
    for (const t of types) {
      const count = (hm as any)[t] || 0;
      if (count > 0) lines.push(`  ${t}: ${count}`);
    }
    lines.push(`  Dominant: ${hm.dominant_type || "none"}`);
    lines.push("");

    // Reset Analysis
    lines.push("🔄 Reset Analysis");
    lines.push(`  Total Resets: ${snapshot.reset_analysis.total_resets}`);
    for (const t of snapshot.reset_analysis.top_triggers.slice(0, 3)) {
      lines.push(`  ${t.agent}: ${t.count} resets`);
    }
    lines.push("");

    // System Drift
    lines.push("📈 System Drift");
    lines.push(`  Drift Score: ${snapshot.system_drift.drift_score.toFixed(2)}`);
    lines.push(`  Trend: ${snapshot.system_drift.trend}`);
    lines.push("");

    // Confidence
    lines.push("🎯 Confidence");
    lines.push(`  Data Completeness: ${(snapshot.confidence.data_completeness * 100).toFixed(0)}%`);
    lines.push(`  Signal/Noise: ${(snapshot.confidence.signal_noise_ratio * 100).toFixed(0)}%`);
    lines.push(`  Overall: ${(snapshot.confidence.overall * 100).toFixed(0)}%`);
    lines.push("");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return lines.join("\n");
  }

  private computeCoreMetrics(stats: StabilityWindowStats): CoreMetrics {
    return {
      consecutive_stable: stats.total_stable,
      stability_tier: this.engine.getTier(),
      reset_frequency: stats.failure_density,
      hidden_failure_rate: stats.hidden_failure_rate,
      human_override_rate: 0, // Tracked separately
      blind_eval_coverage: 0, // Tracked by TaskQualityGate
    };
  }

  private computeFailureHeatmap(records: StabilityRecord[]): FailureHeatmap {
    const counts: Record<string, number> = {
      execution_failure: 0, reasoning_failure: 0, reviewer_failure: 0,
      silent_failure: 0, context_failure: 0, human_override: 0, input_exception: 0,
    };

    for (const r of records) {
      if (r.failure_type && r.failure_type in counts) {
        counts[r.failure_type]++;
      }
    }

    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

    return {
      ...counts,
      dominant_type: dominant[1] > 0 ? dominant[0] : "none",
    } as FailureHeatmap;
  }

  private computeResetAnalysis(records: StabilityRecord[]): ResetAnalysis {
    const resets = records.filter(r => !r.stable);
    const agentCounts: Record<string, number> = {};

    for (const r of resets) {
      const agent = r.reset_agent || "unknown";
      agentCounts[agent] = (agentCounts[agent] || 0) + 1;
    }

    const topTriggers = Object.entries(agentCounts)
      .map(([agent, count]) => ({ agent, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total_resets: resets.length,
      top_triggers: topTriggers,
      agent_instability: topTriggers.map(t => ({
        agent: t.agent,
        rate: records.length > 0 ? t.count / records.length : 0,
      })),
    };
  }

  private computeSystemDrift(records: StabilityRecord[]): SystemDrift {
    if (records.length < 10) {
      return { drift_score: 0, trend: "stable", reviewer_bias_drift: 0, output_variance: 0 };
    }

    // Compare first half vs second half failure rates
    const mid = Math.floor(records.length / 2);
    const firstHalf = records.slice(0, mid);
    const secondHalf = records.slice(mid);

    const firstFailRate = firstHalf.filter(r => !r.stable).length / (firstHalf.length || 1);
    const secondFailRate = secondHalf.filter(r => !r.stable).length / (secondHalf.length || 1);

    const driftScore = Math.abs(secondFailRate - firstFailRate);
    let trend: SystemDrift["trend"] = "stable";
    if (secondFailRate > firstFailRate + 0.1) trend = "degrading";
    else if (secondFailRate < firstFailRate - 0.1) trend = "improving";

    return {
      drift_score: Math.min(1, driftScore),
      trend,
      reviewer_bias_drift: 0,
      output_variance: driftScore,
    };
  }

  private computeConfidence(records: StabilityRecord[]): Confidence {
    const dataCompleteness = records.length > 0 ? 1.0 : 0;
    const totalStable = records.filter(r => r.stable).length;
    const snr = records.length > 0 ? totalStable / records.length : 0;
    const coverage = Math.min(1, records.length / 30); // 30 tasks = full coverage

    return {
      data_completeness: dataCompleteness,
      signal_noise_ratio: snr,
      sampling_coverage: coverage,
      overall: (dataCompleteness + snr + coverage) / 3,
    };
  }
}

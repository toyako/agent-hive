/**
 * FailureIntelligence — early signal detection layer.
 * Pure observation. No execution modification.
 */
import { StabilityRecord, StabilityWindowStats } from "../stability/StabilityEngine";

export interface FailureSignal {
  signal_type: string;
  frequency: number;
  severity: "LOW" | "MEDIUM" | "HIGH";
  affected_task_ids: string[];
  signal_strength: number;
  false_positive_risk: number;
  confirmation_required: boolean;
  origin_layer: string;
}

export interface FailureIntelligenceReport {
  timestamp: string;
  early_signals: FailureSignal[];
  silent_failure: { rate: number; clusters: string[]; reviewer_correlation: number };
  reviewer_bias: { over_permissive: number; over_restrictive: number; pattern_repetition: boolean };
  executor_variance: { output_variance: number; context_sensitivity: number };
  drift: { score: number; direction: "stable" | "degrading" | "unstable"; confidence: number };
  collapse_precursor: { risk_level: "LOW" | "MEDIUM" | "HIGH"; triggers: string[]; explanation: string };
  cross_layer_consistency: { consistent: boolean; mismatches: string[] };
  false_positive_analysis: { total_signals: number; confirmed: number; unconfirmed: number };
  causal_attribution: { attributed: number; unattributed: number; by_layer: Record<string, number> };
  overall_confidence: number;
  system_health: "HEALTHY" | "WARNING" | "CRITICAL";
}

export class FailureIntelligence {
  /** Analyze records and produce intelligence report */
  analyze(records: StabilityRecord[]): FailureIntelligenceReport {
    const earlySignals = this.detectEarlySignals(records);
    const silentFailure = this.analyzeSilentFailures(records);
    const reviewerBias = this.detectReviewerBias(records);
    const executorVariance = this.analyzeExecutorVariance(records);
    const drift = this.detectDrift(records);
    const collapse = this.detectCollapsePrecursor(records, silentFailure, drift);
    const crossLayer = this.checkCrossLayerConsistency(records);
    const fpAnalysis = this.analyzeFalsePositives(earlySignals);
    const causal = this.attributeCausality(records, earlySignals);
    const confidence = this.aggregateConfidence(earlySignals);

    return {
      timestamp: new Date().toISOString(),
      early_signals: earlySignals,
      silent_failure: silentFailure,
      reviewer_bias: reviewerBias,
      executor_variance: executorVariance,
      drift,
      collapse_precursor: collapse,
      cross_layer_consistency: crossLayer,
      false_positive_analysis: fpAnalysis,
      causal_attribution: causal,
      overall_confidence: confidence,
      system_health: this.determineHealth(collapse, drift, silentFailure),
    };
  }

  private detectEarlySignals(records: StabilityRecord[]): FailureSignal[] {
    const signals: FailureSignal[] = [];

    // High-frequency reset burst (3+ resets in last 10 tasks)
    const recent = records.slice(-10);
    const recentResets = recent.filter(r => !r.stable);
    if (recentResets.length >= 3) {
      signals.push({
        signal_type: "high_frequency_reset_burst",
        frequency: recentResets.length,
        severity: recentResets.length >= 5 ? "HIGH" : "MEDIUM",
        affected_task_ids: recentResets.map(r => r.task_id),
        signal_strength: Math.min(1, recentResets.length / 5),
        false_positive_risk: 0.1,
        confirmation_required: recentResets.length < 5,
        origin_layer: "Stability Engine",
      });
    }

    // Silent failure spike
    const silentFailures = records.filter(r => r.failure_type === "silent_failure");
    if (silentFailures.length > 0) {
      const rate = silentFailures.length / records.length;
      signals.push({
        signal_type: "silent_failure_spike",
        frequency: silentFailures.length,
        severity: rate > 0.1 ? "HIGH" : rate > 0.05 ? "MEDIUM" : "LOW",
        affected_task_ids: silentFailures.map(r => r.task_id),
        signal_strength: rate,
        false_positive_risk: 0.2,
        confirmation_required: rate < 0.1,
        origin_layer: "Reviewer",
      });
    }

    // Short-window instability (5+ tasks, >50% failure)
    if (records.length >= 5) {
      const window5 = records.slice(-5);
      const failRate = window5.filter(r => !r.stable).length / 5;
      if (failRate > 0.5) {
        signals.push({
          signal_type: "short_window_instability",
          frequency: window5.filter(r => !r.stable).length,
          severity: "HIGH",
          affected_task_ids: window5.filter(r => !r.stable).map(r => r.task_id),
          signal_strength: failRate,
          false_positive_risk: 0.05,
          confirmation_required: false,
          origin_layer: "System",
        });
      }
    }

    return signals;
  }

  private analyzeSilentFailures(records: StabilityRecord[]) {
    const silent = records.filter(r => r.failure_type === "silent_failure");
    const rate = records.length > 0 ? silent.length / records.length : 0;

    // Clustering: consecutive silent failures
    const clusters: string[] = [];
    let cluster: string[] = [];
    for (const r of records) {
      if (r.failure_type === "silent_failure") {
        cluster.push(r.task_id);
      } else {
        if (cluster.length >= 2) clusters.push(cluster.join(","));
        cluster = [];
      }
    }
    if (cluster.length >= 2) clusters.push(cluster.join(","));

    return { rate, clusters, reviewer_correlation: rate > 0 ? 1 : 0 };
  }

  private detectReviewerBias(records: StabilityRecord[]) {
    const reviewerResets = records.filter(r => r.reset_agent === "Reviewer");
    const total = records.length || 1;

    return {
      over_permissive: reviewerResets.filter(r => r.failure_type === "silent_failure").length / total,
      over_restrictive: reviewerResets.filter(r => r.failure_type === "reviewer_failure").length / total,
      pattern_repetition: false,
    };
  }

  private analyzeExecutorVariance(records: StabilityRecord[]) {
    const execFailures = records.filter(r => r.failure_type === "execution_failure");
    return {
      output_variance: records.length > 0 ? execFailures.length / records.length : 0,
      context_sensitivity: 0,
    };
  }

  private detectDrift(records: StabilityRecord[]): FailureIntelligenceReport["drift"] {
    if (records.length < 10) return { score: 0, direction: "stable", confidence: 0.3 };

    const mid = Math.floor(records.length / 2);
    const first = records.slice(0, mid);
    const second = records.slice(mid);

    const firstFailRate = first.filter(r => !r.stable).length / (first.length || 1);
    const secondFailRate = second.filter(r => !r.stable).length / (second.length || 1);
    const diff = secondFailRate - firstFailRate;

    let direction: "stable" | "degrading" | "unstable" = "stable";
    if (diff > 0.15) direction = "degrading";
    else if (diff < -0.15) direction = "unstable"; // improving but unexpected

    return {
      score: Math.min(1, Math.abs(diff) * 2),
      direction,
      confidence: Math.min(1, records.length / 30),
    };
  }

  private detectCollapsePrecursor(records: StabilityRecord[], silent: { rate: number }, drift: { score: number }): FailureIntelligenceReport["collapse_precursor"] {
    const triggers: string[] = [];
    let risk = 0;

    // Stable increasing while hidden failure increasing
    if (silent.rate > 0.05 && records.filter(r => r.stable).length > records.length * 0.8) {
      triggers.push("stable_inflation_with_hidden_failures");
      risk += 0.4;
    }

    // Reset clustering
    const recent = records.slice(-10);
    if (recent.filter(r => !r.stable).length >= 3) {
      triggers.push("reset_clustering");
      risk += 0.3;
    }

    // High drift
    if (drift.score > 0.5) {
      triggers.push("high_drift");
      risk += 0.3;
    }

    const riskLevel = risk >= 0.7 ? "HIGH" : risk >= 0.4 ? "MEDIUM" : "LOW";

    return {
      risk_level: riskLevel,
      triggers,
      explanation: triggers.length > 0 ? `Detected: ${triggers.join(", ")}` : "No collapse precursors detected",
    };
  }

  private checkCrossLayerConsistency(records: StabilityRecord[]): { consistent: boolean; mismatches: string[] } {
    const mismatches: string[] = [];

    // Check: failure count > 0 but reset count = 0
    const failures = records.filter(r => !r.stable);
    const resets = records.filter(r => r.reset_agent !== null);
    if (failures.length > 0 && resets.length === 0) {
      mismatches.push("failures_detected_but_no_resets_recorded");
    }

    return { consistent: mismatches.length === 0, mismatches };
  }

  private analyzeFalsePositives(signals: FailureSignal[]) {
    const confirmed = signals.filter(s => s.signal_strength > 0.5 && s.false_positive_risk < 0.3).length;
    const unconfirmed = signals.filter(s => s.confirmation_required).length;

    return {
      total_signals: signals.length,
      confirmed,
      unconfirmed,
    };
  }

  private attributeCausality(records: StabilityRecord[], signals: FailureSignal[]) {
    const byLayer: Record<string, number> = { Executor: 0, Reviewer: 0, System: 0, External: 0 };
    for (const r of records.filter(r => !r.stable)) {
      if (r.reset_agent === "Reviewer") byLayer["Reviewer"]++;
      else if (r.failure_type === "execution_failure") byLayer["Executor"]++;
      else byLayer["System"]++;
    }

    const attributed = Object.values(byLayer).reduce((a, b) => a + b, 0);
    return { attributed, unattributed: 0, by_layer: byLayer };
  }

  private aggregateConfidence(signals: FailureSignal[]): number {
    if (signals.length === 0) return 1;

    const weights: Record<string, number> = {
      collapse_precursor: 2.0,
      silent_failure_spike: 1.5,
      drift: 1.2,
      high_frequency_reset_burst: 1.0,
      short_window_instability: 1.0,
    };

    let totalWeight = 0;
    let weightedSum = 0;
    for (const s of signals) {
      const w = weights[s.signal_type] || 1;
      totalWeight += w;
      weightedSum += s.signal_strength * w;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 1;
  }

  private determineHealth(collapse: { risk_level: string }, drift: { score: number }, silent: { rate: number }): "HEALTHY" | "WARNING" | "CRITICAL" {
    if (collapse.risk_level === "HIGH") return "CRITICAL";
    if (drift.score > 0.5 || silent.rate > 0.1) return "WARNING";
    return "HEALTHY";
  }

  /** Format report as text */
  format(report: FailureIntelligenceReport): string {
    const lines: string[] = [];
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("Failure Intelligence Report");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push(`Health: ${report.system_health}`);
    lines.push(`Confidence: ${(report.overall_confidence * 100).toFixed(0)}%`);
    lines.push("");
    lines.push(`Early Signals: ${report.early_signals.length}`);
    for (const s of report.early_signals) {
      lines.push(`  [${s.severity}] ${s.signal_type} (strength=${s.signal_strength.toFixed(2)}, fp_risk=${s.false_positive_risk.toFixed(2)})`);
    }
    lines.push("");
    lines.push(`Silent Failures: ${(report.silent_failure.rate * 100).toFixed(1)}%`);
    lines.push(`Drift: ${report.drift.direction} (score=${report.drift.score.toFixed(2)})`);
    lines.push(`Collapse Risk: ${report.collapse_precursor.risk_level}`);
    if (report.collapse_precursor.triggers.length > 0) {
      lines.push(`  Triggers: ${report.collapse_precursor.triggers.join(", ")}`);
    }
    lines.push("");
    lines.push(`Cross-layer Consistent: ${report.cross_layer_consistency.consistent}`);
    lines.push(`Causal Attribution: ${report.causal_attribution.attributed} attributed`);
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return lines.join("\n");
  }
}

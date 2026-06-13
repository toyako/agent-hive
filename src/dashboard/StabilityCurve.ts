/**
 * StabilityCurve — time series of stability events.
 * X: event_timestamp, Y: stable=1 / failure=0
 */
import { StabilityRecord } from "../stability/StabilityEngine";

export interface CurvePoint {
  timestamp: string;
  value: number; // 1 = stable, 0 = failure
  task_id: string;
  failure_type: string | null;
}

export interface StabilityCurve {
  points: CurvePoint[];
  moving_average: number[];
  window_size: number;
}

export class StabilityCurveGenerator {
  /** Generate stability curve from records */
  generate(records: StabilityRecord[], windowSize = 30): StabilityCurve {
    const points: CurvePoint[] = records.map(r => ({
      timestamp: r.timestamp,
      value: r.stable ? 1 : 0,
      task_id: r.task_id,
      failure_type: r.failure_type,
    }));

    // Moving average
    const movingAvg: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = points.slice(start, i + 1);
      const avg = window.reduce((s, p) => s + p.value, 0) / window.length;
      movingAvg.push(avg);
    }

    return { points, moving_average: movingAvg, window_size: windowSize };
  }

  /** Format as ASCII chart */
  format(curve: StabilityCurve, width = 60): string {
    const lines: string[] = [];
    const recent = curve.points.slice(-width);

    if (recent.length === 0) return "  (no data)";

    // Stabil ity line
    let line = "  ";
    for (const p of recent) {
      line += p.value === 1 ? "█" : "░";
    }
    lines.push(line);

    // Moving average
    const recentAvg = curve.moving_average.slice(-width);
    let avgLine = "  ";
    for (const a of recentAvg) {
      if (a >= 0.8) avgLine += "█";
      else if (a >= 0.5) avgLine += "▓";
      else if (a >= 0.2) avgLine += "▒";
      else avgLine += "░";
    }
    lines.push(avgLine);

    return lines.join("\n");
  }
}

/**
 * OddsEngine — 庄家赔率与资金流向特征
 */

export interface OddsData {
  matchId: string;
  bookmaker: string;
  timestamp: string;
  team1Win: number;          // 赔率
  draw: number;
  team2Win: number;
  overUnder25: number;       // 大小球2.5
}

export interface OddsMovement {
  matchId: string;
  initialOdds: OddsData;
  currentOdds: OddsData;
  team1Drift: number;        // 赔率漂移 (-1 ~ +1)
  drawDrift: number;
  team2Drift: number;
  volumeSpike: boolean;      // 资金异动
  hiddenSignal: boolean;     // 隐藏利空信号
}

export interface OddsSignal {
  matchId: string;
  impliedProbability: { team1: number; draw: number; team2: number };
  marketConfidence: number;  // 市场置信度
  oddsAnomaly: boolean;      // 赔率异常
  reverseSteam: boolean;     // 反向资金流
  recommendation: string;
}

export class OddsEngine {
  /** 将赔率转换为隐含概率 */
  oddsToProbability(odds: OddsData): { team1: number; draw: number; team2: number } {
    const margin = 1 / odds.team1Win + 1 / odds.draw + 1 / odds.team2Win;
    return {
      team1: (1 / odds.team1Win) / margin,
      draw: (1 / odds.draw) / margin,
      team2: (1 / odds.team2Win) / margin,
    };
  }

  /** 检测赔率漂移 */
  detectDrift(initial: OddsData, current: OddsData): OddsMovement {
    const drift1 = (current.team1Win - initial.team1Win) / initial.team1Win;
    const driftD = (current.draw - initial.draw) / initial.draw;
    const drift2 = (current.team2Win - initial.team2Win) / initial.team2Win;

    // 赔率异常飙升 (>15% 变化)
    const anomaly = Math.abs(drift1) > 0.15 || Math.abs(drift2) > 0.15;

    // 反向资金流: 赔率上升但市场预期下降
    const reverseSteam = drift1 > 0.1 && drift2 < -0.05;

    return {
      matchId: current.matchId,
      initialOdds: initial,
      currentOdds: current,
      team1Drift: drift1,
      drawDrift: driftD,
      team2Drift: drift2,
      volumeSpike: anomaly,
      hiddenSignal: anomaly || reverseSteam,
    };
  }

  /** 生成赔率信号 */
  analyze(odds: OddsData, movement?: OddsMovement): OddsSignal {
    const prob = this.oddsToProbability(odds);

    return {
      matchId: odds.matchId,
      impliedProbability: prob,
      marketConfidence: 1 - Math.abs(prob.team1 - prob.team2),
      oddsAnomaly: movement?.volumeSpike || false,
      reverseSteam: movement?.reverseSteam || false,
      recommendation: movement?.hiddenSignal
        ? "WARNING: Odds anomaly detected — possible hidden information"
        : "Normal market movement",
    };
  }
}

/**
 * RefereeProfileEngine — 裁判执法画像引擎
 */

export interface RefereeProfile {
  name: string;
  nationality: string;
  avgYellowCards: number;    // 场均黄牌
  avgRedCards: number;       // 场均红牌
  penaltyRate: number;       // 场均点球率
  homeBias: number;          // 主场哨偏向 (-0.1 ~ +0.1)
  strictness: "lenient" | "average" | "strict" | "very_strict";
  matchesOfficiated: number;
}

export interface RefereeEffect {
  yellowRisk: number;        // 黄牌风险修正
  redRisk: number;           // 红牌风险修正
  penaltyRisk: number;       // 点球风险修正
  team1Modifier: number;     // 对球队1的胜率修正
  team2Modifier: number;
}

export class RefereeEngine {
  /** 计算裁判效应 */
  calculateEffect(referee: RefereeProfile, team1Style: string, team2Style: string): RefereeEffect {
    const baseStrictness = referee.avgYellowCards / 4; // 4张黄牌为基准

    // 粗犷球队遇到严厉裁判: 高减员风险
    const aggressiveStyles = ["park_the_bus", "direct_play", "gegenpressing"];
    const t1Aggressive = aggressiveStyles.includes(team1Style) ? 1 : 0;
    const t2Aggressive = aggressiveStyles.includes(team2Style) ? 1 : 0;

    const yellowRisk = baseStrictness * 0.3;
    const redRisk = referee.avgRedCards * 0.15;
    const penaltyRisk = referee.penaltyRate * 0.2;

    // 严厉裁判对粗犷球队不利
    const t1Penalty = t1Aggressive * (baseStrictness - 1) * 0.05;
    const t2Penalty = t2Aggressive * (baseStrictness - 1) * 0.05;

    return {
      yellowRisk,
      redRisk,
      penaltyRisk,
      team1Modifier: -t1Penalty + referee.homeBias * 0.5,
      team2Modifier: -t2Penalty - referee.homeBias * 0.5,
    };
  }
}

/**
 * TacticalMatchupMatrix — 战术阵型克制矩阵
 */

export type TacticalStyle =
  | "tiki_taka"       // 传控压迫 (Spain, Man City era)
  | "gegenpressing"   // 高位逼抢 (Liverpool, Germany)
  | "park_the_bus"    // 大巴死守 (Mourinho style)
  | "counter_attack"  // 犀利反击 (Leicester, Morocco 2022)
  | "direct_play"     // 英式长传冲吊
  | "balanced"        // 均衡型
  | "high_press";     // 高压逼抢

export interface TeamTacticalProfile {
  team: string;
  primaryStyle: TacticalStyle;
  secondaryStyle?: TacticalStyle;
  defensiveLine: "high" | "medium" | "low";
  pressingIntensity: number;    // 0-1
  possessionPreference: number; // 0-1
  counterAttackSpeed: number;   // 0-1
  setpieceStrength: number;     // 0-1
}

export interface TacticalMatchup {
  team1Style: TacticalStyle;
  team2Style: TacticalStyle;
  team1Modifier: number;   // -0.15 ~ +0.15
  team2Modifier: number;
  goalExpectancyMod: number; // 进球期望修正
  drawBoost: number;         // 平局概率修正
  upsetBoost: number;        // 爆冷概率修正
}

// 战术克制矩阵 (行=进攻方, 列=防守方)
const MATCHUP_MATRIX: Record<string, Record<string, TacticalMatchup>> = {
  "tiki_taka": {
    "park_the_bus": { team1Style: "tiki_taka", team2Style: "park_the_bus", team1Modifier: -0.08, team2Modifier: 0.08, goalExpectancyMod: -0.5, drawBoost: 0.10, upsetBoost: 0.08 },
    "counter_attack": { team1Style: "tiki_taka", team2Style: "counter_attack", team1Modifier: -0.05, team2Modifier: 0.05, goalExpectancyMod: 0.3, drawBoost: 0.05, upsetBoost: 0.06 },
    "gegenpressing": { team1Style: "tiki_taka", team2Style: "gegenpressing", team1Modifier: 0.03, team2Modifier: -0.03, goalExpectancyMod: 0.2, drawBoost: 0, upsetBoost: 0 },
    "high_press": { team1Style: "tiki_taka", team2Style: "high_press", team1Modifier: 0.05, team2Modifier: -0.05, goalExpectancyMod: 0.1, drawBoost: 0, upsetBoost: 0 },
  },
  "gegenpressing": {
    "tiki_taka": { team1Style: "gegenpressing", team2Style: "tiki_taka", team1Modifier: -0.03, team2Modifier: 0.03, goalExpectancyMod: 0.2, drawBoost: 0, upsetBoost: 0 },
    "park_the_bus": { team1Style: "gegenpressing", team2Style: "park_the_bus", team1Modifier: -0.10, team2Modifier: 0.10, goalExpectancyMod: -0.6, drawBoost: 0.12, upsetBoost: 0.10 },
    "counter_attack": { team1Style: "gegenpressing", team2Style: "counter_attack", team1Modifier: -0.06, team2Modifier: 0.06, goalExpectancyMod: 0.1, drawBoost: 0.05, upsetBoost: 0.05 },
  },
  "counter_attack": {
    "tiki_taka": { team1Style: "counter_attack", team2Style: "tiki_taka", team1Modifier: 0.05, team2Modifier: -0.05, goalExpectancyMod: 0.3, drawBoost: 0.05, upsetBoost: 0.06 },
    "gegenpressing": { team1Style: "counter_attack", team2Style: "gegenpressing", team1Modifier: 0.06, team2Modifier: -0.06, goalExpectancyMod: 0.1, drawBoost: 0.05, upsetBoost: 0.05 },
    "park_the_bus": { team1Style: "counter_attack", team2Style: "park_the_bus", team1Modifier: -0.05, team2Modifier: 0.05, goalExpectancyMod: -0.8, drawBoost: 0.15, upsetBoost: 0.10 },
    "high_press": { team1Style: "counter_attack", team2Style: "high_press", team1Modifier: 0.08, team2Modifier: -0.08, goalExpectancyMod: 0.4, drawBoost: 0, upsetBoost: 0.05 },
  },
  "park_the_bus": {
    "tiki_taka": { team1Style: "park_the_bus", team2Style: "tiki_taka", team1Modifier: 0.08, team2Modifier: -0.08, goalExpectancyMod: -0.5, drawBoost: 0.10, upsetBoost: 0.08 },
    "gegenpressing": { team1Style: "park_the_bus", team2Style: "gegenpressing", team1Modifier: 0.10, team2Modifier: -0.10, goalExpectancyMod: -0.6, drawBoost: 0.12, upsetBoost: 0.10 },
    "counter_attack": { team1Style: "park_the_bus", team2Style: "counter_attack", team1Modifier: 0.05, team2Modifier: -0.05, goalExpectancyMod: -0.8, drawBoost: 0.15, upsetBoost: 0.10 },
  },
};

// 国家队战术标签
export const TEAM_TACTICS: Record<string, TacticalStyle> = {
  "Spain": "tiki_taka",
  "Germany": "gegenpressing",
  "Brazil": "tiki_taka",
  "France": "balanced",
  "Argentina": "balanced",
  "England": "direct_play",
  "Morocco": "park_the_bus",
  "Croatia": "counter_attack",
  "Japan": "gegenpressing",
  "South Korea": "counter_attack",
  "Mexico": "counter_attack",
  "USA": "high_press",
  "Netherlands": "tiki_taka",
  "Portugal": "balanced",
  "Italy": "park_the_bus",
  "Uruguay": "park_the_bus",
  "Senegal": "counter_attack",
  "Nigeria": "counter_attack",
  "Cameroon": "counter_attack",
  "Iran": "park_the_bus",
  "Saudi Arabia": "park_the_bus",
  "Australia": "direct_play",
  "Denmark": "balanced",
  "Switzerland": "balanced",
  "Poland": "direct_play",
  "Belgium": "tiki_taka",
  "Ecuador": "counter_attack",
  "Tunisia": "park_the_bus",
  "Ghana": "counter_attack",
  "Serbia": "direct_play",
  "Canada": "high_press",
  "Qatar": "balanced",
  "Wales": "park_the_bus",
  "Scotland": "direct_play",
  "Peru": "balanced",
  "Chile": "gegenpressing",
  "Paraguay": "park_the_bus",
  "Colombia": "counter_attack",
  "Russia": "balanced",
};

export class TacticalMatchupEngine {
  /** 获取战术克制结果 */
  getMatchup(team1: string, team2: string): TacticalMatchup {
    const style1 = TEAM_TACTICS[team1] || "balanced";
    const style2 = TEAM_TACTICS[team2] || "balanced";

    const matchup = MATCHUP_MATRIX[style1]?.[style2];

    if (matchup) return matchup;

    // 默认: 无克制
    return {
      team1Style: style1,
      team2Style: style2,
      team1Modifier: 0,
      team2Modifier: 0,
      goalExpectancyMod: 0,
      drawBoost: 0,
      upsetBoost: 0,
    };
  }

  /** 获取球队战术标签 */
  getTeamStyle(team: string): TacticalStyle {
    return TEAM_TACTICS[team] || "balanced";
  }
}

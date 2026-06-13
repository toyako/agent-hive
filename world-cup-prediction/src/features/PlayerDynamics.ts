/**
 * PlayerDynamics — 动态球员状态与伤病/转会档案
 */

export interface PlayerProfile {
  name: string;
  team: string;
  position: string;
  marketValue: number;        // 身价(百万欧元)
  age: number;
  isKeyPlayer: boolean;       // 是否核心球员
  caps: number;               // 国家队出场数
  goals: number;              // 国家队进球数
}

export interface TransferRecord {
  date: string;
  fromClub: string;
  toClub: string;
  fee: number;                // 转会费(百万欧元)
  league: string;
}

export interface InjuryRecord {
  date: string;
  type: string;               // "muscle" | "ligament" | "bone" | "concussion" | "other"
  severity: number;           // 天数
  returnDate: string;
}

export interface PlayerDynamicScore {
  player: string;
  team: string;
  transferDisturbance: number;  // 0-1 (转会扰动系数)
  injuryResilience: number;     // 0-1 (伤病恢复系数)
  fatigueIndex: number;         // 0-1 (疲劳度)
  formScore: number;            // 0-1 (近期状态)
  overallWeight: number;        // 综合权重
}

export class PlayerDynamicsEngine {
  /** 计算转会扰动系数 */
  calculateTransferDisturbance(transfers: TransferRecord[]): number {
    if (transfers.length === 0) return 0;

    const recent = transfers.filter(t => {
      const diff = Date.now() - new Date(t.date).getTime();
      return diff < 365 * 24 * 60 * 60 * 1000; // 过去12个月
    });

    if (recent.length === 0) return 0;

    // 新联赛磨合期: 转会越近扰动越大
    let disturbance = 0;
    for (const t of recent) {
      const monthsAgo = (Date.now() - new Date(t.date).getTime()) / (30 * 24 * 60 * 60 * 1000);
      if (monthsAgo < 3) disturbance += 0.4;      // 3个月内: 高扰动
      else if (monthsAgo < 6) disturbance += 0.2;  // 6个月内: 中扰动
      else disturbance += 0.1;                      // 12个月内: 低扰动

      // 跨国转会扰动更大
      if (t.league !== transfers[transfers.length - 1]?.league) disturbance += 0.1;
    }

    return Math.min(1, disturbance);
  }

  /** 计算伤病恢复系数 */
  calculateInjuryResilience(injuries: InjuryRecord[]): number {
    if (injuries.length === 0) return 1;

    const severe = injuries.filter(i => i.severity > 30);
    if (severe.length === 0) return 1;

    // 大伤初愈: 复出不足1个月有折损
    const recentSevere = severe.filter(i => {
      const returnDate = new Date(i.returnDate);
      const monthsSinceReturn = (Date.now() - returnDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
      return monthsSinceReturn > 0 && monthsSinceReturn < 1;
    });

    if (recentSevere.length > 0) return 0.6; // 大伤初愈: 战力折损40%

    // 3年内有大伤但已恢复
    const threeYearsAgo = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
    const historicalSevere = severe.filter(i => new Date(i.date).getTime() > threeYearsAgo);
    return historicalSevere.length > 0 ? 0.85 : 1;
  }

  /** 计算疲劳度 */
  calculateFatigue(player: PlayerProfile, seasonMinutes: number): number {
    // 赛季出场时间超过3000分钟视为疲劳
    const baseFatigue = Math.min(1, seasonMinutes / 4000);
    // 年龄因子: 30岁以上恢复慢
    const ageFactor = player.age > 30 ? 0.15 : player.age > 33 ? 0.3 : 0;
    return Math.min(1, baseFatigue + ageFactor);
  }

  /** 计算球队综合球员动态评分 */
  calculateTeamScore(players: PlayerDynamicScore[]): {
    teamStrength: number;
    injuryRisk: number;
    fatigueLevel: number;
    overallModifier: number;
  } {
    const keyPlayers = players.filter(p => p.overallWeight > 0.5);
    const avgStrength = players.reduce((s, p) => s + p.overallWeight, 0) / (players.length || 1);
    const maxInjuryRisk = Math.max(...players.map(p => 1 - p.injuryResilience), 0);
    const avgFatigue = players.reduce((s, p) => s + p.fatigueIndex, 0) / (players.length || 1);

    // 核心球员伤病影响更大
    const keyInjuryRisk = keyPlayers.length > 0
      ? keyPlayers.reduce((s, p) => s + (1 - p.injuryResilience), 0) / keyPlayers.length
      : 0;

    // 综合修正系数
    const modifier = avgStrength * 0.4 + (1 - keyInjuryRisk) * 0.35 + (1 - avgFatigue) * 0.25;

    return {
      teamStrength: avgStrength,
      injuryRisk: maxInjuryRisk,
      fatigueLevel: avgFatigue,
      overallModifier: modifier,
    };
  }
}

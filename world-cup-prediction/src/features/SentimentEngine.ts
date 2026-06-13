/**
 * SentimentEngine — 舆论情感与战意特征
 */

export interface SentimentData {
  team: string;
  source: "twitter" | "news" | "reddit";
  sentiment: number;         // -1 (负面) ~ +1 (正面)
  controversyScore: number;  // 0-1 (内讧/争议程度)
  keywords: string[];
  timestamp: string;
}

export interface MotivationIndex {
  team: string;
  matchday: number;          // 小组赛第几轮
  alreadyQualified: boolean;
  alreadyEliminated: boolean;
  mustWin: boolean;
  canAffordDraw: boolean;
  rotationExpected: boolean; // 是否会轮换
  motivationScore: number;   // 0-1
}

export class SentimentEngine {
  /** 预留: NLP 情感分析接口 */
  async analyzeSentiment(team: string, texts: string[]): Promise<SentimentData> {
    // TODO: 接入大模型情感分析
    return {
      team,
      source: "news",
      sentiment: 0,          // 需要实现
      controversyScore: 0,
      keywords: [],
      timestamp: new Date().toISOString(),
    };
  }

  /** 计算小组赛战意指数 */
  calculateMotivation(team: string, standings: any, matchday: number): MotivationIndex {
    const teamStanding = standings[team] || {};
    const points = teamStanding.points || 0;
    const played = teamStanding.played || 0;

    let alreadyQualified = points >= 6; // 2胜基本出线
    let alreadyEliminated = points === 0 && played >= 2;
    let mustWin = points <= 3 && matchday === 3;
    let canAffordDraw = points >= 4 && matchday === 3;

    // 小组赛第三轮特殊逻辑
    let rotationExpected = false;
    if (matchday === 3 && alreadyQualified) {
      rotationExpected = true; // 提前出线强队轮换
    }

    // 打平即可携手出线的默契球场景
    if (matchday === 3 && canAffordDraw && !alreadyEliminated) {
      canAffordDraw = true;
    }

    let motivationScore = 1.0;
    if (alreadyQualified && rotationExpected) motivationScore = 0.6;
    if (alreadyEliminated) motivationScore = 0.4;
    if (mustWin) motivationScore = 1.0;

    return {
      team,
      matchday,
      alreadyQualified,
      alreadyEliminated,
      mustWin,
      canAffordDraw,
      rotationExpected,
      motivationScore,
    };
  }

  /** 战意修正系数 */
  getMotivationModifier(motivation: MotivationIndex): {
    winMod: number;
    drawMod: number;
    lossMod: number;
  } {
    if (motivation.rotationExpected) {
      return { winMod: -0.10, drawMod: 0.05, lossMod: 0.05 };
    }
    if (motivation.mustWin) {
      return { winMod: 0.05, drawMod: -0.05, lossMod: 0 };
    }
    if (motivation.alreadyEliminated) {
      return { winMod: -0.15, drawMod: 0.05, lossMod: 0.10 };
    }
    return { winMod: 0, drawMod: 0, lossMod: 0 };
  }
}

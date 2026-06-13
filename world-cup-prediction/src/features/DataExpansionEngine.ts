/**
 * DataExpansionEngine — 解决世界杯正赛样本量不足问题
 * 引入非世界杯赛事数据扩充训练集
 */

export interface MatchRecord {
  id: string;
  competition: string;       // "world_cup" | "euro" | "copa_america" | "nations_league" | "qualifier"
  year: number;
  round: string;             // "group" | "r16" | "qf" | "sf" | "final" | "qualifier"
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  venue?: string;            // 比赛地点
  isNeutral?: boolean;       // 是否中立场
  attendance?: number;       // 观众人数
  referee?: string;          // 裁判
}

export interface DataSource {
  name: string;
  type: "api" | "scraper" | "static";
  url?: string;
  competitions: string[];
  status: "active" | "planned" | "deprecated";
}

// 数据源注册表
export const DATA_SOURCES: DataSource[] = [
  {
    name: "openfootball/worldcup.json",
    type: "static",
    url: "https://github.com/openfootball/worldcup.json",
    competitions: ["world_cup"],
    status: "active",
  },
  {
    name: "openfootball/euro.json",
    type: "static",
    url: "https://github.com/openfootball/euro.json",
    competitions: ["euro"],
    status: "planned",
  },
  {
    name: "Football-Data.co.uk",
    type: "scraper",
    url: "https://www.football-data.co.uk/",
    competitions: ["euro", "qualifier"],
    status: "planned",
  },
  {
    name: "API-Football",
    type: "api",
    url: "https://www.api-football.com/",
    competitions: ["world_cup", "euro", "copa_america", "nations_league", "qualifier"],
    status: "planned",
  },
];

export class DataExpansionEngine {
  private matches: MatchRecord[] = [];

  /** 加载世界杯数据 */
  loadWorldCup(data: any[], year: number): void {
    for (const m of data) {
      if (!m.score?.ft) continue;
      this.matches.push({
        id: `wc-${year}-${m.team1}-${m.team2}`,
        competition: "world_cup",
        year,
        round: m.group ? "group" : "knockout",
        team1: m.team1,
        team2: m.team2,
        score1: m.score.ft[0],
        score2: m.score.ft[1],
        venue: m.ground,
        isNeutral: true,
      });
    }
  }

  /** 加载欧洲杯数据 */
  loadEuro(data: any[], year: number): void {
    for (const m of data) {
      if (!m.score?.ft) continue;
      this.matches.push({
        id: `euro-${year}-${m.team1}-${m.team2}`,
        competition: "euro",
        year,
        round: m.group ? "group" : "knockout",
        team1: m.team1,
        team2: m.team2,
        score1: m.score.ft[0],
        score2: m.score.ft[1],
        isNeutral: true,
      });
    }
  }

  /** 加载美洲杯数据 */
  loadCopaAmerica(data: any[], year: number): void {
    for (const m of data) {
      if (!m.score?.ft) continue;
      this.matches.push({
        id: `copa-${year}-${m.team1}-${m.team2}`,
        competition: "copa_america",
        year,
        round: m.group ? "group" : "knockout",
        team1: m.team1,
        team2: m.team2,
        score1: m.score.ft[0],
        score2: m.score.ft[1],
      });
    }
  }

  /** 加载预选赛数据 */
  loadQualifier(data: any[], confederation: string): void {
    for (const m of data) {
      if (!m.score?.ft) continue;
      this.matches.push({
        id: `qual-${confederation}-${m.team1}-${m.team2}`,
        competition: "qualifier",
        year: m.year || 2024,
        round: "qualifier",
        team1: m.team1,
        team2: m.team2,
        score1: m.score.ft[0],
        score2: m.score.ft[1],
        isNeutral: false,
      });
    }
  }

  /** 获取指定球队的所有比赛 */
  getTeamMatches(team: string): MatchRecord[] {
    return this.matches.filter(m => m.team1 === team || m.team2 === team);
  }

  /** 获取指定赛事类型的比赛 */
  getByCompetition(comp: string): MatchRecord[] {
    return this.matches.filter(m => m.competition === comp);
  }

  /** 获取统计 */
  getStats(): { total: number; byCompetition: Record<string, number>; teams: number } {
    const byComp: Record<string, number> = {};
    const teams = new Set<string>();
    for (const m of this.matches) {
      byComp[m.competition] = (byComp[m.competition] || 0) + 1;
      teams.add(m.team1);
      teams.add(m.team2);
    }
    return { total: this.matches.length, byCompetition: byComp, teams: teams.size };
  }

  /** 导出为标准格式 */
  export(): MatchRecord[] {
    return [...this.matches];
  }
}

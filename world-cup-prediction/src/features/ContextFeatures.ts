/**
 * ContextFeatures — 环境与气候场景特征
 */

export interface VenueProfile {
  name: string;
  city: string;
  country: string;
  altitude: number;          // 海拔(米)
  latitude: number;
  longitude: number;
  climate: "tropical" | "arid" | "temperate" | "continental" | "polar";
  avgTempJune: number;       // 6月平均温度(℃)
  avgHumidityJune: number;   // 6月平均湿度(%)
  grassType: string;         // 草坪类型
  roofType: "open" | "retractable" | "closed";
  capacity: number;
}

export interface WeatherCondition {
  temperature: number;       // ℃
  humidity: number;          // %
  precipitation: number;     // mm
  windSpeed: number;         // km/h
  heatIndex: number;         // 体感温度
}

export interface VenueEffect {
  altitudeEffect: number;    // -0.15 ~ +0.15 (高海拔对主队有利)
  climateEffect: number;     // -0.10 ~ +0.10 (气候适应度)
  pitchEffect: number;       // -0.05 ~ +0.05 (草坪状态)
  weatherModifier: number;   // -0.10 ~ +0.10 (天气修正)
  drawBoost: number;         // 0 ~ +0.10 (恶劣天气增加平局概率)
  upsetBoost: number;        // 0 ~ +0.08 (极端条件增加爆冷概率)
}

// 2026 美加墨世界杯场馆
export const WC2026_VENUES: VenueProfile[] = [
  { name: "Estadio Azteca", city: "Mexico City", country: "Mexico", altitude: 2240, latitude: 19.3, longitude: -99.2, climate: "tropical", avgTempJune: 22, avgHumidityJune: 65, grassType: "hybrid", roofType: "open", capacity: 87000 },
  { name: "MetLife Stadium", city: "New York", country: "USA", altitude: 5, latitude: 40.8, longitude: -74.1, climate: "temperate", avgTempJune: 24, avgHumidityJune: 60, grassType: "natural", roofType: "open", capacity: 82500 },
  { name: "AT&T Stadium", city: "Dallas", country: "USA", altitude: 180, latitude: 32.8, longitude: -97.1, climate: "arid", avgTempJune: 34, avgHumidityJune: 55, grassType: "artificial", roofType: "retractable", capacity: 80000 },
  { name: "SoFi Stadium", city: "Los Angeles", country: "USA", altitude: 30, latitude: 33.9, longitude: -118.3, climate: "arid", avgTempJune: 22, avgHumidityJune: 65, grassType: "natural", roofType: "retractable", capacity: 70240 },
  { name: "Hard Rock Stadium", city: "Miami", country: "USA", altitude: 3, latitude: 26.0, longitude: -80.2, climate: "tropical", avgTempJune: 32, avgHumidityJune: 75, grassType: "natural", roofType: "open", capacity: 65326 },
  { name: "BC Place", city: "Vancouver", country: "Canada", altitude: 10, latitude: 49.3, longitude: -123.1, climate: "temperate", avgTempJune: 18, avgHumidityJune: 60, grassType: "artificial", roofType: "closed", capacity: 54500 },
  { name: "BMO Field", city: "Toronto", country: "Canada", altitude: 76, latitude: 43.6, longitude: -79.4, climate: "continental", avgTempJune: 22, avgHumidityJune: 60, grassType: "natural", roofType: "open", capacity: 30000 },
  { name: "Lumen Field", city: "Seattle", country: "USA", altitude: 5, latitude: 47.6, longitude: -122.3, climate: "temperate", avgTempJune: 18, avgHumidityJune: 65, grassType: "artificial", roofType: "open", capacity: 69000 },
];

export class ContextFeatureEngine {
  /** 计算场馆效应 */
  calculateVenueEffect(venue: VenueProfile, team1: string, team2: string): VenueEffect {
    // 高海拔效应: 墨西哥城 2240m 对习惯高海拔的球队有利
    const altitudeEffect = this.calcAltitudeEffect(venue.altitude, team1, team2);

    // 气候效应: 热带球队在炎热环境有优势
    const climateEffect = this.calcClimateEffect(venue.climate, venue.avgTempJune, team1, team2);

    // 天气修正
    const weatherModifier = 0; // 需要实时天气数据

    // 恶劣天气增加平局和爆冷概率
    const drawBoost = venue.avgHumidityJune > 70 ? 0.05 : 0;
    const upsetBoost = venue.altitude > 2000 ? 0.08 : (venue.avgTempJune > 32 ? 0.05 : 0);

    return {
      altitudeEffect,
      climateEffect,
      pitchEffect: venue.grassType === "artificial" ? -0.02 : 0,
      weatherModifier,
      drawBoost,
      upsetBoost,
    };
  }

  /** 天气修正因子 */
  applyWeather(effect: VenueEffect, weather: WeatherCondition): VenueEffect {
    const heatPenalty = weather.heatIndex > 35 ? -0.05 : 0;
    const rainPenalty = weather.precipitation > 10 ? 0.08 : 0; // 大雨增加平局/爆冷
    const windPenalty = weather.windSpeed > 30 ? 0.03 : 0;

    return {
      ...effect,
      weatherModifier: heatPenalty + rainPenalty + windPenalty,
      drawBoost: effect.drawBoost + rainPenalty * 0.5,
      upsetBoost: effect.upsetBoost + rainPenalty * 0.3,
    };
  }

  private calcAltitudeEffect(altitude: number, team1: string, team2: string): number {
    if (altitude < 500) return 0;
    // 高海拔国家球队有优势
    const highAltTeams = ["Mexico", "Bolivia", "Ecuador", "Colombia", "Ethiopia"];
    const t1Used = highAltTeams.includes(team1) ? 1 : 0;
    const t2Used = highAltTeams.includes(team2) ? 1 : 0;
    return (t1Used - t2Used) * Math.min(0.15, altitude / 20000);
  }

  private calcClimateEffect(climate: string, temp: number, team1: string, team2: string): number {
    const tropicalTeams = ["Brazil", "Nigeria", "Senegal", "Cameroon", "Colombia", "Mexico"];
    const coldTeams = ["Germany", "Sweden", "Norway", "Denmark", "Iceland", "Russia"];
    const t1Tropical = tropicalTeams.includes(team1) ? 1 : 0;
    const t2Tropical = tropicalTeams.includes(team2) ? 1 : 0;
    const t1Cold = coldTeams.includes(team1) ? 1 : 0;
    const t2Cold = coldTeams.includes(team2) ? 1 : 0;

    if (climate === "tropical" || temp > 30) {
      return (t1Tropical - t2Tropical) * 0.05 + (t2Cold - t1Cold) * 0.05;
    }
    return 0;
  }
}

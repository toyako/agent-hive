/**
 * context.js — 2026世界杯场馆环境 + 气候修正
 */

const VENUES_2026 = {
  "Mexico City":  { altitude: 2240, temp: 22, humidity: 65, climate: "tropical",  roof: "open" },
  "New York":     { altitude: 5,    temp: 24, humidity: 60, climate: "temperate", roof: "open" },
  "Dallas":       { altitude: 180,  temp: 34, humidity: 55, climate: "arid",      roof: "retractable" },
  "Los Angeles":  { altitude: 30,   temp: 22, humidity: 65, climate: "arid",      roof: "retractable" },
  "Miami":        { altitude: 3,    temp: 32, humidity: 75, climate: "tropical",  roof: "open" },
  "Vancouver":    { altitude: 10,   temp: 18, humidity: 60, climate: "temperate", roof: "closed" },
  "Toronto":      { altitude: 76,   temp: 22, humidity: 60, climate: "continental", roof: "open" },
  "Seattle":      { altitude: 5,    temp: 18, humidity: 65, climate: "temperate", roof: "open" },
  "Guadalajara":  { altitude: 1566, temp: 25, humidity: 60, climate: "tropical",  roof: "open" },
  "Monterrey":    { altitude: 540,  temp: 30, humidity: 55, climate: "arid",      roof: "open" },
  "Houston":      { altitude: 15,   temp: 34, humidity: 75, climate: "tropical",  roof: "retractable" },
  "Philadelphia": { altitude: 12,   temp: 26, humidity: 60, climate: "temperate", roof: "open" },
  "Boston":       { altitude: 5,    temp: 22, humidity: 65, climate: "temperate", roof: "open" },
  "Atlanta":      { altitude: 320,  temp: 30, humidity: 70, climate: "tropical",  roof: "retractable" },
  "San Francisco":{ altitude: 16,   temp: 17, humidity: 70, climate: "temperate", roof: "open" },
};

// 高海拔国家队
const HIGH_ALT_TEAMS = new Set(["Mexico", "Bolivia", "Ecuador", "Colombia", "Ethiopia"]);

// 热带国家队
const TROPICAL_TEAMS = new Set(["Brazil", "Nigeria", "Senegal", "Cameroon", "Colombia", "Mexico", "Ghana", "Egypt", "Tunisia"]);

// 寒冷气候国家队
const COLD_TEAMS = new Set(["Germany", "Sweden", "Norway", "Denmark", "Iceland", "Russia", "Canada"]);

function getContextEffect(venue, team1, team2) {
  const v = VENUES_2026[venue] || { altitude: 0, temp: 22, humidity: 50, climate: "temperate", roof: "open" };

  let altitudeMod = 0;
  let climateMod = 0;
  let drawBoost = 0;
  let upsetBoost = 0;

  // 高海拔: >1500m 对习惯高海拔的球队有利
  if (v.altitude > 1500) {
    const t1adv = HIGH_ALT_TEAMS.has(team1) ? 1 : 0;
    const t2adv = HIGH_ALT_TEAMS.has(team2) ? 1 : 0;
    altitudeMod = (t1adv - t2adv) * Math.min(0.12, v.altitude / 25000);
    upsetBoost += 0.06; // 高海拔增加爆冷
  }

  // 高温: >30℃ 对热带球队有利，对寒冷气候球队不利
  if (v.temp > 30) {
    const t1trop = TROPICAL_TEAMS.has(team1) ? 1 : 0;
    const t2trop = TROPICAL_TEAMS.has(team2) ? 1 : 0;
    const t1cold = COLD_TEAMS.has(team1) ? 1 : 0;
    const t2cold = COLD_TEAMS.has(team2) ? 1 : 0;
    climateMod = (t1trop - t2trop) * 0.04 + (t2cold - t1cold) * 0.04;
    drawBoost += 0.04;
    upsetBoost += 0.03;
  }

  // 高湿度: >70% 增加平局和爆冷
  if (v.humidity > 70) {
    drawBoost += 0.03;
    upsetBoost += 0.02;
  }

  return { altitudeMod, climateMod, drawBoost, upsetBoost };
}

module.exports = { VENUES_2026, getContextEffect };

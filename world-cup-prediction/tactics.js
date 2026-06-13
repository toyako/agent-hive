/**
 * tactics.js — 30+ 国家队战术标签 + 克制矩阵
 */

const TEAM_STYLES = {
  "Spain": "possession", "Germany": "pressing", "Brazil": "possession",
  "France": "balanced", "Argentina": "balanced", "England": "direct",
  "Morocco": "defensive", "Croatia": "counter", "Japan": "pressing",
  "South Korea": "counter", "Mexico": "counter", "USA": "pressing",
  "Netherlands": "possession", "Portugal": "balanced", "Italy": "defensive",
  "Uruguay": "defensive", "Senegal": "counter", "Nigeria": "counter",
  "Cameroon": "counter", "Iran": "defensive", "Saudi Arabia": "defensive",
  "Australia": "direct", "Denmark": "balanced", "Switzerland": "balanced",
  "Poland": "direct", "Belgium": "possession", "Ecuador": "counter",
  "Tunisia": "defensive", "Ghana": "counter", "Serbia": "direct",
  "Canada": "pressing", "Qatar": "balanced", "Wales": "defensive",
  "Peru": "balanced", "Chile": "pressing", "Colombia": "counter",
  "Russia": "balanced", "Iceland": "defensive", "Egypt": "counter",
  "Costa Rica": "defensive", "Panama": "defensive",
};

// 克制矩阵: [attack_style][defend_style] => {winMod, drawMod, goalMod}
const MATCHUP = {
  possession: {
    defensive:  { winMod: -0.08, drawMod: 0.10, goalMod: -0.5 },
    counter:    { winMod: -0.05, drawMod: 0.05, goalMod: 0.3 },
    pressing:   { winMod: 0.03,  drawMod: 0,    goalMod: 0.2 },
    possession: { winMod: 0,     drawMod: 0,    goalMod: 0 },
    direct:     { winMod: 0.05,  drawMod: -0.02, goalMod: 0.1 },
    balanced:   { winMod: 0.02,  drawMod: 0,    goalMod: 0 },
  },
  pressing: {
    defensive:  { winMod: -0.10, drawMod: 0.12, goalMod: -0.6 },
    possession: { winMod: -0.03, drawMod: 0,    goalMod: 0.2 },
    counter:    { winMod: -0.06, drawMod: 0.05, goalMod: 0.1 },
    pressing:   { winMod: 0,     drawMod: 0.05, goalMod: 0.3 },
    direct:     { winMod: 0.02,  drawMod: 0,    goalMod: 0.1 },
    balanced:   { winMod: 0,     drawMod: 0,    goalMod: 0 },
  },
  counter: {
    possession: { winMod: 0.05,  drawMod: 0.05, goalMod: 0.3 },
    pressing:   { winMod: 0.06,  drawMod: 0.05, goalMod: 0.1 },
    defensive:  { winMod: -0.05, drawMod: 0.15, goalMod: -0.8 },
    direct:     { winMod: 0.04,  drawMod: 0,    goalMod: 0.2 },
    balanced:   { winMod: 0.02,  drawMod: 0,    goalMod: 0 },
    counter:    { winMod: 0,     drawMod: 0.05, goalMod: 0 },
  },
  defensive: {
    possession: { winMod: 0.08,  drawMod: 0.10, goalMod: -0.5 },
    pressing:   { winMod: 0.10,  drawMod: 0.12, goalMod: -0.6 },
    counter:    { winMod: 0.05,  drawMod: 0.15, goalMod: -0.8 },
    direct:     { winMod: 0.06,  drawMod: 0.08, goalMod: -0.4 },
    balanced:   { winMod: 0.03,  drawMod: 0.05, goalMod: -0.2 },
    defensive:  { winMod: 0,     drawMod: 0.10, goalMod: -0.6 },
  },
  direct: {
    possession: { winMod: -0.05, drawMod: 0.02, goalMod: -0.1 },
    pressing:   { winMod: -0.02, drawMod: 0,    goalMod: -0.1 },
    defensive:  { winMod: -0.06, drawMod: 0.08, goalMod: -0.4 },
    counter:    { winMod: -0.04, drawMod: 0,    goalMod: -0.2 },
    direct:     { winMod: 0,     drawMod: 0.05, goalMod: 0.2 },
    balanced:   { winMod: -0.02, drawMod: 0,    goalMod: 0 },
  },
  balanced: {
    possession: { winMod: -0.02, drawMod: 0,    goalMod: 0 },
    pressing:   { winMod: 0,     drawMod: 0,    goalMod: 0 },
    defensive:  { winMod: -0.03, drawMod: 0.05, goalMod: -0.2 },
    counter:    { winMod: -0.02, drawMod: 0,    goalMod: 0 },
    direct:     { winMod: 0.02,  drawMod: 0,    goalMod: 0 },
    balanced:   { winMod: 0,     drawMod: 0,    goalMod: 0 },
  },
};

function getTacticalEffect(team1, team2) {
  const s1 = TEAM_STYLES[team1] || "balanced";
  const s2 = TEAM_STYLES[team2] || "balanced";
  const m = MATCHUP[s1]?.[s2] || { winMod: 0, drawMod: 0, goalMod: 0 };
  return { style1: s1, style2: s2, winMod: m.winMod, drawMod: m.drawMod, goalMod: m.goalMod };
}

module.exports = { TEAM_STYLES, MATCHUP, getTacticalEffect };

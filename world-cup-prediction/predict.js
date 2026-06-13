/**
 * predict.js v2.0 — ELO + FIFA + Tactical + Context 真实集成
 */
const fs = require("fs");
const path = require("path");
const { getTacticalEffect } = require("./tactics");
const { getContextEffect } = require("./context");

// FIFA Rankings (June 2026)
const FIFA = {
  "Argentina": 1877, "Spain": 1875, "France": 1871, "England": 1828,
  "Portugal": 1768, "Brazil": 1766, "Morocco": 1755, "Netherlands": 1754,
  "Belgium": 1742, "Germany": 1736, "Colombia": 1728, "Uruguay": 1706,
  "Japan": 1695, "Croatia": 1692, "Italy": 1688, "USA": 1681,
  "Mexico": 1668, "Switzerland": 1654, "Senegal": 1647, "Denmark": 1640,
};

// ELO System
class ELO {
  constructor(k = 32) { this.k = k; this.r = {}; }
  get(team) { return this.r[team] || 1500; }
  expected(a, b) { return 1 / (1 + Math.pow(10, (this.get(b) - this.get(a)) / 400)); }
  update(t1, t2, s1, s2) {
    const e1 = this.expected(t1, t2);
    const a1 = s1 > s2 ? 1 : s1 < s2 ? 0 : 0.5;
    this.r[t1] = this.get(t1) + this.k * (a1 - e1);
    this.r[t2] = this.get(t2) + this.k * ((1 - a1) - (1 - e1));
  }
}

// Load matches
function load(file) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "data", file), "utf-8"));
  const matches = [];
  const source = data.rounds || [data];
  for (const r of source) {
    for (const m of (r.matches || (Array.isArray(r) ? r : []))) {
      if (m.score?.ft) matches.push(m);
    }
  }
  return matches;
}

// Train ELO
function train(matches) {
  const elo = new ELO();
  for (const m of matches) elo.update(m.team1, m.team2, m.score.ft[0], m.score.ft[1]);
  return elo;
}

// ═══════════════════════════════════════════════════
// predict v2.0 — 真正集成 4 个维度
// ═══════════════════════════════════════════════════
function predict(elo, t1, t2, opts = {}) {
  // ── 基础概率 ──
  const eloP = elo.expected(t1, t2);
  const f1 = FIFA[t1] || 1500, f2 = FIFA[t2] || 1500;
  const fifaP = 0.5 + (f1 - f2) / 1000 * 0.3;

  // ── 战术克制 (真正调用) ──
  const tac = getTacticalEffect(t1, t2);

  // ── 环境修正 (真正调用) ──
  const ctx = getContextEffect(opts.venue || "", t1, t2);

  // ── 主场优势 ──
  const home = opts.isHome ? 0.05 : 0;

  // ── 综合计算 ──
  // 权重: ELO 0.40 + FIFA 0.30 + 战术 0.15 + 环境 0.15
  let baseP = 0.40 * eloP + 0.30 * fifaP + 0.15 * (0.5 + tac.winMod) + 0.15 * (0.5 + ctx.altitudeMod + ctx.climateMod);
  baseP += home * 0.10;
  baseP = Math.max(0.05, Math.min(0.95, baseP));

  // 平局概率: 基础 + 战术平局加成 + 环境平局加成
  let drawP = 0.22 + tac.drawMod + ctx.drawBoost;
  drawP = Math.max(0.08, Math.min(0.40, drawP));

  // 爆冷概率加成
  const upsetBoost = ctx.upsetBoost;

  // 归一化
  let p1 = baseP;
  let p2 = 1 - p1 - drawP;
  if (p2 < 0.05) { p2 = 0.05; drawP = 1 - p1 - p2; }

  return {
    team1: t1, team2: t2,
    p1: Math.round(p1 * 100),
    draw: Math.round(drawP * 100),
    p2: Math.round(p2 * 100),
    conf: Math.round(Math.abs(p1 - p2) * 100),
    tactics: `${tac.style1} vs ${tac.style2}`,
    venue: opts.venue || "neutral",
    tacWinMod: tac.winMod,
    ctxMod: ctx.altitudeMod + ctx.climateMod,
  };
}

// ═══════════════════════════════════════════════════
// Backtest 2022 (用 1998-2018 训练)
// ═══════════════════════════════════════════════════
function backtest() {
  const all = [...load("wc1998.json"), ...load("wc2002.json"), ...load("wc2006.json"),
               ...load("wc2010.json"), ...load("wc2014.json"), ...load("wc2018.json")];
  const elo = train(all);
  const test = load("wc2022.json");

  let correct = 0, total = 0;
  let correctByRound = {};

  console.log("=== Backtest: 2022 World Cup (v2.0) ===\n");

  for (const m of test) {
    const pred = predict(elo, m.team1, m.team2, { venue: m.ground });
    const predW = pred.p1 > pred.p2 ? m.team1 : pred.p2 > pred.p1 ? m.team2 : "Draw";
    const actW = m.score.ft[0] > m.score.ft[1] ? m.team1 : m.score.ft[1] > m.score.ft[0] ? m.team2 : "Draw";
    const ok = predW === actW;
    if (ok) correct++;
    total++;

    const round = m.group ? "Group" : "Knockout";
    if (!correctByRound[round]) correctByRound[round] = { c: 0, t: 0 };
    correctByRound[round].t++;
    if (ok) correctByRound[round].c++;

    // 打印所有比赛
    const tacStr = pred.tactics.padEnd(20);
    console.log(`${m.team1.padEnd(14)} ${m.score.ft[0]}-${m.score.ft[1]} ${m.team2.padEnd(14)} | ${String(pred.p1).padStart(3)}%-${String(pred.draw).padStart(2)}%-${String(pred.p2).padStart(3)}% | ${tacStr} | ${ok ? "✓" : "✗"}`);
  }

  console.log(`\n=== Results ===`);
  console.log(`Overall: ${correct}/${total} (${(correct / total * 100).toFixed(1)}%)`);
  for (const [round, data] of Object.entries(correctByRound)) {
    console.log(`  ${round}: ${data.c}/${data.t} (${(data.c / data.t * 100).toFixed(1)}%)`);
  }

  return elo;
}

// ═══════════════════════════════════════════════════
// 2026 Predictions
// ═══════════════════════════════════════════════════
function predict2026(elo) {
  const matches = load("wc2026.json");
  const unplayed = matches.filter(m => !m.score?.ft);

  console.log("\n=== 2026 World Cup Predictions (v2.0) ===\n");
  for (const m of unplayed.slice(0, 15)) {
    const pred = predict(elo, m.team1, m.team2, { venue: m.ground });
    console.log(`${m.team1.padEnd(14)} vs ${m.team2.padEnd(14)} | ${pred.p1}%-${pred.draw}%-${pred.p2}% | ${pred.tactics} | ${pred.venue}`);
  }
}

// Run
const elo = backtest();
predict2026(elo);

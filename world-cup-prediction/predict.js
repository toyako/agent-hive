/**
 * World Cup Prediction System v1.0 — ELO + FIFA Hybrid
 */
const fs = require("fs");
const path = require("path");

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

// Predict
function predict(elo, t1, t2, opts = {}) {
  const e1 = elo.get(t1), e2 = elo.get(t2);
  const f1 = FIFA[t1] || 1500, f2 = FIFA[t2] || 1500;
  const eloP = elo.expected(t1, t2);
  const fifaP = 0.5 + (f1 - f2) / 1000 * 0.3;
  const home = opts.isHome ? 0.05 : 0;
  let p1 = 0.5 * eloP + 0.35 * fifaP + 0.15 * (0.5 + home);
  p1 = Math.max(0.05, Math.min(0.95, p1));
  const draw = 0.25 * (1 - Math.abs(p1 - 0.5) * 2);
  const p2 = 1 - p1 - draw;
  return { team1: t1, team2: t2, p1: Math.round(p1*100), draw: Math.round(draw*100), p2: Math.round(p2*100), conf: Math.round(Math.abs(p1-0.5)*200) };
}

// Backtest 2022
function backtest() {
  const all = [...load("wc1998.json"), ...load("wc2002.json"), ...load("wc2006.json"), ...load("wc2010.json"), ...load("wc2014.json"), ...load("wc2018.json")];
  const elo = train(all);
  const test = load("wc2022.json");
  let correct = 0;

  console.log("=== Backtest: 2022 World Cup ===\n");
  for (const m of test) {
    const pred = predict(elo, m.team1, m.team2);
    const predW = pred.p1 > pred.p2 ? m.team1 : pred.p2 > pred.p1 ? m.team2 : "Draw";
    const actW = m.score.ft[0] > m.score.ft[1] ? m.team1 : m.score.ft[1] > m.score.ft[0] ? m.team2 : "Draw";
    const ok = predW === actW;
    if (ok) correct++;
    if (test.indexOf(m) < 15 || !ok) {
      console.log(`${m.team1} ${m.score.ft[0]}-${m.score.ft[1]} ${m.team2} | ${pred.p1}%-${pred.draw}%-${pred.p2}% | ${ok?"✓":"✗"}`);
    }
  }
  console.log(`\nAccuracy: ${correct}/${test.length} (${(correct/test.length*100).toFixed(1)}%)`);
  return elo;
}

// Predict 2026
function predict2026(elo) {
  const matches = load("wc2026.json");
  const upcoming = matches.filter(m => !m.score?.ft);
  
  // Also predict remaining group stage
  const all2026 = load("wc2026.json");
  const unplayed = all2026.filter(m => !m.score?.ft);

  console.log("\n=== 2026 World Cup Predictions ===\n");
  for (const m of unplayed.slice(0, 20)) {
    const pred = predict(elo, m.team1, m.team2, { isNeutral: true });
    console.log(`${m.team1} vs ${m.team2} | ${pred.p1}%-${pred.draw}%-${pred.p2}% | Conf: ${pred.conf}%`);
  }

  // Top 20 ELO
  console.log("\n=== Top 20 ELO Ratings ===\n");
  const sorted = Object.entries(elo.r).sort((a,b) => b[1]-a[1]).slice(0, 20);
  for (const [team, rating] of sorted) {
    console.log(`  ${team.padEnd(20)} ${Math.round(rating)}`);
  }
}

// Run
const elo = backtest();
predict2026(elo);

const fs = require("fs");
const path = require("path");

function loadMatches(file) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "data", file), "utf-8"));
  const matches = [];
  
  if (data.rounds) {
    for (const round of data.rounds) {
      for (const m of (round.matches || [])) {
        if (m.score?.ft) matches.push(m);
      }
    }
  } else if (data.matches) {
    for (const m of data.matches) {
      if (m.score?.ft) matches.push(m);
    }
  }
  
  return matches;
}

const wc2018 = loadMatches("wc2018.json");
const wc2022 = loadMatches("wc2022.json");
const wc2026 = loadMatches("wc2026.json");

console.log("2018 matches:", wc2018.length);
console.log("2022 matches:", wc2022.length);
console.log("2026 matches:", wc2026.length);

// Sample
if (wc2022.length > 0) {
  const s = wc2022[0];
  console.log("Sample:", s.team1, s.score.ft[0], "-", s.score.ft[1], s.team2);
}

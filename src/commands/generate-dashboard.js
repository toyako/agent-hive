/**
 * Dashboard Generator
 *
 * Reads .agent-hive/ data and generates a static HTML dashboard.
 * Usage: node generate-dashboard.js > dashboard/index.html
 */
const fs = require("fs");
const path = require("path");

const BASE = path.resolve(__dirname, "../.agent-hive");
const REPORTS = path.resolve(__dirname, "../reports");

function loadJSON(filepath) {
  try { return JSON.parse(fs.readFileSync(filepath, "utf-8")); } catch { return null; }
}

function main() {
  const runtimeMetrics = loadJSON(path.join(BASE, "metrics/runtime.json")) || {};
  const benchmark = loadJSON(path.join(BASE, "benchmark/runtime-benchmark.json")) || {};
  const validation = loadJSON(path.join(REPORTS, "validation-metrics.json")) || {};

  // Load traces
  const tracesDir = path.join(BASE, "traces");
  const traces = [];
  if (fs.existsSync(tracesDir)) {
    for (const f of fs.readdirSync(tracesDir).filter(f => f.endsWith(".json"))) {
      traces.push(loadJSON(path.join(tracesDir, f)));
    }
  }

  const data = { runtimeMetrics, benchmark, validation, traces };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Hive Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e4e4e7; min-height: 100vh; }
  .header { background: linear-gradient(135deg, #1a1b2e 0%, #16213e 100%); padding: 24px 32px; border-bottom: 1px solid #2a2d3e; }
  .header h1 { font-size: 24px; font-weight: 700; background: linear-gradient(90deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .header p { color: #71717a; font-size: 14px; margin-top: 4px; }
  .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
  .grid { display: grid; gap: 20px; }
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .card { background: #1a1b2e; border: 1px solid #2a2d3e; border-radius: 12px; padding: 20px; }
  .card h3 { font-size: 14px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
  .card .value { font-size: 32px; font-weight: 700; color: #fff; }
  .card .sub { font-size: 13px; color: #52525b; margin-top: 4px; }
  .section { margin-top: 32px; }
  .section h2 { font-size: 18px; font-weight: 600; color: #e4e4e7; margin-bottom: 16px; }
  .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 160px; padding: 0 8px; }
  .bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; }
  .bar { width: 100%; border-radius: 6px 6px 0 0; transition: height 0.5s ease; min-height: 4px; }
  .bar-label { font-size: 11px; color: #71717a; margin-top: 8px; text-align: center; }
  .bar-value { font-size: 12px; color: #a1a1aa; margin-bottom: 4px; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
  .badge-green { background: #064e3b; color: #34d399; }
  .badge-yellow { background: #713f12; color: #fbbf24; }
  .badge-red { background: #7f1d1d; color: #f87171; }
  .badge-blue { background: #1e3a5f; color: #60a5fa; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; border-bottom: 1px solid #2a2d3e; }
  td { padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #1f2033; }
  .timeline { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  .timeline-dot { width: 8px; height: 8px; border-radius: 50%; }
  .timeline-line { width: 20px; height: 2px; background: #2a2d3e; }
  .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
  .status-green { background: #34d399; }
  .status-yellow { background: #fbbf24; }
  .status-red { background: #f87171; }
  @media (max-width: 768px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="header">
  <h1>🦞 Agent Hive Dashboard</h1>
  <p>Multi-Runtime AI Orchestration — v3.0</p>
</div>
<div class="container">

  <!-- Summary Cards -->
  <div class="grid grid-4">
    <div class="card">
      <h3>Runtimes</h3>
      <div class="value">${Object.keys(benchmark).length}</div>
      <div class="sub">${Object.keys(benchmark).map(r => r).join(", ")}</div>
    </div>
    <div class="card">
      <h3>Total Tasks</h3>
      <div class="value">${validation.totalTasks || traces.length}</div>
      <div class="sub">${validation.successRate || "100%"} success rate</div>
    </div>
    <div class="card">
      <h3>Avg Score</h3>
      <div class="value">${validation.averageReviewScore || "N/A"}</div>
      <div class="sub">Review score</div>
    </div>
    <div class="card">
      <h3>Traces</h3>
      <div class="value">${traces.length}</div>
      <div class="sub">Recorded executions</div>
    </div>
  </div>

  <!-- Runtime Ranking -->
  <div class="section">
    <h2>Runtime Ranking</h2>
    <div class="grid grid-2">
      <div class="card">
        <h3>Coding</h3>
        <div class="bar-chart">
          ${Object.entries(benchmark).map(([name, r]) => `
            <div class="bar-group">
              <div class="bar-value">${r.coding}</div>
              <div class="bar" style="height: ${r.coding * 1.5}px; background: linear-gradient(180deg, #6366f1, #4f46e5);"></div>
              <div class="bar-label">${name}</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="card">
        <h3>Review</h3>
        <div class="bar-chart">
          ${Object.entries(benchmark).map(([name, r]) => `
            <div class="bar-group">
              <div class="bar-value">${r.review}</div>
              <div class="bar" style="height: ${r.review * 1.5}px; background: linear-gradient(180deg, #8b5cf6, #7c3aed);"></div>
              <div class="bar-label">${name}</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="card">
        <h3>Planning</h3>
        <div class="bar-chart">
          ${Object.entries(benchmark).map(([name, r]) => `
            <div class="bar-group">
              <div class="bar-value">${r.planning}</div>
              <div class="bar" style="height: ${r.planning * 1.5}px; background: linear-gradient(180deg, #a78bfa, #8b5cf6);"></div>
              <div class="bar-label">${name}</div>
            </div>`).join("")}
        </div>
      </div>
      <div class="card">
        <h3>Reasoning</h3>
        <div class="bar-chart">
          ${Object.entries(benchmark).map(([name, r]) => `
            <div class="bar-group">
              <div class="bar-value">${r.reasoning}</div>
              <div class="bar" style="height: ${r.reasoning * 1.5}px; background: linear-gradient(180deg, #c084fc, #a855f7);"></div>
              <div class="bar-label">${name}</div>
            </div>`).join("")}
        </div>
      </div>
    </div>
  </div>

  <!-- Runtime Status -->
  <div class="section">
    <h2>Runtime Status</h2>
    <div class="card">
      <table>
        <tr><th>Runtime</th><th>Tasks</th><th>Success</th><th>Avg Latency</th><th>Avg Score</th><th>Status</th></tr>
        ${Object.entries(runtimeMetrics).map(([name, r]) => `
          <tr>
            <td><strong>${name}</strong></td>
            <td>${r.taskCount}</td>
            <td>${(r.successRate * 100).toFixed(0)}%</td>
            <td>${(r.avgLatency * 1000).toFixed(0)}ms</td>
            <td>${r.avgReviewScore.toFixed(1)}</td>
            <td><span class="status-dot status-green"></span>Online</td>
          </tr>`).join("")}
      </table>
    </div>
  </div>

  <!-- Validation Results -->
  ${validation.tasks ? `
  <div class="section">
    <h2>Validation Results</h2>
    <div class="card">
      <table>
        <tr><th>Task</th><th>Executor</th><th>Reviewer</th><th>Status</th><th>Score</th><th>Revisions</th><th>Duration</th></tr>
        ${validation.tasks.map(t => `
          <tr>
            <td><strong>${t.name}</strong></td>
            <td>${t.executor}</td>
            <td>${t.reviewer}</td>
            <td><span class="badge ${t.status === 'COMPLETED' ? 'badge-green' : 'badge-red'}">${t.status}</span></td>
            <td>${t.score}</td>
            <td>${t.revisionCount}</td>
            <td>${t.duration}</td>
          </tr>`).join("")}
      </table>
    </div>
  </div>` : ""}

  <!-- Recent Traces -->
  <div class="section">
    <h2>Recent Traces (${traces.length})</h2>
    <div class="card">
      <table>
        <tr><th>Task ID</th><th>Status</th><th>Events</th></tr>
        ${traces.slice(0, 20).map(t => `
          <tr>
            <td><strong>${t.taskId}</strong></td>
            <td><span class="badge ${t.status === 'COMPLETED' ? 'badge-green' : t.status === 'FAILED' ? 'badge-red' : 'badge-yellow'}">${t.status}</span></td>
            <td>${(t.events || []).length} events</td>
          </tr>`).join("")}
      </table>
    </div>
  </div>

</div>
<script>
  // Animate bars on load
  document.querySelectorAll('.bar').forEach(bar => {
    const h = bar.style.height;
    bar.style.height = '4px';
    setTimeout(() => { bar.style.height = h; }, 100);
  });
</script>
</body>
</html>`;

  const outDir = path.resolve(__dirname, "../../dashboard");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log("Dashboard generated: dashboard/index.html");
}

main();

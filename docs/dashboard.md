# Agent Hive v1.0 — Visual Dashboard

## Overview

Static HTML dashboard generated from `.agent-hive/` data.

## Usage

```bash
agent-hive dashboard
```

Generates `dashboard/index.html` with:

1. **Summary Cards** — Runtimes, Total Tasks, Avg Score, Traces count
2. **Runtime Ranking** — Bar charts for Coding, Review, Planning, Reasoning
3. **Runtime Status** — Table with tasks, success rate, latency, score
4. **Validation Results** — Task-by-task results from validation runs
5. **Recent Traces** — Execution trace history

## Data Sources

- `.agent-hive/metrics/runtime.json` — Runtime performance metrics
- `.agent-hive/benchmark/runtime-benchmark.json` — Benchmark scores
- `.agent-hive/traces/*.json` — Execution traces
- `reports/validation-metrics.json` — Validation results

## Files

- `src/commands/generate-dashboard.js` — Dashboard generator (plain JS)
- `dashboard/index.html` — Generated output
- `src/commands/cli.ts` — `dashboard` command

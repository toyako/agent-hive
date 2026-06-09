# Agent Hive v1.0 — Continuous Validation

## Overview

Run Agent Hive on its own codebase for 7 days. Each day picks a different task type.

## Daily Tasks

| Day | Task | Intent |
|-----|------|--------|
| 1 | Unit test TaskIntentClassifier | coding |
| 2 | Review Broker.ts edge cases | review |
| 3 | Refactor: extract timeout logic | refactor |
| 4 | Document API surface | research |
| 5 | Error handling in adapters | coding |
| 6 | Architecture review | architecture |
| 7 | Optimize adapter registration | refactor |

## Usage

```bash
# Generate day N task
node src/commands/run-daily-validation.js 1

# Run it
node dist/commands/cli.js run --task "<instruction>" --dir /path/to/project

# Generate dashboard after
agent-hive dashboard
```

## Metrics Collected

1. Task Count
2. Success Rate
3. Review Hit Rate (reviewer found issues)
4. Revision Rate (revision triggered)
5. Escalation Rate (escalation triggered)
6. Average Runtime
7. Average Review Score

## Day 1 Results

| Metric | Value |
|--------|-------|
| Task | Add unit test for TaskIntentClassifier |
| Intent | coding |
| Executor | codex |
| Reviewer | claude |
| Status | COMPLETED |
| Score | 85 |
| Revisions | 0 |

## Files

- `src/commands/run-daily-validation.js` — Task generator
- `reports/day-N-config.json` — Daily task config
- `reports/week-1-validation.json` — Weekly summary (after 7 days)
- `docs/week-1-report.md` — Weekly report (after 7 days)

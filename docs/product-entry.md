# Agent Hive v1.0 — Unified Entry

## Overview

Single command to run any task. No manual runtime selection needed.

```
agent-hive run --task "Build a landing page"
```

## What Happens

1. **Classify** — TaskIntentClassifier analyzes the instruction
   - Detects: coding, review, planning, refactor, architecture, research
   - Uses keyword matching with confidence scoring

2. **Select** — AutoTopologySelector picks the best runtimes
   - Executor: best capability match for the task intent
   - Reviewer: different runtime with review capabilities
   - Topology: simpleChain, planExecuteReview, or peerReview

3. **Execute** — Broker runs the task through the selected graph
   - Execute → Review → Revision Loop (if needed)

4. **Report** — Structured result output

## Usage

```bash
# Quick start — just describe what you want
agent-hive run --task "Build a REST API for users"

# With options
agent-hive run --task "Refactor this project" --dir /path/to/project --max-revision 5

# Dry run (mock adapters)
agent-hive run --task "Create a test suite" --dry-run
```

## Intent Classification

| Intent | Executor Caps | Reviewer Caps | Topology |
|--------|--------------|---------------|----------|
| coding | coding | review | simpleChain |
| review | review | review, security-scan | peerReview |
| planning | planning | review | planExecuteReview |
| refactor | refactor, coding | review | simpleChain |
| architecture | architecture, coding | review, architecture | planExecuteReview |
| research | research, planning | review | planExecuteReview |

## Files

- `src/product/TaskIntentClassifier.ts` — Intent classification
- `src/product/AutoTopologySelector.ts` — Runtime + topology selection
- `src/commands/cli.ts` — Unified `run --task` command

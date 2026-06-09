# Agent Hive

**Multi-Runtime AI Orchestration Framework**

Agent Hive orchestrates multiple AI runtimes (Claude, Codex, Hermes, OpenClaw) to collaborate on development tasks. It automatically selects the best runtime for execution and review, runs revision loops, and provides observability.

```
┌─────────────────────────────────────────────────┐
│                  Agent Hive                       │
│                                                   │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│   │  Runtime  │───▶│  Broker  │───▶│  Runtime  │   │
│   │ Executor  │    │ (Graph)  │    │ Reviewer  │   │
│   └──────────┘    └──────────┘    └──────────┘   │
│                          │                        │
│                    Revision Loop                   │
│                          │                        │
│                    ┌─────▼─────┐                  │
│                    │ Observ-   │                  │
│                    │ ability   │                  │
│                    └───────────┘                  │
└─────────────────────────────────────────────────┘
```

## Features

- **Unified Entry** — `agent-hive run --task "..."` one command does everything
- **Multi-Runtime** — Claude, Codex, Hermes, OpenClaw with auto-discovery
- **Graph Orchestration** — Flexible topologies (chain, plan-execute-review, peer review)
- **Revision Loop** — Automatic code improvement when reviewer finds issues
- **Runtime Intelligence** — Benchmark scoring across coding, review, planning, reasoning
- **Observability** — Traces, metrics, conversations, task timeline
- **Visual Dashboard** — HTML dashboard from observability data
- **Self Hosting** — Easy setup with doctor, health, and version commands

## Architecture

```
src/
├── adapters/          # Runtime adapters (uniform interface)
│   ├── registry.ts    # Auto-discovery
│   ├── ClaudeAdapter.ts
│   ├── CodexAdapter.ts
│   ├── HermesAdapter.ts
│   └── OpenClawAdapter.ts
├── broker/            # Core orchestration
│   ├── Broker.ts      # Thin orchestrator (115 lines)
│   ├── TaskProcessor.ts  # Execute→Review→Revision
│   └── GraphOperations.ts
├── graph/             # Agent graph + topology templates
├── product/           # v1.0 features (intent classifier, auto-select)
├── safety/            # Circuit breakers, time budgets
├── observability/     # Traces, metrics, decision recording
└── commands/          # CLI entry points
```

## Installation

```bash
git clone https://github.com/toyako/agent-hive.git
cd agent-hive
npm install
npm run build
```

## Quick Start

```bash
# Configure your API
cp runtime.json.example runtime.json
# Edit runtime.json with your API keys

# Verify setup
node dist/commands/cli.js doctor

# Run a task
node dist/commands/cli.js run --task "Build a REST API for users"
```

## Examples

```bash
# Coding task
node dist/commands/cli.js run --task "Create a landing page with hero section"

# Refactor task
node dist/commands/cli.js run --task "Refactor src/utils/ for better error handling"

# Review task
node dist/commands/cli.js run --task "Review src/broker/Broker.ts for edge cases"

# Architecture task
node dist/commands/cli.js run --task "Design a microservice architecture for this project"
```

## Supported Runtimes

| Runtime | Type | Capabilities |
|---------|------|-------------|
| Claude | Reviewer | review, architecture, coding, planning |
| Codex | Developer | coding, refactor |
| Hermes | Planner | planning, coding, review, research |
| OpenClaw | Reviewer | review, code-analysis, security-scan, refactor |

## CLI Commands

| Command | Description |
|---------|-------------|
| `run --task "..."` | Run a task (auto-select everything) |
| `init` | Initialize .agent-hive directory |
| `detect [--health]` | Scan for runtimes |
| `agents` | List registered agents |
| `doctor` | Check system health |
| `health` | Check runtime health |
| `version` | Show version info |
| `dashboard` | Generate visual dashboard |
| `history` | View revision history |

## Observability

Agent Hive records:
- **Traces** — Full execution trace per task
- **Metrics** — Runtime performance (latency, success rate, scores)
- **Conversations** — Multi-agent message flow
- **Decisions** — Why runtimes were selected, why PASS/FAIL

```bash
# Generate dashboard
node dist/commands/cli.js dashboard
# Opens dashboard/index.html
```

## Benchmark

Runtime benchmark scores across 4 dimensions:

```
         Coding  Review  Planning  Reasoning
Codex      97      88       82        90
Claude     92      96       94        95
Hermes     80      90       96        92
```

## Roadmap

- [x] v1.0 — Graph Architecture
- [x] v1.0 — Broker Refactor + Adapter Registry
- [x] v1.0 — Real Project Validation
- [x] v1.0 — Productization (Unified Entry, Dashboard, Self Hosting)
- [ ] v3.1 — Tool Use (file writing, code execution)
- [ ] v3.2 — Multi-Model (Claude Sonnet + GPT-4 + Gemini)

## Contributing

1. Fork the repo
2. Create a feature branch
3. Run tests: `npm test` (or `node dist/commands/test-*.js`)
4. Submit a PR

## License

MIT — see [LICENSE](LICENSE)

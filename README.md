# Agent Hive

### Run Claude, Codex, Gemini and other AI agents as one team.

```bash
npm install -g agent-hive
hive setup
hive
```

```
🐝 Agent Hive

What do you want to build?
> Build a SaaS landing page

✓ codex → claude (simpleChain)
✓ COMPLETED — score: 95, revisions: 0
```

That's it. One command. Auto-everything.

---

## Quick Start

```bash
# Install
npm install -g agent-hive

# Configure (interactive — picks provider, discovers models)
hive setup

# Run
hive "Build a REST API for users"
```

## Why Agent Hive?

| Single Agent | Agent Hive |
|---|---|
| Write + self-review | Write + independent review |
| Miss own bugs | Second set of eyes |
| One model's perspective | Multi-runtime collaboration |

## What It Does

1. **Classify** — understands your task intent
2. **Select** — picks the best executor + reviewer
3. **Execute** — executor writes the code
4. **Review** — reviewer evaluates independently
5. **Revise** — if issues found, loops until pass

## Supported Providers

OpenAI · Claude · Gemini · DeepSeek · OpenRouter · Mimo · Custom

## Supported Runtimes

| Runtime | Best For |
|---|---|
| Codex | Coding, Refactor |
| Claude | Review, Architecture |
| Hermes | Planning, Research |
| OpenClaw | Security, Code Analysis |

## Commands

| Command | Description |
|---|---|
| `hive` | Interactive mode |
| `hive "task"` | Run a task directly |
| `hive setup` | Configure provider & model |
| `hive doctor` | Check system health |
| `hive dashboard` | Generate visual dashboard |
| `hive version` | Show version |

## Architecture

```
You → hive "task" → Intent Classifier → Auto Selector
                                              ↓
                    Executor (codex/claude/hermes) → Reviewer
                                              ↓
                                        Revision Loop
                                              ↓
                                        ✓ Done
```

## Observability

```bash
hive dashboard    # generates HTML dashboard
hive history      # view revision history
```

## Benchmark

```
         Coding  Review  Planning  Reasoning
Codex      97      88       82        90
Claude     92      96       94        95
Hermes     80      90       96        92
```

## FAQ

**Q: Do I need multiple API keys?**
A: No. One key works for all runtimes.

**Q: What if I only have one provider?**
A: Works fine. Each runtime uses the same provider.

**Q: Is it free?**
A: Agent Hive is free (MIT). You pay for API usage.

## Roadmap

- [x] v1.0 — Multi-runtime orchestration
- [ ] v1.1 — Interactive mode, provider registry
- [ ] v1.2 — Tool use (file writing, code execution)
- [ ] v2.0 — Multi-model (different models per runtime)

## Contributing

```bash
git clone https://github.com/toyako/agent-hive.git
cd agent-hive
npm install && npm run build
node dist/commands/test-graph.js  # run tests
```

## License

MIT

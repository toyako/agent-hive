# 🐝 Agent Hive

[English](README.md) | [中文](README.zh-CN.md) | [日本語](README.ja.md) | [Español](README.es.md)

**One task. Multiple AI minds.**

Claude writes. GPT reviews. Gemini plans.

Agent Hive lets multiple AI models collaborate on the same task automatically.

```bash
npm install -g agenthive
hive setup
hive "build a SaaS landing page"
```

```
🐝 Agent Hive

What do you want to build?
> Build a SaaS landing page

[select] codex → claude (simpleChain)
✓ COMPLETED — score: 95, revisions: 0
```

---

## Quick Start

```bash
# Install
npm install -g agenthive

# Configure (pick provider, auto-discovers models)
hive setup

# Run
hive "Build a REST API for users"
```

## Why Agent Hive?

| Single Agent | Agent Hive |
|---|---|
| Writes + self-reviews | Writes + independent review |
| Misses own bugs | Second set of eyes |
| One model's perspective | Multi-model collaboration |

## What It Does

1. **Classify** — understands your task
2. **Select** — picks best executor + reviewer
3. **Execute** — executor writes code
4. **Review** — reviewer evaluates independently
5. **Revise** — loops until pass

## Commands

| Command | Description |
|---|---|
| `hive` | Interactive mode |
| `hive "task"` | Run a task |
| `hive setup` | Configure provider |
| `hive doctor` | Check health |
| `hive memory list` | View memories |
| `hive project list` | View projects |
| `hive dashboard` | Visual dashboard |

## Supported Providers

OpenAI · Claude · Gemini · DeepSeek · OpenRouter · Mimo · Any OpenAI-compatible API

## Memory System

Agent Hive remembers your projects:

```bash
hive project init my-app typescript postgres
hive "add user authentication"
hive memory search auth  # finds past decisions
```

## License

MIT

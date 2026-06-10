# Agent Hive

**One task. Multiple AI minds.**

Claude writes. Codex reviews. Hermes plans.

Agent Hive lets multiple AI runtimes collaborate as one team.

```
$ hive

🐝 Agent Hive

What do you want to build?
> Build a SaaS landing page

[select] codex → claude
✓ COMPLETED — score: 95
```

---

## Install

```bash
npm install -g @toyako/agent-hive
```

## Setup

```bash
hive setup
```

Pick your provider, enter your API key, choose a model. Done.

## Start

```bash
hive
```

Just describe what you want to build. Agent Hive handles the rest.

## How It Works

```
You describe a task
       ↓
Agent Hive picks the best AI for execution and review
       ↓
Executor writes the code
       ↓
Reviewer evaluates independently
       ↓
If issues found → automatic revision loop
       ↓
✓ Done
```

## What Makes It Different

| Single AI | Agent Hive |
|---|---|
| Writes + self-reviews | Writes + independent review |
| Misses own bugs | Second set of eyes |
| One model's perspective | Multiple models collaborate |

## Commands

```bash
hive                          # Interactive mode
hive "build a REST API"       # Run directly
hive setup                    # Configure provider
hive doctor                   # Check health
hive memory list              # View memories
hive project list             # View projects
hive cost                     # Token usage
hive status                   # Current state
```

## Supported Providers

OpenAI · Claude · Gemini · DeepSeek · OpenRouter · Mimo · Any OpenAI-compatible API

## Memory

Agent Hive remembers your projects across sessions.

```bash
hive project init my-app typescript react
hive "add authentication"
# ... close terminal ...
hive resume
# Continues where you left off
```

## FAQ

**Do I need multiple API keys?**
No. One key works for everything.

**What if I only have one provider?**
Works fine. All runtimes use the same provider.

**Is it free?**
Agent Hive is free (MIT). You pay for API usage.

## Links

- [GitHub](https://github.com/toyako/agent-hive)
- [Issues](https://github.com/toyako/agent-hive/issues)
- [Discussions](https://github.com/toyako/agent-hive/discussions)

## License

MIT

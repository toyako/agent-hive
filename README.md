# Agent Hive

[English](README.md) | [中文](README.zh-CN.md)

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

Describe what you want. Agent Hive handles the rest.

## Commands

```bash
hive                          # Interactive mode
hive "build a REST API"       # Run directly
hive setup                    # Configure provider
hive doctor                   # Check health
hive config                   # Config center
hive roles                    # View agent roles
hive workflows                # View workflows
hive tools                    # View available tools
hive mcp                      # MCP servers
hive channels                 # Communication channels
hive memory list              # View memories
hive project list             # View projects
hive resume                   # Resume last project
hive cost                     # Token usage
hive status                   # Current state
```

## Supported Providers

OpenAI · Claude · Gemini · DeepSeek · OpenRouter · Mimo · Ollama · Custom

## How It Works

1. You describe a task
2. Agent Hive picks the best AI for execution and review
3. Executor writes the code
4. Reviewer evaluates independently
5. If issues found → automatic revision loop
6. Done

## FAQ

**Do I need multiple API keys?**
No. One key works for everything.

**What if I only have one provider?**
Works fine. All runtimes use the same provider.

**Is it free?**
Agent Hive is free (MIT). You pay for API usage.

## Links

- [GitHub](https://github.com/toyako/agent-hive)
- [npm](https://www.npmjs.com/package/@toyako/agent-hive)
- [Issues](https://github.com/toyako/agent-hive/issues)

## License

MIT

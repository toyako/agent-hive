# Agent Hive

> Self-healing AI workflow runtime for unreliable AI systems.

## The Problem

AI workflows break unpredictably in production environments.

## The Solution

Agent Hive automatically detects failures and recovers workflows.

## Try it in 30 seconds

```bash
npx hive run demo
```

## What you'll see

```
🚀 Building API workflow...
  ⏳ Node 1: Analyzing requirements...
  ✅ Node 1 completed
  ⏳ Node 2: Building API...
  ❌ Node 2 failed (API timeout)
  🛡️ Self-healing triggered...
  🔄 Retrying Node 2...
  ✅ Node 2 recovered
  ⏳ Node 3: Running tests...
  ✅ Node 3 completed

✅ Workflow completed!
📊 Duration: 2.1s | Nodes: 3 | Retries: 1
```

## Why it matters

- 🔄 **Retries automatically** — no manual intervention
- 🛡️ **Recovers failures** — keeps workflows running
- ⚡ **Production ready** — checkpoint, resume, saga

## Install

```bash
npm install -g @toyako/hive
```

## Next Steps

- [Quick Start](docs/quickstart.md)
- [Examples](examples/)
- [API Reference](docs/api/)

## License

MIT

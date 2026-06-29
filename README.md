# Agent Hive

> A TypeScript-based AI workflow runtime with self-healing execution, DAG orchestration, and production-grade reliability.

## What is Agent Hive?

Agent Hive is an open source AI workflow platform that makes it easy to build, run, and manage complex AI agent workflows with automatic recovery and self-healing capabilities.

## Why it exists

- **AI workflow fragmentation**: Agents are hard to orchestrate
- **Unreliable execution**: Workflows fail without recovery
- **No production runtime**: No checkpoint, resume, or saga support
- **Complex setup**: Too much configuration required

## Features

- 🔄 **Workflow Orchestration**: DAG-based multi-agent execution
- 🛡️ **Self-Healing**: Automatic failure detection and recovery
- 💾 **Checkpoint & Resume**: Save and restore execution state
- 🔌 **Plugin System**: Extend without modifying core
- 📊 **Observability**: Metrics, logs, and traces
- 🚀 **Production Ready**: Battle-tested reliability

## Quick Start (5 minutes)

```bash
# Install
npm install -g @toyako/hive

# Run your first workflow
hive run "build a REST API"

# Start the API server
hive server
```

## Example Output

```
$ hive run "build a REST API"

🚀 Starting workflow...
📋 Task: build a REST API
🔄 DAG: 4 nodes (A → B,C → D)

⏳ Executing Node A (hermes)...
✅ Node A completed (12ms)

⏳ Executing Node B (worker)...
❌ Node B failed (API timeout)
🛡️ Self-healing triggered...
🔄 Retry 1/3...
✅ Node B completed (45ms)

⏳ Executing Node C (worker)...
✅ Node C completed (23ms)

⏳ Executing Node D (reviewer)...
✅ Node D completed (8ms)

✅ Workflow completed!
📊 Total: 88ms | Nodes: 4 | Retries: 1
```

## Architecture (Simplified)

```
User → CLI/API → Runtime → Workflow → Result
                   ↓
              Self-Healing
                   ↓
              Checkpoint
```

## Use Cases

- **AI Workflow Automation**: Orchestrate multi-step AI tasks
- **API Orchestration**: Chain multiple API calls with recovery
- **Self-Healing Pipelines**: Automatic failure recovery
- **Multi-Agent Systems**: Coordinate multiple AI agents

## Documentation

- [Quick Start](docs/quickstart.md)
- [Architecture](docs/architecture/overview.md)
- [API Reference](docs/api/)
- [SDK Guide](docs/sdk/)
- [Plugin Guide](docs/plugins/)

## Examples

```bash
# Basic workflow
npm run example:basic

# Self-healing demo
npm run example:self-healing

# API server
npm run example:api
```

## Stability

- ✅ Stress Test: 1167 ops/s
- ✅ Chaos Test: 100% recovery rate
- ✅ Security: 0 vulnerabilities

See [Stability Report](docs/stability.md) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT

---

**Agent Hive** — Production-ready, developer-friendly open source AI workflow platform.

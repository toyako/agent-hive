# Agent Hive

A multi-agent DAG-based execution runtime system with self-healing capabilities.

## Installation

```bash
npm install -g @toyako/hive
```

## Quick Start

```bash
# Run a task
hive run "build a REST API"

# Run with self-healing
hive self-heal "build a REST API"

# Run production mode
hive production "build a REST API"

# Start API server
hive server
```

## Features

- DAG-based execution
- Self-healing runtime
- Checkpoint & Resume
- Saga Compensation
- Event Sourcing
- Plugin SDK
- REST API
- SDK

## Documentation

- [Architecture](docs/architecture/overview.md)
- [Developer Guide](docs/developer/)
- [User Guide](docs/user/)
- [API Reference](docs/api/)

## License

MIT

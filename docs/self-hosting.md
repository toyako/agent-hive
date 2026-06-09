# Agent Hive v1.0 — Self Hosting

## Overview

Commands for running Agent Hive on any machine.

## Commands

### `agent-hive init`
Initialize `.agent-hive/` directory structure.

### `agent-hive version`
Show version and environment info.

### `agent-hive doctor`
Check system health:
- Directory structure
- runtime.json presence
- API key configuration
- Runtime detection

### `agent-hive health`
Check health of all registered runtimes.

## Usage

```bash
# First time setup
agent-hive init

# Check everything is working
agent-hive doctor

# Check runtime health
agent-hive health

# See version
agent-hive version
```

## Example Doctor Output

```
  Agent Hive Doctor

  ✓ .agent-hive directory structure OK
  ✓ runtime.json found (codex, claude, hermes)
    ✓ codex: API key configured
    ✓ claude: API key configured
    ✓ hermes: API key configured

  Runtime Detection:
  [registry] codex: installed=true
  [registry] claude: installed=true
  [registry] hermes: installed=true
  [registry] openclaw: installed=true

  ┌─────────────────────────────────────┐
  │ Doctor Summary                       │
  ├─────────────────────────────────────┤
  │ Directories: ✓ OK                   │
  │ Runtimes:    4 detected             │
  └─────────────────────────────────────┘
```

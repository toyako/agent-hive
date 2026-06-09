# Architecture

## Overview

```
agent-hive/
├── src/
│   ├── adapters/          # Runtime adapters (Claude, Codex, Hermes, OpenClaw)
│   │   ├── registry.ts    # Adapter auto-discovery
│   │   ├── ClaudeAdapter.ts
│   │   ├── CodexAdapter.ts
│   │   ├── HermesAdapter.ts
│   │   └── OpenClawAdapter.ts
│   ├── broker/            # Core orchestration
│   │   ├── Broker.ts      # Thin orchestrator (115 lines)
│   │   ├── TaskProcessor.ts  # Execute→Review→Revision loop
│   │   ├── GraphOperations.ts # Graph/safety/conversation helpers
│   │   ├── AgentRegistry.ts
│   │   └── MessageBus.ts
│   ├── graph/             # Graph architecture
│   │   ├── AgentGraph.ts
│   │   ├── TopologyTemplates.ts
│   │   └── GraphValidator.ts
│   ├── product/           # v1.0 product features
│   │   ├── TaskIntentClassifier.ts
│   │   └── AutoTopologySelector.ts
│   ├── safety/            # Circuit breakers, dedup
│   ├── utils/             # Shared utilities
│   ├── workflow/          # XState state machines
│   └── commands/          # CLI entry points
├── dashboard/             # Generated HTML dashboard
├── reports/               # Validation reports
└── runtime.json           # Runtime configuration
```

## Key Concepts

### Runtimes
AI backends (Claude, Codex, etc.) wrapped in adapters with uniform interface: detect, health, execute, review.

### Graph
Directed graph of agent relationships. Edges define delegation, review, escalation paths.

### Broker
Thin orchestrator that routes tasks through the graph. Delegates to TaskProcessor for execution.

### Revision Loop
If reviewer returns FAIL, executor gets feedback and retries. Up to maxRevision attempts.

### TaskIntentClassifier
Classifies task instructions into intents (coding, review, planning, etc.) for automatic runtime selection.

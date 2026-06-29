# Quick Start

## Install (30 seconds)

```bash
npm install -g @toyako/hive
```

## First Workflow (2 minutes)

```bash
# Run a simple task
hive run "hello world"

# Run with self-healing
hive self-heal "build a REST API"

# Start API server
hive server
```

## Use SDK (2 minutes)

```javascript
const { AgentHive } = require('@toyako/agent-hive');

const hive = new AgentHive();

async function main() {
  const result = await hive.run({
    task: "Build a REST API"
  });
  
  console.log('Result:', result);
}

main();
```

## Next Steps

- [Examples](../examples/)
- [API Reference](../api/)
- [Plugin Guide](../plugins/)

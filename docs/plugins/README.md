# Plugin Template

## Overview

This is a template for creating Agent Hive plugins.

## Quick Start

```bash
# Clone template
git clone https://github.com/toyako/agent-hive-plugin-template.git

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## Plugin Structure

```
my-plugin/
  src/
    index.ts        # Plugin entry
    plugin.ts       # Plugin implementation
  tests/
    plugin.test.ts  # Tests
  package.json
  README.md
```

## Plugin Lifecycle

1. Register: `registry.register(plugin)`
2. Initialize: `plugin.initialize()`
3. Execute: `plugin.execute(input)`
4. Cleanup: `plugin.cleanup()`

## Example Plugin

```typescript
import { Plugin } from '@toyako/agent-hive';

export class MyPlugin implements Plugin {
  name = 'my-plugin';
  type = 'runtime';
  version = '1.0.0';
  enabled = true;

  async execute(input: any): Promise<any> {
    return { output: 'processed', input };
  }
}
```

## Documentation

- [Plugin Guide](docs/plugins/)
- [API Reference](docs/api/)
- [Examples](examples/)

# Quickstart

## Prerequisites

- Node.js 18+
- An AI API key (OpenAI, Anthropic, or compatible)

## Setup

```bash
# Clone
git clone https://github.com/toyako/agent-hive.git
cd agent-hive

# Install
npm install
npm run build

# Configure
cat > runtime.json << 'EOF'
{
  "codex": {
    "binary": "openai-sdk",
    "model": "gpt-4",
    "env": {
      "OPENAI_API_KEY": "your-key-here",
      "OPENAI_BASE_URL": "https://api.openai.com/v1"
    }
  },
  "claude": {
    "binary": "openai-sdk",
    "model": "gpt-4",
    "env": {
      "OPENAI_API_KEY": "your-key-here",
      "OPENAI_BASE_URL": "https://api.openai.com/v1"
    }
  }
}
EOF

# Verify
node dist/commands/cli.js doctor
```

## Run Your First Task

```bash
node dist/commands/cli.js run --task "Write a hello world function in JavaScript"
```

## What Happens

1. Agent Hive detects your runtimes
2. Classifies the task intent (coding)
3. Selects the best executor and reviewer
4. Executor writes the code
5. Reviewer evaluates it
6. If issues found → revision loop
7. Result displayed

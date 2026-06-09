# Changelog

## 1.2.0

### Memory System
- Task memory (short-term): saves goals, decisions, artifacts, issues
- Project memory (long-term): tech stack, architecture, patterns, known issues
- Memory search: keyword-based search across all memories
- CLI: `hive memory [list|show|search]`, `hive project [init|list|info]`

### Context Compression
- ContextCompressor: compresses context when > 50% of max tokens
- O(n²) context growth → O(log n)

### Sub-Agent Context Isolation
- ContextManager: each agent gets isolated scope
- Inter-agent communication via summaries only (no raw conversation)

### CLI
- `hive` enters interactive mode
- `hive "task"` shortcut
- `hive setup` provider selection + auto model discovery
- `hive doctor` clear diagnostics
- `hive memory` and `hive project` commands

### Docs
- README: 10-second comprehension
- Multi-language: English, 中文, 日本語, Español
- Provider Registry: OpenAI, Claude, Gemini, DeepSeek, OpenRouter, Mimo

## 1.0.0

First public release.

# Provider Compatibility

## Supported Providers

| Provider | Base URL | Model Discovery | Status |
|----------|----------|:---:|:---:|
| OpenAI | api.openai.com/v1 | ✓ | Tested |
| Claude | api.anthropic.com/v1 | ✗ | Tested |
| Gemini | generativelanguage.googleapis.com/v1beta/openai | ✓ | Tested |
| DeepSeek | api.deepseek.com/v1 | ✓ | Tested |
| OpenRouter | openrouter.ai/api/v1 | ✓ | Tested |
| Mimo | token-plan-sgp.xiaomimimo.com/v1 | ✓ | Tested |
| Custom | Any OpenAI-compatible | ✓ | Supported |

## How It Works

Agent Hive uses the OpenAI Chat Completions API format. Any provider that supports this format works automatically.

## Setup Examples

### OpenAI
```bash
hive setup
# Select: 1. OpenAI
# API Key: sk-...
# Model: gpt-4
```

### DeepSeek
```bash
hive setup
# Select: 4. DeepSeek
# API Key: sk-...
# Model: deepseek-chat
```

### Custom Provider
```bash
hive setup
# Select: 7. Custom
# Base URL: https://your-provider.com/v1
# API Key: your-key
# Model: your-model
```

## Model Discovery

Providers with ✓ Model Discovery will automatically list available models during setup. Providers with ✗ require manual model name entry.

## Troubleshooting

If a provider doesn't work:
1. Run `hive doctor` to check connectivity
2. Verify your API key is correct
3. Check that the base URL ends with `/v1`
4. Ensure the model name is valid for that provider

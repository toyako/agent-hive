/**
 * ProviderRegistry — built-in provider configurations.
 * Users pick a provider during setup; no manual JSON editing needed.
 */

export interface ProviderEntry {
  name: string;
  baseUrl: string;
  modelDiscovery: boolean;
  defaultModel: string;
}

export const PROVIDERS: ProviderEntry[] = [
  { name: "OpenAI", baseUrl: "https://api.openai.com/v1", modelDiscovery: true, defaultModel: "gpt-4" },
  { name: "Claude", baseUrl: "https://api.anthropic.com/v1", modelDiscovery: false, defaultModel: "claude-sonnet-4-20250514" },
  { name: "Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", modelDiscovery: true, defaultModel: "gemini-2.5-flash" },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", modelDiscovery: true, defaultModel: "deepseek-chat" },
  { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", modelDiscovery: true, defaultModel: "anthropic/claude-sonnet-4" },
  { name: "Mimo", baseUrl: "https://token-plan-sgp.xiaomimimo.com/v1", modelDiscovery: true, defaultModel: "mimo-v2.5-pro" },
  { name: "Custom", baseUrl: "", modelDiscovery: true, defaultModel: "gpt-4" },
];

export function getProvider(name: string): ProviderEntry | undefined {
  return PROVIDERS.find(p => p.name.toLowerCase() === name.toLowerCase());
}

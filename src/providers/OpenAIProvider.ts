/**
 * OpenAIProvider — OpenAI-compatible API provider.
 * Works with OpenAI, DeepSeek, Mimo, OpenRouter, and any compatible API.
 */
import { ProviderAdapter, ProviderConfig, ValidationResult } from "./ProviderAdapter";

export class OpenAIProvider implements ProviderAdapter {
  name: string;
  baseUrl: string;
  private defaultModel: string;

  constructor(name: string, baseUrl: string, defaultModel: string) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
  }

  async setup(apiKey: string, baseUrl?: string): Promise<ProviderConfig> {
    const url = baseUrl || this.baseUrl;
    const models = await this.listModels(apiKey, url);
    return {
      name: this.name,
      baseUrl: url,
      apiKey,
      model: models[0] || this.defaultModel,
      models,
    };
  }

  async validate(apiKey: string, baseUrl: string): Promise<ValidationResult> {
    try {
      const res = await fetch(`${baseUrl}/models`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      } as any);

      if (res.ok) {
        const data = await res.json() as any;
        const models = (data.data || []).map((m: any) => m.id);
        return { valid: true, models };
      }
      return { valid: false, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  async listModels(apiKey: string, baseUrl: string): Promise<string[]> {
    const result = await this.validate(apiKey, baseUrl);
    return result.models || [];
  }
}

// Pre-configured providers
export const PROVIDER_INSTANCES = {
  openai: new OpenAIProvider("OpenAI", "https://api.openai.com/v1", "gpt-4"),
  deepseek: new OpenAIProvider("DeepSeek", "https://api.deepseek.com/v1", "deepseek-chat"),
  openrouter: new OpenAIProvider("OpenRouter", "https://openrouter.ai/api/v1", "anthropic/claude-sonnet-4"),
  mimo: new OpenAIProvider("Mimo", "https://token-plan-sgp.xiaomimimo.com/v1", "mimo-v2.5-pro"),
  ollama: new OpenAIProvider("Ollama", "http://localhost:11434/v1", "llama3"),
};

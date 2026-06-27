/**
 * OpenAI Provider Plugin — Phase 3
 * 
 * OpenAI 兼容的 Provider 插件
 * 
 * 支持：
 * - OpenAI API
 * - OpenRouter
 * - Mimo
 * - 其他 OpenAI 兼容 API
 */

import {
  Provider,
  ProviderConfig,
  ProviderType,
  ProviderCapability,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  CompletionOptions,
  CompletionResponse,
  globalProviderRegistry
} from "./ProviderRegistry";

export class OpenAICompatibleProvider implements Provider {
  name: string;
  type: ProviderType | string;
  capabilities: ProviderCapability[];
  config: ProviderConfig;
  
  private client: any;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
    this.capabilities = [
      ProviderCapability.CHAT,
      ProviderCapability.COMPLETION,
      ProviderCapability.FUNCTION_CALLING
    ];
  }

  async initialize(): Promise<void> {
    // 动态导入 OpenAI SDK
    const OpenAI = (await import("openai")).default;
    
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl
    });
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error("Provider not initialized");
    }

    const response = await this.client.chat.completions.create({
      model: options?.model || this.config.model,
      messages: messages,
      max_tokens: options?.maxTokens || this.config.maxTokens,
      temperature: options?.temperature || this.config.temperature,
      stop: options?.stop
    });

    const choice = response.choices[0];
    
    return {
      content: choice.message.content || "",
      role: choice.message.role,
      finishReason: choice.finish_reason || "stop",
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      }
    };
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse> {
    // 将 completion 转换为 chat
    const response = await this.chat(
      [{ role: "user", content: prompt }],
      options
    );

    return {
      text: response.content,
      finishReason: response.finishReason,
      usage: response.usage
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      // 尝试一个简单的 API 调用
      const response = await this.chat(
        [{ role: "user", content: "ping" }],
        { maxTokens: 5 }
      );
      
      return response.content.length > 0;
    } catch (error) {
      return false;
    }
  }

  async getModels(): Promise<string[]> {
    if (!this.client) return [];
    
    try {
      const models = await this.client.models.list();
      return models.data.map((m: any) => m.id);
    } catch (error) {
      return [];
    }
  }

  async close(): Promise<void> {
    this.client = null;
  }
}

/**
 * 注册 OpenAI Provider 插件
 */
export function registerOpenAIProvider(): void {
  globalProviderRegistry.register({
    name: "openai",
    type: ProviderType.OPENAI,
    factory: (config) => new OpenAICompatibleProvider(config),
    defaultConfig: {
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4",
      maxTokens: 4096,
      temperature: 0.7
    },
    capabilities: [
      ProviderCapability.CHAT,
      ProviderCapability.COMPLETION,
      ProviderCapability.FUNCTION_CALLING
    ]
  });

  // 注册 OpenRouter
  globalProviderRegistry.register({
    name: "openrouter",
    type: ProviderType.OPENROUTER,
    factory: (config) => new OpenAICompatibleProvider(config),
    defaultConfig: {
      baseUrl: "https://openrouter.ai/api/v1",
      model: "anthropic/claude-3-opus",
      maxTokens: 4096,
      temperature: 0.7
    },
    capabilities: [
      ProviderCapability.CHAT,
      ProviderCapability.COMPLETION,
      ProviderCapability.FUNCTION_CALLING
    ]
  });

  // 注册 Mimo
  globalProviderRegistry.register({
    name: "mimo",
    type: ProviderType.MIMO,
    factory: (config) => new OpenAICompatibleProvider(config),
    defaultConfig: {
      baseUrl: "https://api.mimo.xiaomi.com/v1",
      model: "mimo-v2.5-pro",
      maxTokens: 4096,
      temperature: 0.7
    },
    capabilities: [
      ProviderCapability.CHAT,
      ProviderCapability.COMPLETION,
      ProviderCapability.FUNCTION_CALLING
    ]
  });
}

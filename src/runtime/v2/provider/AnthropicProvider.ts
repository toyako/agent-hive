/**
 * Anthropic Provider Plugin — Phase 3
 * 
 * Anthropic Claude 的 Provider 插件
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

export class AnthropicProvider implements Provider {
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
      ProviderCapability.VISION,
      ProviderCapability.FUNCTION_CALLING
    ];
  }

  async initialize(): Promise<void> {
    // 动态导入 Anthropic SDK
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    
    this.client = new Anthropic({
      apiKey: this.config.apiKey
    });
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error("Provider not initialized");
    }

    // 转换消息格式
    const systemMessage = messages.find(m => m.role === "system");
    const userMessages = messages.filter(m => m.role !== "system");

    const response = await this.client.messages.create({
      model: options?.model || this.config.model,
      max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }))
    });

    const content = response.content[0];
    
    return {
      content: content.type === "text" ? content.text : "",
      role: "assistant",
      finishReason: response.stop_reason || "end_turn",
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      }
    };
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse> {
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
      
      const response = await this.chat(
        [{ role: "user", content: "ping" }],
        { maxTokens: 5 }
      );
      
      return response.content.length > 0;
    } catch (error) {
      return false;
    }
  }

  async close(): Promise<void> {
    this.client = null;
  }
}

/**
 * 注册 Anthropic Provider 插件
 */
export function registerAnthropicProvider(): void {
  globalProviderRegistry.register({
    name: "anthropic",
    type: ProviderType.ANTHROPIC,
    factory: (config) => new AnthropicProvider(config),
    defaultConfig: {
      baseUrl: "https://api.anthropic.com",
      model: "claude-3-opus-20240229",
      maxTokens: 4096
    },
    capabilities: [
      ProviderCapability.CHAT,
      ProviderCapability.VISION,
      ProviderCapability.FUNCTION_CALLING
    ]
  });
}

/**
 * Google Provider Plugin — Phase 3
 * 
 * Google Gemini 的 Provider 插件
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

export class GoogleProvider implements Provider {
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
    // 动态导入 Google Generative AI SDK
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    
    this.client = new GoogleGenerativeAI(this.config.apiKey);
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error("Provider not initialized");
    }

    const model = this.client.getGenerativeModel({
      model: options?.model || this.config.model
    });

    // 转换消息格式
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const lastMessage = messages[messages.length - 1];
    
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    
    return {
      content: response.text(),
      role: "assistant",
      finishReason: response.candidates?.[0]?.finishReason || "STOP",
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
    };
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse> {
    if (!this.client) {
      throw new Error("Provider not initialized");
    }

    const model = this.client.getGenerativeModel({
      model: options?.model || this.config.model
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    
    return {
      text: response.text(),
      finishReason: response.candidates?.[0]?.finishReason || "STOP",
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0
      }
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) return false;
      
      const response = await this.complete("ping", { maxTokens: 5 });
      return response.text.length > 0;
    } catch (error) {
      return false;
    }
  }

  async close(): Promise<void> {
    this.client = null;
  }
}

/**
 * 注册 Google Provider 插件
 */
export function registerGoogleProvider(): void {
  globalProviderRegistry.register({
    name: "google",
    type: ProviderType.GOOGLE,
    factory: (config) => new GoogleProvider(config),
    defaultConfig: {
      model: "gemini-pro",
      maxTokens: 4096
    },
    capabilities: [
      ProviderCapability.CHAT,
      ProviderCapability.VISION,
      ProviderCapability.FUNCTION_CALLING
    ]
  });
}

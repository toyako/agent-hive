/**
 * Provider Manager — Phase 3
 * 
 * 统一的 Provider 管理器
 * 
 * 职责：
 * 1. 管理所有 Provider 插件
 * 2. 提供统一的调用接口
 * 3. 自动选择最佳 Provider
 * 4. 负载均衡和故障转移
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
  ProviderRegistry,
  globalProviderRegistry
} from "./ProviderRegistry";
import { registerOpenAIProvider, OpenAICompatibleProvider } from "./OpenAIProvider";
import { registerAnthropicProvider } from "./AnthropicProvider";
import { registerGoogleProvider } from "./GoogleProvider";

// Provider 选择策略
export enum ProviderSelectionStrategy {
  PRIORITY = "priority",      // 按优先级选择
  ROUND_ROBIN = "round_robin", // 轮询
  LEAST_LATENCY = "least_latency", // 最低延迟
  RANDOM = "random"           // 随机
}

export class ProviderManager {
  private registry: ProviderRegistry;
  private initialized: boolean = false;

  constructor(registry?: ProviderRegistry) {
    this.registry = registry || globalProviderRegistry;
  }

  /**
   * 初始化 Provider Manager
   * 
   * 注册所有内置 Provider 插件
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 注册内置 Provider 插件
    registerOpenAIProvider();
    registerAnthropicProvider();
    registerGoogleProvider();

    this.initialized = true;
    console.log("[ProviderManager] Initialized with built-in providers");
  }

  /**
   * 创建 Provider 实例
   */
  async createProvider(name: string, config: Partial<ProviderConfig>): Promise<Provider | null> {
    const provider = this.registry.createProvider(name, config);
    if (provider) {
      await provider.initialize();
    }
    return provider;
  }

  /**
   * 获取 Provider 实例
   */
  getProvider(name: string): Provider | undefined {
    return this.registry.getProvider(name);
  }

  /**
   * 聊天完成
   */
  async chat(
    providerName: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const provider = this.registry.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    return provider.chat(messages, options);
  }

  /**
   * 文本完成
   */
  async complete(
    providerName: string,
    prompt: string,
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const provider = this.registry.getProvider(providerName);
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    return provider.complete(prompt, options);
  }

  /**
   * 按能力查找 Provider
   */
  findProvidersByCapability(capability: ProviderCapability): Provider[] {
    const registrations = this.registry.findProvidersByCapability(capability);
    return registrations
      .map(reg => this.registry.getProvider(reg.name))
      .filter((p): p is Provider => p !== undefined);
  }

  /**
   * 获取所有活跃的 Provider
   */
  getActiveProviders(): Provider[] {
    return this.registry.getActiveProviders();
  }

  /**
   * 健康检查所有 Provider
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    return this.registry.healthCheckAll();
  }

  /**
   * 关闭所有 Provider
   */
  async closeAll(): Promise<void> {
    await this.registry.closeAll();
  }

  /**
   * 获取 Provider 注册表
   */
  getRegistry(): ProviderRegistry {
    return this.registry;
  }
}

// 全局 Provider Manager
export const globalProviderManager = new ProviderManager();

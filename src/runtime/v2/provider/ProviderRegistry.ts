/**
 * Provider Plugin System — Phase 3
 * 
 * 供应商无关的模型接入系统
 * 
 * 铁律：
 * 1. 所有模型接入必须作为独立插件或扩展实现
 * 2. 绝对不能在 Runtime Core 核心代码里硬编码任何厂商的特定 API 逻辑
 * 3. 严格遵守架构冻结规则（第4条：供应商无关原则）
 */

// Provider 类型
export enum ProviderType {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
  OPENROUTER = "openrouter",
  MIMO = "mimo",
  CUSTOM = "custom"
}

// Provider 配置
export interface ProviderConfig {
  type: ProviderType | string;
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

// Provider 能力
export enum ProviderCapability {
  CHAT = "chat",
  COMPLETION = "completion",
  EMBEDDING = "embedding",
  VISION = "vision",
  FUNCTION_CALLING = "function_calling",
  STREAMING = "streaming"
}

// Provider 接口
export interface Provider {
  name: string;
  type: ProviderType | string;
  capabilities: ProviderCapability[];
  config: ProviderConfig;
  
  // 初始化
  initialize(): Promise<void>;
  
  // 聊天完成
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  
  // 文本完成
  complete(prompt: string, options?: CompletionOptions): Promise<CompletionResponse>;
  
  // 健康检查
  healthCheck(): Promise<boolean>;
  
  // 获取模型列表
  getModels?(): Promise<string[]>;
  
  // 关闭连接
  close?(): Promise<void>;
}

// 聊天消息
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

// 聊天选项
export interface ChatOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  stream?: boolean;
}

// 聊天响应
export interface ChatResponse {
  content: string;
  role: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

// 完成选项
export interface CompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
}

// 完成响应
export interface CompletionResponse {
  text: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

// Provider 注册信息
export interface ProviderRegistration {
  name: string;
  type: ProviderType | string;
  factory: (config: ProviderConfig) => Provider;
  defaultConfig: Partial<ProviderConfig>;
  capabilities: ProviderCapability[];
}

/**
 * Provider Registry — 供应商无关的插件注册表
 */
export class ProviderRegistry {
  private providers: Map<string, Provider> = new Map();
  private registrations: Map<string, ProviderRegistration> = new Map();

  /**
   * 注册 Provider 插件
   */
  register(registration: ProviderRegistration): void {
    this.registrations.set(registration.name, registration);
    console.log(`[Provider] Registered: ${registration.name} (${registration.type})`);
  }

  /**
   * 创建 Provider 实例
   */
  createProvider(name: string, config: Partial<ProviderConfig>): Provider | null {
    const registration = this.registrations.get(name);
    if (!registration) {
      console.error(`[Provider] Not found: ${name}`);
      return null;
    }

    const fullConfig: ProviderConfig = {
      ...registration.defaultConfig,
      ...config,
      type: registration.type,
      name: name
    } as ProviderConfig;

    const provider = registration.factory(fullConfig);
    this.providers.set(name, provider);
    
    return provider;
  }

  /**
   * 获取 Provider 实例
   */
  getProvider(name: string): Provider | undefined {
    return this.providers.get(name);
  }

  /**
   * 按能力查找 Provider（搜索活跃实例）
   */
  findProvidersByCapability(capability: ProviderCapability): Provider[] {
    const result: Provider[] = [];
    
    for (const [name, provider] of this.providers) {
      if (provider.capabilities.includes(capability)) {
        result.push(provider);
      }
    }
    
    return result;
  }

  /**
   * 按能力查找注册信息
   */
  findRegistrationsByCapability(capability: ProviderCapability): ProviderRegistration[] {
    return Array.from(this.registrations.values())
      .filter(reg => reg.capabilities.includes(capability));
  }

  /**
   * 获取所有注册的 Provider
   */
  getRegistrations(): ProviderRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * 获取所有活跃的 Provider
   */
  getActiveProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * 初始化所有 Provider
   */
  async initializeAll(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        await provider.initialize();
        console.log(`[Provider] Initialized: ${name}`);
      } catch (error) {
        console.error(`[Provider] Failed to initialize ${name}:`, error);
      }
    }
  }

  /**
   * 健康检查所有 Provider
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [name, provider] of this.providers) {
      try {
        const healthy = await provider.healthCheck();
        results.set(name, healthy);
      } catch (error) {
        results.set(name, false);
      }
    }
    
    return results;
  }

  /**
   * 关闭所有 Provider
   */
  async closeAll(): Promise<void> {
    for (const [name, provider] of this.providers) {
      try {
        if (provider.close) {
          await provider.close();
        }
        console.log(`[Provider] Closed: ${name}`);
      } catch (error) {
        console.error(`[Provider] Failed to close ${name}:`, error);
      }
    }
    this.providers.clear();
  }
}

// 全局 Provider 注册表
export const globalProviderRegistry = new ProviderRegistry();

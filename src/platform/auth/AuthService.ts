/**
 * AuthService — Platform Phase 1
 * 
 * 支持：
 * - API Key
 * - 未来可扩展：JWT, OAuth2, OIDC
 */

// Auth Result
export interface AuthResult {
  valid: boolean;
  userId?: string;
  error?: string;
}

export class AuthService {
  private apiKeys: Map<string, string> = new Map(); // apiKey -> userId

  /**
   * 注册 API Key
   */
  registerApiKey(apiKey: string, userId: string): void {
    this.apiKeys.set(apiKey, userId);
  }

  /**
   * 验证 API Key
   */
  validateApiKey(apiKey: string): AuthResult {
    const userId = this.apiKeys.get(apiKey);
    if (userId) {
      return { valid: true, userId };
    }
    return { valid: false, error: "Invalid API Key" };
  }

  /**
   * 删除 API Key
   */
  removeApiKey(apiKey: string): boolean {
    return this.apiKeys.delete(apiKey);
  }

  /**
   * 获取所有 API Keys
   */
  getApiKeys(): string[] {
    return Array.from(this.apiKeys.keys());
  }
}

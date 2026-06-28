/**
 * RetryPolicy — Self-Healing Runtime Phase 2
 * 
 * 支持：
 * - maxAttempts
 * - backoff: exponential, linear, fixed
 * - jitter
 * - retryableErrors
 * 
 * 禁止无限 Retry
 */

// Retry Config
export interface RetryConfig {
  maxAttempts: number;
  backoff: "exponential" | "linear" | "fixed";
  baseDelay: number; // ms
  maxDelay: number; // ms
  jitter: boolean;
  retryableErrors: string[];
}

// Retry State
export interface RetryState {
  attempt: number;
  totalDelay: number;
  lastError?: string;
}

export class RetryPolicy {
  private config: RetryConfig;
  private state: RetryState;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      backoff: "exponential",
      baseDelay: 1000,
      maxDelay: 10000,
      jitter: true,
      retryableErrors: ["NETWORK", "API", "TIMEOUT"],
      ...config
    };

    this.state = {
      attempt: 0,
      totalDelay: 0
    };
  }

  /**
   * 是否可以重试
   */
  canRetry(errorType: string): boolean {
    if (this.state.attempt >= this.config.maxAttempts) {
      return false;
    }

    if (!this.config.retryableErrors.includes(errorType)) {
      return false;
    }

    return true;
  }

  /**
   * 获取重试延迟
   */
  getDelay(): number {
    let delay: number;

    switch (this.config.backoff) {
      case "exponential":
        delay = this.config.baseDelay * Math.pow(2, this.state.attempt);
        break;
      case "linear":
        delay = this.config.baseDelay * (this.state.attempt + 1);
        break;
      case "fixed":
      default:
        delay = this.config.baseDelay;
    }

    // 应用最大延迟
    delay = Math.min(delay, this.config.maxDelay);

    // 应用 jitter
    if (this.config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * 记录重试
   */
  recordRetry(error: string): void {
    this.state.attempt++;
    this.state.lastError = error;
    this.state.totalDelay += this.getDelay();
  }

  /**
   * 获取状态
   */
  getState(): RetryState {
    return { ...this.state };
  }

  /**
   * 重置
   */
  reset(): void {
    this.state = {
      attempt: 0,
      totalDelay: 0
    };
  }
}

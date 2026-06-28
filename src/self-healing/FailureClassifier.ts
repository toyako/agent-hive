/**
 * FailureClassifier — Self-Healing Runtime Phase 2
 * 
 * 职责：根据 Runtime Observation 自动识别失败原因
 * 
 * FailureType:
 * - NETWORK
 * - API
 * - MODEL
 * - TOOL
 * - DEPENDENCY
 * - PLANNER
 * - VALIDATION
 * - TIMEOUT
 * - RESOURCE
 * - UNKNOWN
 */

// Failure Type
export type FailureType = 
  | "NETWORK"
  | "API"
  | "MODEL"
  | "TOOL"
  | "DEPENDENCY"
  | "PLANNER"
  | "VALIDATION"
  | "TIMEOUT"
  | "RESOURCE"
  | "UNKNOWN";

// Failure Analysis
export interface FailureAnalysis {
  type: FailureType;
  confidence: number; // 0-1
  reason: string;
  metadata?: Record<string, any>;
}

export class FailureClassifier {
  /**
   * 分析失败原因
   */
  classify(error: any, context?: any): FailureAnalysis {
    const errorMessage = String(error).toLowerCase();
    const errorStack = error?.stack?.toLowerCase() || "";

    // NETWORK
    if (this.isNetworkError(errorMessage, errorStack)) {
      return {
        type: "NETWORK",
        confidence: 0.9,
        reason: `Network error: ${error.message}`,
        metadata: { originalError: error.message }
      };
    }

    // TIMEOUT
    if (this.isTimeoutError(errorMessage, errorStack)) {
      return {
        type: "TIMEOUT",
        confidence: 0.95,
        reason: `Timeout: ${error.message}`,
        metadata: { originalError: error.message }
      };
    }

    // API
    if (this.isApiError(errorMessage, errorStack)) {
      return {
        type: "API",
        confidence: 0.85,
        reason: `API error: ${error.message}`,
        metadata: { originalError: error.message }
      };
    }

    // MODEL
    if (this.isModelError(errorMessage, errorStack)) {
      return {
        type: "MODEL",
        confidence: 0.8,
        reason: `Model error: ${error.message}`,
        metadata: { originalError: error.message }
      };
    }

    // TOOL
    if (this.isToolError(errorMessage, errorStack)) {
      return {
        type: "TOOL",
        confidence: 0.8,
        reason: `Tool error: ${error.message}`,
        metadata: { originalError: error.message }
      };
    }

    // VALIDATION
    if (this.isValidationError(errorMessage, errorStack)) {
      return {
        type: "VALIDATION",
        confidence: 0.85,
        reason: `Validation error: ${error.message}`,
        metadata: { originalError: error.message }
      };
    }

    // PLANNER
    if (this.isPlannerError(errorMessage, errorStack)) {
      return {
        type: "PLANNER",
        confidence: 0.8,
        reason: `Planner error: ${error.message}`,
        metadata: { originalError: error.message }
      };
    }

    // DEPENDENCY
    if (this.isDependencyError(errorMessage, errorStack)) {
      return {
        type: "DEPENDENCY",
        confidence: 0.7,
        reason: `Dependency error: ${error.message}`,
        metadata: { originalError: error.message }
      };
    }

    // RESOURCE
    if (this.isResourceError(errorMessage, errorStack)) {
      return {
        type: "RESOURCE",
        confidence: 0.75,
        reason: `Resource error: ${error.message}`,
        metadata: { originalError: error.message }
      };
    }

    // UNKNOWN
    return {
      type: "UNKNOWN",
      confidence: 0.5,
      reason: `Unknown error: ${error.message}`,
      metadata: { originalError: error.message }
    };
  }

  private isNetworkError(message: string, stack: string): boolean {
    return message.includes("network") || 
           message.includes("connection") ||
           message.includes("econnrefused") ||
           message.includes("econnreset") ||
           message.includes("enotfound") ||
           message.includes("fetch failed");
  }

  private isTimeoutError(message: string, stack: string): boolean {
    return message.includes("timeout") ||
           message.includes("timed out") ||
           message.includes("etimedout");
  }

  private isApiError(message: string, stack: string): boolean {
    return message.includes("api") ||
           message.includes("http") ||
           message.includes("401") ||
           message.includes("403") ||
           message.includes("404") ||
           message.includes("429") ||
           message.includes("500");
  }

  private isModelError(message: string, stack: string): boolean {
    return message.includes("model") ||
           message.includes("openai") ||
           message.includes("anthropic") ||
           message.includes("llm") ||
           message.includes("token limit");
  }

  private isToolError(message: string, stack: string): boolean {
    return message.includes("tool") ||
           message.includes("function") ||
           message.includes("plugin");
  }

  private isValidationError(message: string, stack: string): boolean {
    return message.includes("validation") ||
           message.includes("invalid") ||
           message.includes("schema") ||
           message.includes("required");
  }

  private isPlannerError(message: string, stack: string): boolean {
    return message.includes("planner") ||
           message.includes("plan") ||
           message.includes("dag") ||
           message.includes("decompose");
  }

  private isDependencyError(message: string, stack: string): boolean {
    return message.includes("dependency") ||
           message.includes("upstream") ||
           message.includes("blocked");
  }

  private isResourceError(message: string, stack: string): boolean {
    return message.includes("resource") ||
           message.includes("memory") ||
           message.includes("disk") ||
           message.includes("quota");
  }
}

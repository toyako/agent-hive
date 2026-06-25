/**
 * KernelGate — PATCH 1: Hard Stop Enforcement
 * 
 * 所有 execution 必须经过 gate，否则禁止继续 pipeline
 * 
 * 核心规则：
 * - success=false → MUST STOP PIPELINE
 * - error → MUST STOP PIPELINE
 */

export class KernelPanicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KernelPanicError";
  }
}

export class KernelGate {
  /**
   * 验证执行结果，如果失败则抛出 KernelPanicError
   * 
   * @param input 执行结果
   * @returns true 如果验证通过
   * @throws KernelPanicError 如果验证失败
   */
  static validateExecution(input: {
    success: boolean;
    error?: any;
    taskId: string;
  }): boolean {
    
    // 🚨 HARD RULE 1: failure stops everything
    if (input.success === false) {
      throw new KernelPanicError(
        `EXECUTION_BLOCKED: success=false, taskId=${input.taskId}, error=${input.error || "unknown"}`
      );
    }

    // 🚨 HARD RULE 2: error stops everything
    if (input.error) {
      throw new KernelPanicError(
        `EXECUTION_BLOCKED: error detected, taskId=${input.taskId}, error=${input.error}`
      );
    }

    return true;
  }

  /**
   * 安全执行验证，不抛出异常
   * 
   * @param input 执行结果
   * @returns { allowed: boolean, reason?: string }
   */
  static checkExecution(input: {
    success: boolean;
    error?: any;
    taskId: string;
  }): { allowed: boolean; reason?: string } {
    
    if (input.success === false) {
      return {
        allowed: false,
        reason: `EXECUTION_BLOCKED: success=false, taskId=${input.taskId}`
      };
    }

    if (input.error) {
      return {
        allowed: false,
        reason: `EXECUTION_BLOCKED: error detected, taskId=${input.taskId}`
      };
    }

    return { allowed: true };
  }
}

/**
 * FailureInterceptor — PATCH 3: Failure Propagation Interceptor
 * 
 * 所有 failure 必须被 kernel 统一处理，不能"自然流过"
 * 
 * 核心功能：
 * - 标准化结果
 * - 强制执行 kernel 规则
 * - 阻断 silent failure
 */

import { KernelGate, KernelPanicError } from "./KernelGate";
import { ExecutionContext, ExecutionState } from "./ExecutionState";

export interface NormalizedResult {
  success: boolean;
  data?: any;
  error?: any;
  taskId: string;
  timestamp: number;
}

export class FailureInterceptor {

  /**
   * 处理执行结果，强制执行 kernel 规则
   * 
   * @param result 原始执行结果
   * @param context 执行上下文（可选）
   * @returns 标准化结果
   * @throws KernelPanicError 如果验证失败
   */
  static handle(result: any, context?: ExecutionContext): NormalizedResult {
    
    // 🚨 标准化结果
    const normalized: NormalizedResult = {
      success: result?.success ?? true,
      data: result?.data || result?.output,
      error: result?.error,
      taskId: result?.taskId || result?.task_id || "unknown",
      timestamp: Date.now()
    };

    // 🚨 检测 silent failure
    if (normalized.success === true && !normalized.data && !normalized.error) {
      // 这可能是 silent failure
      console.warn(`[KernelGate] Potential silent failure detected for task ${normalized.taskId}`);
    }

    // 🚨 强制执行 kernel 规则
    try {
      KernelGate.validateExecution({
        success: normalized.success,
        error: normalized.error,
        taskId: normalized.taskId
      });
    } catch (error) {
      // 如果有 context，标记为 BLOCKED
      if (context) {
        context.markBlocked(error instanceof Error ? error.message : "Kernel validation failed");
      }
      throw error;
    }

    // 🚨 如果有 context，更新状态
    if (context) {
      if (normalized.success) {
        context.transition(ExecutionState.COMPLETED, "Execution completed successfully");
      } else {
        context.markFailed(`Execution failed: ${normalized.error || "unknown error"}`);
      }
    }

    return normalized;
  }

  /**
   * 安全处理执行结果，不抛出异常
   * 
   * @param result 原始执行结果
   * @param context 执行上下文（可选）
   * @returns { success: boolean, result?: NormalizedResult, error?: string }
   */
  static safeHandle(result: any, context?: ExecutionContext): { 
    success: boolean; 
    result?: NormalizedResult; 
    error?: string 
  } {
    
    try {
      const normalized = this.handle(result, context);
      return { success: true, result: normalized };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (context) {
        context.markBlocked(errorMessage);
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 包装 executor 执行，添加 kernel enforcement
   * 
   * @param executor 执行函数
   * @param task 任务
   * @param context 执行上下文（可选）
   * @returns 标准化结果
   */
  static async wrapExecution(
    executor: (task: any) => Promise<any>,
    task: any,
    context?: ExecutionContext
  ): Promise<NormalizedResult> {
    
    if (context) {
      context.transition(ExecutionState.EXECUTING, "Starting execution");
    }

    try {
      const result = await executor(task);
      return this.handle(result, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Execution failed";
      
      if (context) {
        context.markFailed(errorMessage);
      }
      
      // 重新抛出，让调用者处理
      throw error;
    }
  }
}

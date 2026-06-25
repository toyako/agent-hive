/**
 * Kernel Module — v1.4-lite Kernel Patch
 * 
 * 最小可用 enforcement layer
 * 
 * 核心组件：
 * - KernelGate: 硬停止执行器
 * - ExecutionState: 执行状态机
 * - FailureInterceptor: 失败传播拦截器
 */

export { KernelGate, KernelPanicError } from "./KernelGate";
export { ExecutionState, ExecutionContext } from "./ExecutionState";
export { FailureInterceptor, NormalizedResult } from "./FailureInterceptor";

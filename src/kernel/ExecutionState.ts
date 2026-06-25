/**
 * ExecutionState — PATCH 2: Execution State Machine (轻量版)
 * 
 * 让 execution 不再是 "flow"，而是 "state machine"
 * 
 * 核心功能：
 * - 显式状态跟踪
 * - 结构化失败处理
 * - 可追溯调试
 */

export enum ExecutionState {
  INIT = "INIT",
  PLANNED = "PLANNED",
  EXECUTING = "EXECUTING",
  REVIEWING = "REVIEWING",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
  BLOCKED = "BLOCKED"
}

export class ExecutionContext {
  state: ExecutionState = ExecutionState.INIT;
  private stateHistory: Array<{ state: ExecutionState; timestamp: number; reason?: string }> = [];

  constructor(private taskId: string) {
    this.recordState(ExecutionState.INIT, "Execution context created");
  }

  /**
   * 转换到下一个状态
   * 
   * @param next 下一个状态
   * @param reason 转换原因
   * @throws Error 如果状态转换无效
   */
  transition(next: ExecutionState, reason?: string): void {
    // 🚨 BLOCKED 状态是终态，不能转换
    if (this.state === ExecutionState.BLOCKED) {
      throw new Error(`Execution is blocked, cannot transition to ${next}`);
    }

    // 🚨 FAILED 状态是终态，不能转换
    if (this.state === ExecutionState.FAILED) {
      throw new Error(`Execution has failed, cannot transition to ${next}`);
    }

    // 🚨 COMPLETED 状态是终态，不能转换
    if (this.state === ExecutionState.COMPLETED) {
      throw new Error(`Execution has completed, cannot transition to ${next}`);
    }

    // 验证状态转换的合法性
    if (!this.isValidTransition(this.state, next)) {
      throw new Error(`Invalid state transition: ${this.state} → ${next}`);
    }

    this.state = next;
    this.recordState(next, reason);
  }

  /**
   * 标记执行失败
   * 
   * @param reason 失败原因
   */
  markFailed(reason: string): void {
    this.state = ExecutionState.FAILED;
    this.recordState(ExecutionState.FAILED, reason);
  }

  /**
   * 标记执行被阻断
   * 
   * @param reason 阻断原因
   */
  markBlocked(reason: string): void {
    this.state = ExecutionState.BLOCKED;
    this.recordState(ExecutionState.BLOCKED, reason);
  }

  /**
   * 检查是否可以继续执行
   */
  canContinue(): boolean {
    return this.state !== ExecutionState.FAILED && 
           this.state !== ExecutionState.BLOCKED &&
           this.state !== ExecutionState.COMPLETED;
  }

  /**
   * 获取状态历史
   */
  getHistory(): Array<{ state: ExecutionState; timestamp: number; reason?: string }> {
    return [...this.stateHistory];
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): ExecutionState {
    return this.state;
  }

  /**
   * 获取任务ID
   */
  getTaskId(): string {
    return this.taskId;
  }

  private recordState(state: ExecutionState, reason?: string): void {
    this.stateHistory.push({
      state,
      timestamp: Date.now(),
      reason
    });
  }

  private isValidTransition(from: ExecutionState, to: ExecutionState): boolean {
    const validTransitions: Record<ExecutionState, ExecutionState[]> = {
      [ExecutionState.INIT]: [ExecutionState.PLANNED, ExecutionState.EXECUTING, ExecutionState.FAILED, ExecutionState.BLOCKED],
      [ExecutionState.PLANNED]: [ExecutionState.EXECUTING, ExecutionState.FAILED, ExecutionState.BLOCKED],
      [ExecutionState.EXECUTING]: [ExecutionState.REVIEWING, ExecutionState.COMPLETED, ExecutionState.FAILED, ExecutionState.BLOCKED],
      [ExecutionState.REVIEWING]: [ExecutionState.COMPLETED, ExecutionState.FAILED, ExecutionState.BLOCKED],
      [ExecutionState.FAILED]: [], // 终态
      [ExecutionState.COMPLETED]: [], // 终态
      [ExecutionState.BLOCKED]: [] // 终态
    };

    return validTransitions[from]?.includes(to) ?? false;
  }
}

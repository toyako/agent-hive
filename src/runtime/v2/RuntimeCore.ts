/**
 * Runtime Core — Phase 1 (修复版)
 * 
 * 运行时核心引擎
 * 
 * 核心原则：
 * 1. Executor（生成器）没有权力决定任务是否完成
 * 2. 必须流经 REVIEWING → VERIFYING
 * 3. VERIFYING 状态必须等待 Evaluator Pipeline 返回 Verdict.PASS
 * 4. 悲观验证：默认 Reject，直到完全证明通过
 */

import { RuntimeStateMachine, RuntimeState, RuntimeContext } from "./state-machine/RuntimeStateMachine";
import { TaskContract, createDefaultTaskContract, TaskPriority } from "./intent/TaskContract";
import { EventBus, RuntimeEventType, RuntimeEvent, globalEventBus } from "./observation/EventBus";

// 验证结果
export enum Verdict {
  PASS = "PASS",
  REJECT = "REJECT",
  PENDING = "PENDING"
}

// 验证结果详情
export interface VerificationResult {
  verdict: Verdict;
  score: number;
  checks: Array<{ name: string; passed: boolean; message?: string }>;
  timestamp: number;
}

// Evaluator Pipeline 接口
export interface EvaluatorPipeline {
  evaluate(taskId: string, result: any): Promise<VerificationResult>;
}

export interface RuntimeConfig {
  maxConcurrentTasks: number;
  defaultTimeout: number;
  defaultRetries: number;
  enableObservation: boolean;
  enablePersistence: boolean;
  persistencePath: string;
  requireVerification: boolean; // 是否强制要求验证
}

export class RuntimeCore {
  private stateMachine: RuntimeStateMachine;
  private eventBus: EventBus;
  private config: RuntimeConfig;
  private evaluatorPipeline: EvaluatorPipeline | null = null;

  constructor(config: Partial<RuntimeConfig> = {}) {
    this.config = {
      maxConcurrentTasks: 5,
      defaultTimeout: 300000,
      defaultRetries: 3,
      enableObservation: true,
      enablePersistence: true,
      persistencePath: ".agent-hive/runtime",
      requireVerification: true, // 默认强制要求验证
      ...config
    };

    this.stateMachine = new RuntimeStateMachine();
    this.eventBus = globalEventBus;

    this.registerEventHandlers();
  }

  /**
   * 设置 Evaluator Pipeline
   */
  setEvaluatorPipeline(pipeline: EvaluatorPipeline): void {
    this.evaluatorPipeline = pipeline;
  }

  private registerEventHandlers(): void {
    this.eventBus.on(RuntimeEventType.LOOP_DISCOVER, async (event) => {
      console.log(`[Runtime] Task discovered: ${event.taskId}`);
    });

    this.eventBus.on(RuntimeEventType.LOOP_COMPLETE, async (event) => {
      console.log(`[Runtime] Task completed: ${event.taskId}`);
    });

    this.eventBus.on(RuntimeEventType.LOOP_REJECT, async (event) => {
      console.log(`[Runtime] Task rejected: ${event.taskId}: ${event.error}`);
    });
  }

  /**
   * 发现任务
   */
  async discoverTask(goal: string, options: Partial<TaskContract> = {}): Promise<TaskContract> {
    const contract = createDefaultTaskContract(goal, options);
    
    this.stateMachine.createContext(contract.id, goal, {
      contract,
      discoveredAt: Date.now()
    });

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_DISCOVER,
      taskId: contract.id,
      timestamp: Date.now(),
      data: { goal }
    });

    return contract;
  }

  /**
   * 将任务加入队列
   */
  async enqueueTask(taskId: string): Promise<boolean> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return false;

    const newState = this.stateMachine.transition(taskId, "QUEUE", "Task enqueued");
    if (!newState) return false;

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_QUEUE,
      taskId,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * 开始执行任务
   */
  async executeTask(taskId: string): Promise<boolean> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return false;

    if (!this.stateMachine.canTransition(taskId, "PLAN")) return false;

    this.stateMachine.transition(taskId, "PLAN", "Task planned");

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_PLAN,
      taskId,
      timestamp: Date.now()
    });

    this.stateMachine.transition(taskId, "EXECUTE", "Task execution started");

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_EXECUTE,
      taskId,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * 完成任务执行（进入审查阶段）
   * 
   * 注意：这只是 Executor 完成执行，不是任务完成
   * 任务必须经过 REVIEWING → VERIFYING → COMPLETED
   */
  async finishExecution(taskId: string, result: any): Promise<boolean> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return false;

    // 检查当前状态必须是 RUNNING
    const currentState = this.stateMachine.getState(taskId);
    if (currentState !== RuntimeState.RUNNING) {
      throw new Error(`Cannot finish execution: task ${taskId} is in state ${currentState}, expected RUNNING`);
    }

    // 保存执行结果
    context.metadata.result = result;
    context.metadata.executionFinishedAt = Date.now();

    // 转换到 REVIEWING（必须）
    this.stateMachine.transition(taskId, "REVIEW", "Execution finished, entering review");

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_REVIEW,
      taskId,
      timestamp: Date.now(),
      data: { result }
    });

    return true;
  }

  /**
   * 完成审查（进入验证阶段）
   * 
   * 注意：这只是收集产出，不是验证
   */
  async finishReview(taskId: string): Promise<boolean> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return false;

    // 检查当前状态必须是 REVIEWING
    const currentState = this.stateMachine.getState(taskId);
    if (currentState !== RuntimeState.REVIEWING) {
      throw new Error(`Cannot finish review: task ${taskId} is in state ${currentState}, expected REVIEWING`);
    }

    context.metadata.reviewFinishedAt = Date.now();

    // 转换到 VERIFYING（必须）
    this.stateMachine.transition(taskId, "VERIFY", "Review finished, entering verification");

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_VERIFY,
      taskId,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * 提交验证结果
   * 
   * 这是唯一可以将任务从 VERIFYING 转换到 COMPLETED 的方法
   * 必须提供 Verdict.PASS 才能通过
   */
  async submitVerification(taskId: string, result: VerificationResult): Promise<boolean> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return false;

    // 检查当前状态必须是 VERIFYING
    const currentState = this.stateMachine.getState(taskId);
    if (currentState !== RuntimeState.VERIFYING) {
      throw new Error(`Cannot submit verification: task ${taskId} is in state ${currentState}, expected VERIFYING`);
    }

    // 保存验证结果
    context.metadata.verificationResult = result;
    context.metadata.verificationSubmittedAt = Date.now();

    // 检查验证结果
    if (result.verdict === Verdict.PASS) {
      // 验证通过，转换到 WAITING_CHECKPOINT
      this.stateMachine.transition(taskId, "WAIT_CHECKPOINT", "Verification passed, waiting for checkpoint");

      await this.eventBus.emit({
        type: RuntimeEventType.LOOP_PASS,
        taskId,
        timestamp: Date.now(),
        data: { verificationResult: result }
      });

      // 检查是否需要人工检查点
      const contract = context.metadata.contract;
      const requiresCheckpoint = contract?.checkpointPolicy?.requireApproval?.length > 0;

      if (requiresCheckpoint) {
        // 需要人工检查点，保持 WAITING_CHECKPOINT 状态
        await this.eventBus.emit({
          type: RuntimeEventType.LOOP_CHECKPOINT,
          taskId,
          timestamp: Date.now(),
          data: { requiresApproval: true }
        });
      } else {
        // 不需要人工检查点，直接转换到 COMPLETED
        this.stateMachine.transition(taskId, "CHECKPOINT_PASS", "No checkpoint required, task completed");

        await this.eventBus.emit({
          type: RuntimeEventType.LOOP_COMPLETE,
          taskId,
          timestamp: Date.now(),
          data: { result: context.metadata.result, verificationResult: result }
        });
      }
    } else {
      // 验证失败，转换到 FAILED
      this.stateMachine.transition(taskId, "FAIL", `Verification rejected: ${result.verdict}`);

      await this.eventBus.emit({
        type: RuntimeEventType.LOOP_REJECT,
        taskId,
        timestamp: Date.now(),
        error: `Verification rejected: ${result.verdict}`,
        data: { verificationResult: result }
      });
    }

    return true;
  }

  /**
   * 自动验证（使用 Evaluator Pipeline）
   * 
   * 悲观验证：默认 Reject，直到完全证明通过
   */
  async autoVerify(taskId: string): Promise<VerificationResult> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) {
      return {
        verdict: Verdict.REJECT,
        score: 0,
        checks: [{ name: "context-check", passed: false, message: "Task context not found" }],
        timestamp: Date.now()
      };
    }

    // 检查当前状态必须是 VERIFYING
    const currentState = this.stateMachine.getState(taskId);
    if (currentState !== RuntimeState.VERIFYING) {
      return {
        verdict: Verdict.REJECT,
        score: 0,
        checks: [{ name: "state-check", passed: false, message: `Task is in state ${currentState}, expected VERIFYING` }],
        timestamp: Date.now()
      };
    }

    // 如果没有 Evaluator Pipeline，使用悲观默认
    if (!this.evaluatorPipeline) {
      const result: VerificationResult = {
        verdict: Verdict.REJECT,
        score: 0,
        checks: [{ name: "evaluator-check", passed: false, message: "No evaluator pipeline configured" }],
        timestamp: Date.now()
      };
      await this.submitVerification(taskId, result);
      return result;
    }

    // 使用 Evaluator Pipeline 验证
    const result = await this.evaluatorPipeline.evaluate(taskId, context.metadata.result);
    await this.submitVerification(taskId, result);
    return result;
  }

  /**
   * 任务失败
   */
  async failTask(taskId: string, error: string): Promise<boolean> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return false;

    this.stateMachine.transition(taskId, "FAIL", error);

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_REJECT,
      taskId,
      timestamp: Date.now(),
      error
    });

    return true;
  }

  /**
   * 重试任务
   */
  async retryTask(taskId: string): Promise<boolean> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return false;

    this.stateMachine.transition(taskId, "RETRY", "Task retry");

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_RETRY,
      taskId,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: string, reason: string): Promise<boolean> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return false;

    this.stateMachine.transition(taskId, "CANCEL", reason);

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_ABORT,
      taskId,
      timestamp: Date.now(),
      data: { reason }
    });

    return true;
  }

  /**
   * 获取任务状态
   */
  getTaskState(taskId: string): RuntimeState | null {
    return this.stateMachine.getState(taskId);
  }

  /**
   * 获取任务上下文
   */
  getTaskContext(taskId: string): RuntimeContext | undefined {
    return this.stateMachine.getContext(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): RuntimeContext[] {
    return this.stateMachine.getAllContexts();
  }

  /**
   * 获取特定状态的任务
   */
  getTasksByState(state: RuntimeState): RuntimeContext[] {
    return this.stateMachine.getContextsByState(state);
  }

  /**
   * 获取事件历史
   */
  getEventHistory(taskId?: string, type?: RuntimeEventType): RuntimeEvent[] {
    return this.eventBus.getEventHistory(taskId, type);
  }

  /**
   * 获取状态机
   */
  getStateMachine(): RuntimeStateMachine {
    return this.stateMachine;
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 获取配置
   */
  getConfig(): RuntimeConfig {
    return { ...this.config };
  }
}

/**
 * Runtime Core — Phase 1
 * 
 * 运行时核心引擎
 * 
 * 整合所有组件:
 * - State Machine
 * - Task Contract
 * - Event Bus
 * - Queue
 * - Scheduler
 * - Policy Engine
 * - Capability Registry
 * - Persistence
 * - Evaluator Pipeline
 * - Human Checkpoint
 * - Budget Guard
 * - Recovery Engine
 * - Observation Layer
 */

import { RuntimeStateMachine, RuntimeState, RuntimeContext } from "./state-machine/RuntimeStateMachine";
import { TaskContract, createDefaultTaskContract, TaskPriority } from "./intent/TaskContract";
import { EventBus, RuntimeEventType, RuntimeEvent, globalEventBus } from "./observation/EventBus";

export interface RuntimeConfig {
  maxConcurrentTasks: number;
  defaultTimeout: number;
  defaultRetries: number;
  enableObservation: boolean;
  enablePersistence: boolean;
  persistencePath: string;
}

export class RuntimeCore {
  private stateMachine: RuntimeStateMachine;
  private eventBus: EventBus;
  private config: RuntimeConfig;
  
  // 组件引用（后续实现）
  private queue: any; // Queue
  private scheduler: any; // Scheduler
  private policyEngine: any; // Policy Engine
  private capabilityRegistry: any; // Capability Registry
  private persistence: any; // Persistence
  private evaluatorPipeline: any; // Evaluator Pipeline
  private checkpointManager: any; // Human Checkpoint
  private budgetGuard: any; // Budget Guard
  private recoveryEngine: any; // Recovery Engine

  constructor(config: Partial<RuntimeConfig> = {}) {
    this.config = {
      maxConcurrentTasks: 5,
      defaultTimeout: 300000,
      defaultRetries: 3,
      enableObservation: true,
      enablePersistence: true,
      persistencePath: ".agent-hive/runtime",
      ...config
    };

    this.stateMachine = new RuntimeStateMachine();
    this.eventBus = globalEventBus;

    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    // 注册默认事件处理器
    this.eventBus.on(RuntimeEventType.LOOP_DISCOVER, async (event) => {
      console.log(`[Runtime] Task discovered: ${event.taskId}`);
    });

    this.eventBus.on(RuntimeEventType.LOOP_COMPLETE, async (event) => {
      console.log(`[Runtime] Task completed: ${event.taskId}`);
    });

    this.eventBus.on(RuntimeEventType.LOOP_FAILED, async (event) => {
      console.log(`[Runtime] Task failed: ${event.taskId}: ${event.error}`);
    });
  }

  /**
   * 发现任务
   */
  async discoverTask(goal: string, options: Partial<TaskContract> = {}): Promise<TaskContract> {
    const contract = createDefaultTaskContract(goal, options);
    
    // 创建状态机上下文
    this.stateMachine.createContext(contract.id, goal, {
      contract,
      discoveredAt: Date.now()
    });

    // 触发发现事件
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

    // 检查是否可以转换
    if (!this.stateMachine.canTransition(taskId, "PLAN")) return false;

    // 转换到 PLANNED
    this.stateMachine.transition(taskId, "PLAN", "Task planned");

    // 触发计划事件
    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_PLAN,
      taskId,
      timestamp: Date.now()
    });

    // 转换到 RUNNING
    this.stateMachine.transition(taskId, "EXECUTE", "Task execution started");

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_EXECUTE,
      taskId,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * 任务完成
   */
  async completeTask(taskId: string, result: any): Promise<boolean> {
    const context = this.stateMachine.getContext(taskId);
    if (!context) return false;

    // 转换到 REVIEWING
    this.stateMachine.transition(taskId, "REVIEW", "Task review started");

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_REVIEW,
      taskId,
      timestamp: Date.now(),
      data: { result }
    });

    // 转换到 VERIFYING
    this.stateMachine.transition(taskId, "VERIFY", "Task verification started");

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_VERIFY,
      taskId,
      timestamp: Date.now()
    });

    // 转换到 COMPLETED
    this.stateMachine.transition(taskId, "CHECKPOINT_PASS", "Task completed");

    await this.eventBus.emit({
      type: RuntimeEventType.LOOP_COMPLETE,
      taskId,
      timestamp: Date.now(),
      data: { result }
    });

    return true;
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

/**
 * ProductionRuntime — Production Runtime Phase 3
 * 
 * 将所有组件整合为一个完整的生产级运行时
 */

import { CheckpointManager, Checkpoint } from "./checkpoint/CheckpointManager";
import { CompensationEngine, CompensableNode } from "./compensation/CompensationEngine";
import { EventStore, EventType } from "./events/EventStore";
import { Scheduler, ScheduleJob } from "./scheduler/Scheduler";
import { PluginRegistry, Plugin } from "./plugins/PluginRegistry";
import { RuntimeV2 } from "../runtime-v2";
import { SelfHealingRuntime } from "../self-healing/SelfHealingRuntime";

// Production Runtime Result
export interface ProductionRuntimeResult {
  success: boolean;
  executionId: string;
  checkpoint?: Checkpoint;
  events: any[];
  duration: number;
}

export class ProductionRuntime {
  private checkpointManager: CheckpointManager;
  private compensationEngine: CompensationEngine;
  private eventStore: EventStore;
  private scheduler: Scheduler;
  private pluginRegistry: PluginRegistry;
  private selfHealingRuntime: SelfHealingRuntime;

  constructor() {
    this.checkpointManager = new CheckpointManager();
    this.compensationEngine = new CompensationEngine();
    this.eventStore = new EventStore();
    this.scheduler = new Scheduler();
    this.pluginRegistry = new PluginRegistry();
    this.selfHealingRuntime = new SelfHealingRuntime();
  }

  /**
   * 执行任务（生产级）
   */
  async execute(task: string): Promise<ProductionRuntimeResult> {
    const executionId = `prod-${Date.now()}`;
    const startTime = Date.now();

    // 记录任务创建
    this.eventStore.append({
      type: "TASK_CREATED",
      executionId,
      data: { task }
    });

    // 记录任务开始
    this.eventStore.append({
      type: "TASK_STARTED",
      executionId
    });

    try {
      // 创建检查点
      const checkpoint = this.checkpointManager.save({
        executionId,
        state: {
          completedNodes: [],
          variables: {},
          context: { task },
          retryCount: 0
        },
        metadata: { startTime }
      });

      this.eventStore.append({
        type: "CHECKPOINT_CREATED",
        executionId,
        data: { checkpointId: checkpoint.id }
      });

      // 使用 Self-Healing Runtime 执行
      const result = await this.selfHealingRuntime.execute(task);

      // 记录任务完成
      this.eventStore.append({
        type: result.success ? "TASK_COMPLETED" : "TASK_FAILED",
        executionId,
        data: { iterations: result.iterations }
      });

      return {
        success: result.success,
        executionId,
        checkpoint,
        events: this.eventStore.getEvents(executionId),
        duration: Date.now() - startTime
      };

    } catch (error) {
      // 记录任务失败
      this.eventStore.append({
        type: "TASK_FAILED",
        executionId,
        data: { error: String(error) }
      });

      return {
        success: false,
        executionId,
        events: this.eventStore.getEvents(executionId),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 恢复执行
   */
  async resume(executionId: string): Promise<any> {
    const checkpoint = this.checkpointManager.latest(executionId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for execution: ${executionId}`);
    }

    this.eventStore.append({
      type: "CHECKPOINT_RESTORED",
      executionId,
      data: { checkpointId: checkpoint.id }
    });

    // 从检查点恢复执行
    return this.execute(checkpoint.state.context.task);
  }

  /**
   * 获取检查点管理器
   */
  getCheckpointManager(): CheckpointManager {
    return this.checkpointManager;
  }

  /**
   * 获取事件存储
   */
  getEventStore(): EventStore {
    return this.eventStore;
  }

  /**
   * 获取调度器
   */
  getScheduler(): Scheduler {
    return this.scheduler;
  }

  /**
   * 获取插件注册表
   */
  getPluginRegistry(): PluginRegistry {
    return this.pluginRegistry;
  }
}

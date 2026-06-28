/**
 * Execution Bridge — v2.1
 * 
 * 将 v2.1 Plan → v2.0 Execution
 * 
 * 职责：
 * - ExecutionContract → v2.0 queue
 * - 保证 deterministic mapping
 */

import { ExecutionContract, DAG } from "../contract/ShadowContractLayer";
import { TaskContract, createDefaultTaskContract, TaskPriority } from "../../v2/intent/TaskContract";
import { RuntimeQueue } from "../../v2/queue/RuntimeQueue";

// Bridge 配置
export interface ExecutionBridgeConfig {
  maxTasksPerContract: number;
  preserveOrder: boolean;
  injectMetadata: boolean;
}

// 转换结果
export interface BridgeResult {
  contractId: string;
  tasks: TaskContract[];
  enqueuedCount: number;
  timestamp: number;
}

export class ExecutionBridge {
  private queue: RuntimeQueue;
  private config: ExecutionBridgeConfig;

  constructor(
    queue: RuntimeQueue,
    config: Partial<ExecutionBridgeConfig> = {}
  ) {
    this.queue = queue;
    this.config = {
      maxTasksPerContract: 10,
      preserveOrder: true,
      injectMetadata: true,
      ...config
    };
  }

  /**
   * 将 ExecutionContract 转换为 v2.0 Tasks
   * 
   * 强约束：
   * - order MUST follow DAG topology
   * - no runtime reordering allowed
   */
  contractToTasks(contract: ExecutionContract): TaskContract[] {
    const tasks: TaskContract[] = [];
    const { executionGraph, normalizedPlan, contractId } = contract;

    // 按 DAG 拓扑顺序创建 tasks
    for (const nodeId of executionGraph.nodes) {
      const step = normalizedPlan.steps.find(s => s.stepId === nodeId);
      if (!step) continue;

      // 找到依赖
      const dependencies = executionGraph.edges
        .filter(e => e.to === nodeId)
        .map(e => e.from);

      const task = createDefaultTaskContract(step.goal, {
        priority: TaskPriority.NORMAL,
        requiredSkills: step.requiredSkills,
        timeout: step.timeout,
        metadata: {
          contractId,
          stepId: step.stepId,
          dependencies,
          dagHash: executionGraph.hash,
          ...(this.config.injectMetadata ? contract.metadata : {})
        }
      });

      tasks.push(task);
    }

    return tasks.slice(0, this.config.maxTasksPerContract);
  }

  /**
   * 将 Contract 映射到 v2.0 Queue
   */
  contractToQueue(contract: ExecutionContract): BridgeResult {
    const tasks = this.contractToTasks(contract);
    let enqueuedCount = 0;

    for (const task of tasks) {
      const dependencies = task.metadata?.dependencies || [];
      
      const enqueued = this.queue.enqueue(task, {
        dependencies: dependencies.length > 0 ? dependencies : undefined
      });

      if (enqueued) {
        enqueuedCount++;
      }
    }

    return {
      contractId: contract.contractId,
      tasks,
      enqueuedCount,
      timestamp: Date.now()
    };
  }

  /**
   * 验证映射一致性
   */
  verifyMapping(contract: ExecutionContract, tasks: TaskContract[]): boolean {
    // 验证任务数量
    if (tasks.length !== contract.executionGraph.nodes.length) {
      return false;
    }

    // 验证顺序
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const expectedStepId = contract.executionGraph.nodes[i];
      
      if (task.metadata?.stepId !== expectedStepId) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { queue: number; processing: number; total: number } {
    return this.queue.getStatus();
  }
}

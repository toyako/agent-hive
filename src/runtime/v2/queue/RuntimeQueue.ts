/**
 * Queue — Phase 1
 * 
 * 运行时队列
 * 
 * 所有任务通过 Queue 进入 Runtime
 * 
 * 支持:
 * - Priority
 * - Delay
 * - Retry
 * - Cancellation
 * - Dependency
 * - Checkpoint Waiting
 */

import { TaskContract, TaskPriority } from "../intent/TaskContract";
import { RuntimeState } from "../state-machine/RuntimeStateMachine";

export interface QueueItem {
  task: TaskContract;
  state: RuntimeState;
  priority: TaskPriority;
  enqueuedAt: number;
  scheduledAt?: number;
  delay?: number;
  dependencies?: string[];
  checkpointWaiting?: boolean;
}

export class RuntimeQueue {
  private queue: QueueItem[] = [];
  private processing: Map<string, QueueItem> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * 将任务加入队列
   */
  enqueue(task: TaskContract, options: { delay?: number; dependencies?: string[] } = {}): boolean {
    if (this.queue.length >= this.maxSize) {
      return false;
    }

    const item: QueueItem = {
      task,
      state: RuntimeState.QUEUED,
      priority: task.priority,
      enqueuedAt: Date.now(),
      scheduledAt: options.delay ? Date.now() + options.delay : undefined,
      delay: options.delay,
      dependencies: options.dependencies,
      checkpointWaiting: false
    };

    // 按优先级插入
    const insertIndex = this.queue.findIndex(i => i.priority < item.priority);
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    return true;
  }

  /**
   * 从队列取出下一个任务
   */
  dequeue(): QueueItem | null {
    const now = Date.now();
    
    // 找到第一个可以执行的任务
    const index = this.queue.findIndex(item => {
      // 检查延迟
      if (item.scheduledAt && item.scheduledAt > now) return false;
      
      // 检查依赖
      if (item.dependencies && item.dependencies.length > 0) {
        // TODO: 检查依赖是否完成
        return false;
      }
      
      // 检查检查点等待
      if (item.checkpointWaiting) return false;
      
      return true;
    });

    if (index === -1) return null;

    const item = this.queue.splice(index, 1)[0];
    this.processing.set(item.task.id, item);
    
    return item;
  }

  /**
   * 完成任务处理
   */
  complete(taskId: string): boolean {
    return this.processing.delete(taskId);
  }

  /**
   * 取消任务
   */
  cancel(taskId: string): boolean {
    // 从队列中移除
    const queueIndex = this.queue.findIndex(item => item.task.id === taskId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      return true;
    }

    // 从处理中移除
    return this.processing.delete(taskId);
  }

  /**
   * 延迟任务
   */
  delay(taskId: string, delayMs: number): boolean {
    const item = this.processing.get(taskId);
    if (!item) return false;

    item.scheduledAt = Date.now() + delayMs;
    item.delay = delayMs;
    this.processing.delete(taskId);
    this.queue.push(item);
    
    return true;
  }

  /**
   * 设置检查点等待
   */
  setCheckpointWaiting(taskId: string, waiting: boolean): boolean {
    const item = this.processing.get(taskId) || 
                 this.queue.find(i => i.task.id === taskId);
    if (!item) return false;

    item.checkpointWaiting = waiting;
    return true;
  }

  /**
   * 获取队列状态
   */
  getStatus(): { queue: number; processing: number; total: number } {
    return {
      queue: this.queue.length,
      processing: this.processing.size,
      total: this.queue.length + this.processing.size
    };
  }

  /**
   * 获取队列中的任务
   */
  getQueuedTasks(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * 获取处理中的任务
   */
  getProcessingTasks(): QueueItem[] {
    return Array.from(this.processing.values());
  }

  /**
   * 检查任务是否在队列中
   */
  isQueued(taskId: string): boolean {
    return this.queue.some(item => item.task.id === taskId);
  }

  /**
   * 检查任务是否在处理中
   */
  isProcessing(taskId: string): boolean {
    return this.processing.has(taskId);
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
  }

  /**
   * 获取队列大小
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * 获取处理中任务数量
   */
  get processingSize(): number {
    return this.processing.size;
  }

  /**
   * 检查队列是否为空
   */
  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * 检查队列是否已满
   */
  get isFull(): boolean {
    return this.queue.length >= this.maxSize;
  }
}

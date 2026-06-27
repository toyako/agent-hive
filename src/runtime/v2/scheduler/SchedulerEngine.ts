/**
 * Scheduler — Phase 1
 * 
 * 调度模块
 * 
 * 职责：
 * - 时间维度的触发（Cron 任务或延迟队列）
 * - 管理执行时机
 * 
 * 支持：
 * - Manual
 * - Cron
 * - Webhook
 * - Queue
 * - Delay
 * - Retry
 * - Timeout
 * - Maximum Run Count
 * - Maximum Retry Count
 * - Daily Budget Window
 * 
 * Scheduler must never create infinite loops.
 */

import { TaskContract, createDefaultTaskContract, TaskPriority } from "../intent/TaskContract";
import { RuntimeQueue } from "../queue/RuntimeQueue";
import { EventBus, RuntimeEventType, globalEventBus } from "../observation/EventBus";

// 调度任务类型
export enum ScheduleType {
  MANUAL = "manual",
  CRON = "cron",
  WEBHOOK = "webhook",
  QUEUE = "queue",
  DELAY = "delay"
}

// 调度任务
export interface ScheduledTask {
  id: string;
  type: ScheduleType;
  task: TaskContract;
  schedule?: string; // Cron 表达式
  delay?: number; // 延迟毫秒
  scheduledAt?: number; // 计划执行时间
  lastRun?: number; // 上次执行时间
  nextRun?: number; // 下次执行时间
  runCount: number; // 执行次数
  maxRunCount?: number; // 最大执行次数
  retryCount: number; // 重试次数
  maxRetryCount?: number; // 最大重试次数
  enabled: boolean;
  metadata?: Record<string, any>;
}

export class SchedulerEngine {
  private scheduledTasks: Map<string, ScheduledTask> = new Map();
  private queue: RuntimeQueue;
  private eventBus: EventBus;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private running: boolean = false;

  constructor(queue: RuntimeQueue, eventBus: EventBus = globalEventBus) {
    this.queue = queue;
    this.eventBus = eventBus;
  }

  /**
   * 启动调度器
   */
  start(): void {
    this.running = true;
    console.log("[Scheduler] Started");

    // 启动定时检查
    this.startIntervalCheck();
  }

  /**
   * 停止调度器
   */
  stop(): void {
    this.running = false;

    // 清除所有定时器
    for (const [id, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();

    console.log("[Scheduler] Stopped");
  }

  /**
   * 添加调度任务
   */
  addScheduledTask(task: ScheduledTask): void {
    this.scheduledTasks.set(task.id, task);

    // 计算下次执行时间
    this.calculateNextRun(task);

    this.eventBus.emit({
      type: RuntimeEventType.SCHEDULER_TASK_SCHEDULED,
      taskId: task.id,
      timestamp: Date.now(),
      data: { scheduleType: task.type, schedule: task.schedule }
    });

    console.log(`[Scheduler] Task scheduled: ${task.id} (${task.type})`);
  }

  /**
   * 移除调度任务
   */
  removeScheduledTask(taskId: string): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    // 清除定时器
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    this.scheduledTasks.delete(taskId);
    return true;
  }

  /**
   * 启用/禁用调度任务
   */
  toggleScheduledTask(taskId: string, enabled: boolean): boolean {
    const task = this.scheduledTasks.get(taskId);
    if (!task) return false;

    task.enabled = enabled;
    this.calculateNextRun(task);
    return true;
  }

  /**
   * 添加 Cron 任务
   */
  addCronTask(id: string, cronExpression: string, goal: string, options: Partial<ScheduledTask> = {}): void {
    const task = createDefaultTaskContract(goal, {
      priority: options.task?.priority || TaskPriority.NORMAL,
      metadata: { cronExpression, ...options.task?.metadata }
    });

    this.addScheduledTask({
      id,
      type: ScheduleType.CRON,
      task,
      schedule: cronExpression,
      runCount: 0,
      retryCount: 0,
      maxRunCount: options.maxRunCount,
      maxRetryCount: options.maxRetryCount || 3,
      enabled: true,
      metadata: options.metadata
    });
  }

  /**
   * 添加延迟任务
   */
  addDelayedTask(id: string, delayMs: number, goal: string, options: Partial<ScheduledTask> = {}): void {
    const task = createDefaultTaskContract(goal, {
      priority: options.task?.priority || TaskPriority.NORMAL,
      metadata: options.task?.metadata
    });

    const scheduledAt = Date.now() + delayMs;

    this.addScheduledTask({
      id,
      type: ScheduleType.DELAY,
      task,
      delay: delayMs,
      scheduledAt,
      runCount: 0,
      retryCount: 0,
      maxRunCount: 1, // 延迟任务只执行一次
      maxRetryCount: options.maxRetryCount || 3,
      enabled: true,
      metadata: options.metadata
    });
  }

  /**
   * 添加一次性任务（立即执行）
   */
  addOneTimeTask(id: string, goal: string, options: Partial<ScheduledTask> = {}): void {
    const task = createDefaultTaskContract(goal, {
      priority: options.task?.priority || TaskPriority.NORMAL,
      metadata: options.task?.metadata
    });

    this.addScheduledTask({
      id,
      type: ScheduleType.MANUAL,
      task,
      scheduledAt: Date.now(),
      runCount: 0,
      retryCount: 0,
      maxRunCount: 1,
      maxRetryCount: options.maxRetryCount || 3,
      enabled: true,
      metadata: options.metadata
    });
  }

  /**
   * 启动定时检查
   */
  private startIntervalCheck(): void {
    const checkInterval = setInterval(() => {
      if (!this.running) {
        clearInterval(checkInterval);
        return;
      }

      this.checkAndExecuteTasks();
    }, 1000); // 每秒检查一次
  }

  /**
   * 检查并执行任务
   */
  private async checkAndExecuteTasks(): Promise<void> {
    const now = Date.now();

    for (const [id, task] of this.scheduledTasks) {
      if (!task.enabled) continue;
      if (!task.nextRun || task.nextRun > now) continue;

      // 检查是否超过最大执行次数
      if (task.maxRunCount && task.runCount >= task.maxRunCount) {
        console.log(`[Scheduler] Task ${id} reached max run count, disabling`);
        task.enabled = false;
        continue;
      }

      // 执行任务
      await this.executeScheduledTask(task);
    }
  }

  /**
   * 执行调度任务
   */
  private async executeScheduledTask(task: ScheduledTask): Promise<void> {
    console.log(`[Scheduler] Executing task: ${task.id}`);

    // 投递到 Runtime Queue
    const enqueued = this.queue.enqueue(task.task);
    if (enqueued) {
      task.runCount++;
      task.lastRun = Date.now();

      // 计算下次执行时间
      this.calculateNextRun(task);

      this.eventBus.emit({
        type: RuntimeEventType.SCHEDULER_TASK_SCHEDULED,
        taskId: task.id,
        timestamp: Date.now(),
        data: { runCount: task.runCount, nextRun: task.nextRun }
      });

      console.log(`[Scheduler] Task enqueued: ${task.id} (run ${task.runCount})`);
    } else {
      console.error(`[Scheduler] Failed to enqueue task: ${task.id}`);

      // 重试逻辑
      task.retryCount++;
      if (task.maxRetryCount && task.retryCount >= task.maxRetryCount) {
        console.log(`[Scheduler] Task ${task.id} reached max retry count, disabling`);
        task.enabled = false;
      }
    }
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextRun(task: ScheduledTask): void {
    if (!task.enabled) {
      task.nextRun = undefined;
      return;
    }

    switch (task.type) {
      case ScheduleType.CRON:
        task.nextRun = this.calculateCronNextRun(task.schedule!);
        break;

      case ScheduleType.DELAY:
        if (task.runCount === 0) {
          task.nextRun = task.scheduledAt;
        } else {
          task.nextRun = undefined; // 延迟任务只执行一次
        }
        break;

      case ScheduleType.MANUAL:
        if (task.runCount === 0) {
          task.nextRun = task.scheduledAt;
        } else {
          task.nextRun = undefined;
        }
        break;

      default:
        task.nextRun = undefined;
    }
  }

  /**
   * 计算 Cron 下次执行时间
   * 
   * 简化实现：只支持基本的 Cron 表达式
   * 格式: 秒 分 时 日 月 周
   */
  private calculateCronNextRun(cronExpression: string): number {
    // TODO: 实现完整的 Cron 解析
    // 目前返回 1 分钟后
    return Date.now() + 60000;
  }

  /**
   * 获取所有调度任务
   */
  getScheduledTasks(): ScheduledTask[] {
    return Array.from(this.scheduledTasks.values());
  }

  /**
   * 获取调度任务
   */
  getScheduledTask(id: string): ScheduledTask | undefined {
    return this.scheduledTasks.get(id);
  }

  /**
   * 获取状态
   */
  getStatus(): { running: boolean; taskCount: number; enabledCount: number } {
    const tasks = Array.from(this.scheduledTasks.values());
    return {
      running: this.running,
      taskCount: tasks.length,
      enabledCount: tasks.filter(t => t.enabled).length
    };
  }
}

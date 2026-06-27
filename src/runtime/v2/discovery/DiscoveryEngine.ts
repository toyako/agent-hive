/**
 * Discovery — Phase 1
 * 
 * 发现模块
 * 
 * 职责：
 * - 监听外部事件（GitHub Webhook/CI/Slack 等）
 * - 将外部事件转换为统一的 Intent 协议
 * - 投递到 Runtime Queue
 * 
 * Discovery 只负责发现，不负责执行。
 * Discovery 永远不执行任务。
 * Discovery 只创建 Runtime Tasks。
 */

import { TaskContract, createDefaultTaskContract, TaskPriority } from "../intent/TaskContract";
import { RuntimeQueue } from "../queue/RuntimeQueue";
import { EventBus, RuntimeEventType, globalEventBus } from "../observation/EventBus";

// 发现源类型
export enum DiscoverySourceType {
  GITHUB = "github",
  GITLAB = "gitlab",
  CI = "ci",
  ISSUE_TRACKER = "issue_tracker",
  LINEAR = "linear",
  JIRA = "jira",
  SLACK = "slack",
  DISCORD = "discord",
  EMAIL = "email",
  FILESYSTEM = "filesystem",
  WEBHOOK = "webhook",
  REST_API = "rest_api",
  CRON = "cron",
  CUSTOM = "custom"
}

// 发现事件
export interface DiscoveryEvent {
  source: DiscoverySourceType;
  eventType: string;
  payload: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

// 发现源接口
export interface DiscoverySource {
  name: string;
  type: DiscoverySourceType;
  enabled: boolean;
  start(): Promise<void>;
  stop(): Promise<void>;
  onEvent(handler: (event: DiscoveryEvent) => void): void;
}

// Intent 协议
export interface Intent {
  goal: string;
  description?: string;
  priority?: TaskPriority;
  requiredSkills?: string[];
  constraints?: any[];
  metadata?: Record<string, any>;
}

export class DiscoveryEngine {
  private sources: Map<string, DiscoverySource> = new Map();
  private queue: RuntimeQueue;
  private eventBus: EventBus;
  private intentHandlers: Array<(intent: Intent) => Promise<TaskContract>> = [];

  constructor(queue: RuntimeQueue, eventBus: EventBus = globalEventBus) {
    this.queue = queue;
    this.eventBus = eventBus;
  }

  /**
   * 注册发现源
   */
  registerSource(source: DiscoverySource): void {
    this.sources.set(source.name, source);

    // 设置事件处理器
    source.onEvent(async (event) => {
      await this.handleDiscoveryEvent(event);
    });

    this.eventBus.emit({
      type: RuntimeEventType.DISCOVERY_SOURCE_ADDED,
      taskId: "system",
      timestamp: Date.now(),
      data: { sourceName: source.name, sourceType: source.type }
    });
  }

  /**
   * 移除发现源
   */
  async unregisterSource(name: string): Promise<boolean> {
    const source = this.sources.get(name);
    if (!source) return false;

    await source.stop();
    this.sources.delete(name);

    this.eventBus.emit({
      type: RuntimeEventType.DISCOVERY_SOURCE_REMOVED,
      taskId: "system",
      timestamp: Date.now(),
      data: { sourceName: name }
    });

    return true;
  }

  /**
   * 启动所有发现源
   */
  async startAll(): Promise<void> {
    for (const [name, source] of this.sources) {
      if (source.enabled) {
        try {
          await source.start();
          console.log(`[Discovery] Started source: ${name}`);
        } catch (error) {
          console.error(`[Discovery] Failed to start source ${name}:`, error);
        }
      }
    }
  }

  /**
   * 停止所有发现源
   */
  async stopAll(): Promise<void> {
    for (const [name, source] of this.sources) {
      try {
        await source.stop();
        console.log(`[Discovery] Stopped source: ${name}`);
      } catch (error) {
        console.error(`[Discovery] Failed to stop source ${name}:`, error);
      }
    }
  }

  /**
   * 处理发现事件
   */
  private async handleDiscoveryEvent(event: DiscoveryEvent): Promise<void> {
    console.log(`[Discovery] Event from ${event.source}: ${event.eventType}`);

    // 将事件转换为 Intent
    const intent = await this.convertEventToIntent(event);
    if (!intent) {
      console.log(`[Discovery] Event ignored: ${event.eventType}`);
      return;
    }

    // 将 Intent 转换为 Task Contract
    const task = await this.createTaskFromIntent(intent);

    // 投递到 Runtime Queue
    const enqueued = this.queue.enqueue(task);
    if (enqueued) {
      console.log(`[Discovery] Task enqueued: ${task.id} from ${event.source}`);

      this.eventBus.emit({
        type: RuntimeEventType.DISCOVERY_TASK_FOUND,
        taskId: task.id,
        timestamp: Date.now(),
        data: { source: event.source, eventType: event.eventType }
      });
    } else {
      console.error(`[Discovery] Failed to enqueue task: ${task.id}`);
    }
  }

  /**
   * 将事件转换为 Intent
   * 
   * 这是 Discovery 的核心职责：
   * 将外部事件转换为统一的 Intent 协议
   */
  private async convertEventToIntent(event: DiscoveryEvent): Promise<Intent | null> {
    // 根据事件源类型转换
    switch (event.source) {
      case DiscoverySourceType.GITHUB:
        return this.convertGitHubEvent(event);
      case DiscoverySourceType.GITLAB:
        return this.convertGitLabEvent(event);
      case DiscoverySourceType.CI:
        return this.convertCIEvent(event);
      case DiscoverySourceType.ISSUE_TRACKER:
        return this.convertIssueTrackerEvent(event);
      case DiscoverySourceType.SLACK:
        return this.convertSlackEvent(event);
      case DiscoverySourceType.DISCORD:
        return this.convertDiscordEvent(event);
      case DiscoverySourceType.EMAIL:
        return this.convertEmailEvent(event);
      case DiscoverySourceType.FILESYSTEM:
        return this.convertFilesystemEvent(event);
      case DiscoverySourceType.WEBHOOK:
        return this.convertWebhookEvent(event);
      case DiscoverySourceType.REST_API:
        return this.convertRESTAPIEvent(event);
      case DiscoverySourceType.CRON:
        return this.convertCronEvent(event);
      case DiscoverySourceType.CUSTOM:
        return this.convertCustomEvent(event);
      default:
        return null;
    }
  }

  /**
   * 转换 GitHub 事件为 Intent
   */
  private convertGitHubEvent(event: DiscoveryEvent): Intent | null {
    const payload = event.payload;

    switch (event.eventType) {
      case "issues.opened":
        return {
          goal: `Fix issue: ${payload.issue.title}`,
          description: payload.issue.body,
          priority: TaskPriority.NORMAL,
          requiredSkills: ["coding"],
          metadata: {
            githubIssue: payload.issue.number,
            githubRepo: payload.repository.full_name
          }
        };

      case "pull_request.opened":
        return {
          goal: `Review PR: ${payload.pull_request.title}`,
          description: payload.pull_request.body,
          priority: TaskPriority.HIGH,
          requiredSkills: ["review"],
          metadata: {
            githubPR: payload.pull_request.number,
            githubRepo: payload.repository.full_name
          }
        };

      case "push":
        return {
          goal: `Build and test commit: ${payload.after.substring(0, 7)}`,
          description: `Push to ${payload.ref}`,
          priority: TaskPriority.NORMAL,
          requiredSkills: ["build", "test"],
          metadata: {
            githubCommit: payload.after,
            githubRepo: payload.repository.full_name
          }
        };

      default:
        return null;
    }
  }

  /**
   * 转换 GitLab 事件为 Intent
   */
  private convertGitLabEvent(event: DiscoveryEvent): Intent | null {
    // TODO: 实现 GitLab 事件转换
    return null;
  }

  /**
   * 转换 CI 事件为 Intent
   */
  private convertCIEvent(event: DiscoveryEvent): Intent | null {
    // TODO: 实现 CI 事件转换
    return null;
  }

  /**
   * 转换 Issue Tracker 事件为 Intent
   */
  private convertIssueTrackerEvent(event: DiscoveryEvent): Intent | null {
    // TODO: 实现 Issue Tracker 事件转换
    return null;
  }

  /**
   * 转换 Slack 事件为 Intent
   */
  private convertSlackEvent(event: DiscoveryEvent): Intent | null {
    // TODO: 实现 Slack 事件转换
    return null;
  }

  /**
   * 转换 Discord 事件为 Intent
   */
  private convertDiscordEvent(event: DiscoveryEvent): Intent | null {
    // TODO: 实现 Discord 事件转换
    return null;
  }

  /**
   * 转换 Email 事件为 Intent
   */
  private convertEmailEvent(event: DiscoveryEvent): Intent | null {
    // TODO: 实现 Email 事件转换
    return null;
  }

  /**
   * 转换 Filesystem 事件为 Intent
   */
  private convertFilesystemEvent(event: DiscoveryEvent): Intent | null {
    // TODO: 实现 Filesystem 事件转换
    return null;
  }

  /**
   * 转换 Webhook 事件为 Intent
   */
  private convertWebhookEvent(event: DiscoveryEvent): Intent | null {
    // 通用 Webhook 转换
    return {
      goal: event.payload.goal || event.payload.task || "Process webhook event",
      description: event.payload.description,
      priority: event.payload.priority || TaskPriority.NORMAL,
      metadata: event.metadata
    };
  }

  /**
   * 转换 REST API 事件为 Intent
   */
  private convertRESTAPIEvent(event: DiscoveryEvent): Intent | null {
    // TODO: 实现 REST API 事件转换
    return null;
  }

  /**
   * 转换 Cron 事件为 Intent
   */
  private convertCronEvent(event: DiscoveryEvent): Intent | null {
    return {
      goal: event.payload.goal || "Execute scheduled task",
      description: event.payload.description,
      priority: event.payload.priority || TaskPriority.NORMAL,
      metadata: event.metadata
    };
  }

  /**
   * 转换自定义事件为 Intent
   */
  private convertCustomEvent(event: DiscoveryEvent): Intent | null {
    return {
      goal: event.payload.goal,
      description: event.payload.description,
      priority: event.payload.priority || TaskPriority.NORMAL,
      metadata: { ...event.metadata, customEvent: event.eventType }
    };
  }

  /**
   * 从 Intent 创建 Task Contract
   */
  private async createTaskFromIntent(intent: Intent): Promise<TaskContract> {
    return createDefaultTaskContract(intent.goal, {
      description: intent.description,
      priority: intent.priority,
      requiredSkills: intent.requiredSkills,
      constraints: intent.constraints,
      metadata: intent.metadata
    });
  }

  /**
   * 获取所有发现源
   */
  getSources(): DiscoverySource[] {
    return Array.from(this.sources.values());
  }

  /**
   * 获取发现源
   */
  getSource(name: string): DiscoverySource | undefined {
    return this.sources.get(name);
  }

  /**
   * 手动触发发现事件（用于测试）
   */
  async triggerEvent(event: DiscoveryEvent): Promise<void> {
    await this.handleDiscoveryEvent(event);
  }
}

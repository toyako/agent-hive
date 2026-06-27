/**
 * Persistence — Phase 1
 * 
 * 持久化层
 * 
 * 职责：
 * - 持久化 Runtime 状态
 * - 持久化 Queue 状态
 * - 持久化 Checkpoint
 * - 持久化 Budget
 * - 持久化 Metrics
 * - 持久化 Recovery 信息
 * 
 * State survives restart.
 */

import * as fs from "fs";
import * as path from "path";
import { RuntimeContext, RuntimeState } from "../state-machine/RuntimeStateMachine";
import { TaskContract } from "../intent/TaskContract";
import { QueueItem } from "../queue/RuntimeQueue";

// 持久化配置
export interface PersistenceConfig {
  basePath: string;
  autoSave: boolean;
  autoSaveInterval: number; // ms
  maxHistorySize: number;
}

// 持久化状态
export interface PersistedState {
  version: string;
  timestamp: number;
  contexts: Record<string, RuntimeContext>;
  queue: QueueItem[];
  metadata: Record<string, any>;
}

export class PersistenceEngine {
  private config: PersistenceConfig;
  private saveTimer: NodeJS.Timeout | null = null;
  private dirty: boolean = false;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = {
      basePath: ".agent-hive/runtime",
      autoSave: true,
      autoSaveInterval: 30000, // 30 seconds
      maxHistorySize: 1000,
      ...config
    };

    // 确保目录存在
    this.ensureDirectories();
  }

  /**
   * 确保目录存在
   */
  private ensureDirectories(): void {
    const dirs = [
      this.config.basePath,
      path.join(this.config.basePath, "state"),
      path.join(this.config.basePath, "queue"),
      path.join(this.config.basePath, "checkpoint"),
      path.join(this.config.basePath, "budget"),
      path.join(this.config.basePath, "metrics"),
      path.join(this.config.basePath, "recovery")
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * 启动自动保存
   */
  startAutoSave(): void {
    if (this.saveTimer) return;

    this.saveTimer = setInterval(() => {
      if (this.dirty) {
        console.log("[Persistence] Auto-save triggered");
        // 实际保存逻辑由调用方实现
        this.dirty = false;
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * 停止自动保存
   */
  stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * 标记为脏数据
   */
  markDirty(): void {
    this.dirty = true;
  }

  /**
   * 保存状态
   */
  async saveState(state: PersistedState): Promise<boolean> {
    try {
      const filePath = path.join(this.config.basePath, "state", "runtime-state.json");
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
      this.dirty = false;
      return true;
    } catch (error) {
      console.error("[Persistence] Failed to save state:", error);
      return false;
    }
  }

  /**
   * 加载状态
   */
  async loadState(): Promise<PersistedState | null> {
    try {
      const filePath = path.join(this.config.basePath, "state", "runtime-state.json");
      if (!fs.existsSync(filePath)) return null;

      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("[Persistence] Failed to load state:", error);
      return null;
    }
  }

  /**
   * 保存队列
   */
  async saveQueue(queue: QueueItem[]): Promise<boolean> {
    try {
      const filePath = path.join(this.config.basePath, "queue", "queue-state.json");
      fs.writeFileSync(filePath, JSON.stringify(queue, null, 2));
      return true;
    } catch (error) {
      console.error("[Persistence] Failed to save queue:", error);
      return false;
    }
  }

  /**
   * 加载队列
   */
  async loadQueue(): Promise<QueueItem[]> {
    try {
      const filePath = path.join(this.config.basePath, "queue", "queue-state.json");
      if (!fs.existsSync(filePath)) return [];

      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("[Persistence] Failed to load queue:", error);
      return [];
    }
  }

  /**
   * 保存检查点
   */
  async saveCheckpoint(taskId: string, checkpoint: any): Promise<boolean> {
    try {
      const filePath = path.join(this.config.basePath, "checkpoint", `${taskId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2));
      return true;
    } catch (error) {
      console.error("[Persistence] Failed to save checkpoint:", error);
      return false;
    }
  }

  /**
   * 加载检查点
   */
  async loadCheckpoint(taskId: string): Promise<any | null> {
    try {
      const filePath = path.join(this.config.basePath, "checkpoint", `${taskId}.json`);
      if (!fs.existsSync(filePath)) return null;

      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("[Persistence] Failed to load checkpoint:", error);
      return null;
    }
  }

  /**
   * 保存预算
   */
  async saveBudget(budget: any): Promise<boolean> {
    try {
      const filePath = path.join(this.config.basePath, "budget", "budget-state.json");
      fs.writeFileSync(filePath, JSON.stringify(budget, null, 2));
      return true;
    } catch (error) {
      console.error("[Persistence] Failed to save budget:", error);
      return false;
    }
  }

  /**
   * 加载预算
   */
  async loadBudget(): Promise<any | null> {
    try {
      const filePath = path.join(this.config.basePath, "budget", "budget-state.json");
      if (!fs.existsSync(filePath)) return null;

      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("[Persistence] Failed to load budget:", error);
      return null;
    }
  }

  /**
   * 保存指标
   */
  async saveMetrics(metrics: any): Promise<boolean> {
    try {
      const filePath = path.join(this.config.basePath, "metrics", "metrics-state.json");
      fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2));
      return true;
    } catch (error) {
      console.error("[Persistence] Failed to save metrics:", error);
      return false;
    }
  }

  /**
   * 加载指标
   */
  async loadMetrics(): Promise<any | null> {
    try {
      const filePath = path.join(this.config.basePath, "metrics", "metrics-state.json");
      if (!fs.existsSync(filePath)) return null;

      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("[Persistence] Failed to load metrics:", error);
      return null;
    }
  }

  /**
   * 保存恢复信息
   */
  async saveRecovery(taskId: string, recovery: any): Promise<boolean> {
    try {
      const filePath = path.join(this.config.basePath, "recovery", `${taskId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(recovery, null, 2));
      return true;
    } catch (error) {
      console.error("[Persistence] Failed to save recovery:", error);
      return false;
    }
  }

  /**
   * 加载恢复信息
   */
  async loadRecovery(taskId: string): Promise<any | null> {
    try {
      const filePath = path.join(this.config.basePath, "recovery", `${taskId}.json`);
      if (!fs.existsSync(filePath)) return null;

      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("[Persistence] Failed to load recovery:", error);
      return null;
    }
  }

  /**
   * 清理旧数据
   */
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    let cleaned = 0;
    const now = Date.now();

    const dirs = ["checkpoint", "recovery"];
    for (const dir of dirs) {
      const dirPath = path.join(this.config.basePath, dir);
      if (!fs.existsSync(dirPath)) continue;

      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (now - stat.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
    }

    console.log(`[Persistence] Cleaned up ${cleaned} old files`);
    return cleaned;
  }

  /**
   * 获取状态
   */
  getStatus(): { basePath: string; autoSave: boolean; dirty: boolean } {
    return {
      basePath: this.config.basePath,
      autoSave: this.config.autoSave,
      dirty: this.dirty
    };
  }
}

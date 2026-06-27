/**
 * Concurrency Manager — Phase 4
 * 
 * 多租户/多任务工作区并发隔离
 * 
 * 确保多个任务同时通过 Discovery 涌入 Runtime Queue 时：
 * - 沙箱的并发目录不会发生冲突
 * - 锁机制能正确保护共享状态
 * - 租户隔离
 */

import * as fs from "fs";
import * as path from "path";

// 锁类型
export enum LockType {
  SHARED = "shared",      // 共享锁（读锁）
  EXCLUSIVE = "exclusive"  // 排他锁（写锁）
}

// 锁信息
export interface LockInfo {
  id: string;
  resource: string;
  type: LockType;
  holder: string;  // 任务 ID 或租户 ID
  acquiredAt: number;
  expiresAt: number;
  metadata?: Record<string, any>;
}

// 租户信息
export interface TenantInfo {
  id: string;
  name: string;
  maxConcurrency: number;
  activeTasks: Set<string>;
  createdAt: number;
}

// 并发配置
export interface ConcurrencyConfig {
  maxGlobalConcurrency: number;
  lockTimeout: number;  // ms
  cleanupInterval: number;  // ms
}

export class ConcurrencyManager {
  private locks: Map<string, LockInfo> = new Map();
  private tenants: Map<string, TenantInfo> = new Map();
  private taskToTenant: Map<string, string> = new Map();
  private config: ConcurrencyConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ConcurrencyConfig> = {}) {
    this.config = {
      maxGlobalConcurrency: 10,
      lockTimeout: 300000, // 5分钟
      cleanupInterval: 60000, // 1分钟
      ...config
    };
  }

  /**
   * 启动并发管理器
   */
  start(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
    
    console.log("[Concurrency] Manager started");
  }

  /**
   * 停止并发管理器
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    console.log("[Concurrency] Manager stopped");
  }

  /**
   * 注册租户
   */
  registerTenant(tenant: Omit<TenantInfo, "activeTasks" | "createdAt">): void {
    this.tenants.set(tenant.id, {
      ...tenant,
      activeTasks: new Set(),
      createdAt: Date.now()
    });
    
    console.log(`[Concurrency] Tenant registered: ${tenant.name}`);
  }

  /**
   * 分配任务到租户
   */
  assignTask(taskId: string, tenantId: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      console.error(`[Concurrency] Tenant not found: ${tenantId}`);
      return false;
    }

    // 检查租户并发限制
    if (tenant.activeTasks.size >= tenant.maxConcurrency) {
      console.warn(`[Concurrency] Tenant ${tenant.name} reached max concurrency`);
      return false;
    }

    // 检查全局并发限制
    const totalActive = Array.from(this.tenants.values())
      .reduce((sum, t) => sum + t.activeTasks.size, 0);
    
    if (totalActive >= this.config.maxGlobalConcurrency) {
      console.warn(`[Concurrency] Global max concurrency reached`);
      return false;
    }

    tenant.activeTasks.add(taskId);
    this.taskToTenant.set(taskId, tenantId);
    
    return true;
  }

  /**
   * 释放任务
   */
  releaseTask(taskId: string): void {
    const tenantId = this.taskToTenant.get(taskId);
    if (tenantId) {
      const tenant = this.tenants.get(tenantId);
      if (tenant) {
        tenant.activeTasks.delete(taskId);
      }
      this.taskToTenant.delete(taskId);
    }

    // 释放任务持有的所有锁
    this.releaseLocksByHolder(taskId);
  }

  /**
   * 获取锁
   */
  acquireLock(resource: string, type: LockType, holder: string): LockInfo | null {
    const existingLock = this.locks.get(resource);

    // 检查现有锁
    if (existingLock) {
      // 如果是共享锁请求，且现有也是共享锁，可以共存
      if (type === LockType.SHARED && existingLock.type === LockType.SHARED) {
        // 共享锁可以共存
      } else {
        // 排他锁冲突
        console.warn(`[Concurrency] Lock conflict on ${resource}`);
        return null;
      }
    }

    const lock: LockInfo = {
      id: `lock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      resource,
      type,
      holder,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + this.config.lockTimeout
    };

    this.locks.set(resource, lock);
    return lock;
  }

  /**
   * 释放锁
   */
  releaseLock(resource: string, holder: string): boolean {
    const lock = this.locks.get(resource);
    if (!lock || lock.holder !== holder) {
      return false;
    }

    this.locks.delete(resource);
    return true;
  }

  /**
   * 释放任务持有的所有锁
   */
  private releaseLocksByHolder(holder: string): void {
    for (const [resource, lock] of this.locks) {
      if (lock.holder === holder) {
        this.locks.delete(resource);
      }
    }
  }

  /**
   * 检查是否可以执行
   */
  canExecute(taskId: string): { allowed: boolean; reason?: string } {
    const tenantId = this.taskToTenant.get(taskId);
    if (!tenantId) {
      return { allowed: false, reason: "Task not assigned to any tenant" };
    }

    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return { allowed: false, reason: "Tenant not found" };
    }

    if (tenant.activeTasks.size >= tenant.maxConcurrency) {
      return { allowed: false, reason: `Tenant ${tenant.name} reached max concurrency` };
    }

    return { allowed: true };
  }

  /**
   * 获取并发状态
   */
  getStatus(): {
    totalTenants: number;
    totalActiveTasks: number;
    totalLocks: number;
    tenants: Array<{ id: string; name: string; activeTasks: number; maxConcurrency: number }>;
  } {
    const tenants = Array.from(this.tenants.values()).map(t => ({
      id: t.id,
      name: t.name,
      activeTasks: t.activeTasks.size,
      maxConcurrency: t.maxConcurrency
    }));

    const totalActiveTasks = tenants.reduce((sum, t) => sum + t.activeTasks, 0);

    return {
      totalTenants: this.tenants.size,
      totalActiveTasks,
      totalLocks: this.locks.size,
      tenants
    };
  }

  /**
   * 清理过期锁
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [resource, lock] of this.locks) {
      if (now > lock.expiresAt) {
        this.locks.delete(resource);
        console.log(`[Concurrency] Expired lock removed: ${resource}`);
      }
    }
  }
}

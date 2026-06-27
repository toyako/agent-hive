/**
 * Workspace Isolation — Phase 2 补丁
 * 
 * 解决重试期间的工作区污染问题
 * 
 * 铁律：
 * 1. 执行前快照/分支隔离（Handoff Isolation）
 * 2. 重试时强制回滚（Rollback on Retry）
 * 
 * 确保每一次重试都是绝对幂等的。
 */

import * as fs from "fs";
import * as path from "path";
import { PersistenceEngine } from "../persistence/PersistenceEngine";

// 工作区快照
export interface WorkspaceSnapshot {
  id: string;
  taskId: string;
  createdAt: number;
  directory: string;
  files: string[];
  checksum: string;
}

// 工作区沙箱
export interface WorkspaceSandbox {
  id: string;
  taskId: string;
  sandboxDir: string;
  originalDir: string;
  createdAt: number;
  active: boolean;
}

export class WorkspaceIsolation {
  private persistence: PersistenceEngine;
  private snapshots: Map<string, WorkspaceSnapshot> = new Map();
  private sandboxes: Map<string, WorkspaceSandbox> = new Map();
  private sandboxBasePath: string;

  constructor(persistence: PersistenceEngine, sandboxBasePath: string = ".agent-hive/sandbox") {
    this.persistence = persistence;
    this.sandboxBasePath = sandboxBasePath;
    this.ensureDirectory(this.sandboxBasePath);
  }

  /**
   * 创建工作区快照
   * 
   * 在执行前调用，记录当前工作区状态
   */
  async createSnapshot(taskId: string, workspaceDir: string): Promise<WorkspaceSnapshot> {
    const snapshotId = `snapshot-${taskId}-${Date.now()}`;
    
    // 扫描工作区文件
    const files = this.scanDirectory(workspaceDir);
    
    // 计算校验和
    const checksum = this.calculateChecksum(workspaceDir, files);
    
    const snapshot: WorkspaceSnapshot = {
      id: snapshotId,
      taskId,
      createdAt: Date.now(),
      directory: workspaceDir,
      files,
      checksum
    };
    
    // 保存快照
    this.snapshots.set(taskId, snapshot);
    await this.persistence.saveCheckpoint(`snapshot-${taskId}`, snapshot);
    
    console.log(`[Isolation] Snapshot created: ${snapshotId} (${files.length} files)`);
    return snapshot;
  }

  /**
   * 创建工作区沙箱
   * 
   * 在执行前调用，创建隔离的执行环境
   */
  async createSandbox(taskId: string, workspaceDir: string): Promise<WorkspaceSandbox> {
    const sandboxId = `sandbox-${taskId}-${Date.now()}`;
    const sandboxDir = path.join(this.sandboxBasePath, sandboxId);
    
    // 创建沙箱目录
    this.ensureDirectory(sandboxDir);
    
    // 复制工作区到沙箱
    await this.copyDirectory(workspaceDir, sandboxDir);
    
    const sandbox: WorkspaceSandbox = {
      id: sandboxId,
      taskId,
      sandboxDir,
      originalDir: workspaceDir,
      createdAt: Date.now(),
      active: true
    };
    
    this.sandboxes.set(taskId, sandbox);
    
    console.log(`[Isolation] Sandbox created: ${sandboxId}`);
    return sandbox;
  }

  /**
   * 回滚到快照
   * 
   * 在重试前调用，恢复到干净状态
   */
  async rollbackToSnapshot(taskId: string): Promise<boolean> {
    const snapshot = this.snapshots.get(taskId);
    if (!snapshot) {
      console.error(`[Isolation] No snapshot found for task ${taskId}`);
      return false;
    }
    
    const sandbox = this.sandboxes.get(taskId);
    const targetDir = sandbox ? sandbox.sandboxDir : snapshot.directory;
    
    console.log(`[Isolation] Rolling back to snapshot: ${snapshot.id}`);
    
    // 清理当前工作区
    await this.cleanDirectory(targetDir);
    
    // 从快照恢复
    await this.copyDirectory(snapshot.directory, targetDir);
    
    console.log(`[Isolation] Rollback completed: ${targetDir}`);
    return true;
  }

  /**
   * 回滚到沙箱初始状态
   * 
   * 在重试前调用，恢复沙箱到干净状态
   */
  async rollbackSandbox(taskId: string): Promise<boolean> {
    const sandbox = this.sandboxes.get(taskId);
    if (!sandbox) {
      console.error(`[Isolation] No sandbox found for task ${taskId}`);
      return false;
    }
    
    console.log(`[Isolation] Rolling back sandbox: ${sandbox.id}`);
    
    // 清理沙箱
    await this.cleanDirectory(sandbox.sandboxDir);
    
    // 从原始工作区重新复制
    await this.copyDirectory(sandbox.originalDir, sandbox.sandboxDir);
    
    console.log(`[Isolation] Sandbox rollback completed: ${sandbox.sandboxDir}`);
    return true;
  }

  /**
   * 销毁沙箱
   * 
   * 在任务完成或失败后调用
   */
  async destroySandbox(taskId: string): Promise<boolean> {
    const sandbox = this.sandboxes.get(taskId);
    if (!sandbox) {
      return false;
    }
    
    console.log(`[Isolation] Destroying sandbox: ${sandbox.id}`);
    
    // 删除沙箱目录
    await this.removeDirectory(sandbox.sandboxDir);
    
    sandbox.active = false;
    this.sandboxes.delete(taskId);
    
    return true;
  }

  /**
   * 获取沙箱目录
   */
  getSandboxDir(taskId: string): string | null {
    const sandbox = this.sandboxes.get(taskId);
    return sandbox ? sandbox.sandboxDir : null;
  }

  /**
   * 获取快照
   */
  getSnapshot(taskId: string): WorkspaceSnapshot | undefined {
    return this.snapshots.get(taskId);
  }

  /**
   * 检查是否有沙箱
   */
  hasSandbox(taskId: string): boolean {
    return this.sandboxes.has(taskId);
  }

  /**
   * 扫描目录
   */
  private scanDirectory(dir: string): string[] {
    const files: string[] = [];
    
    if (!fs.existsSync(dir)) {
      return files;
    }
    
    const scan = (currentDir: string, relativePath: string = "") => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        // 跳过隐藏文件和 node_modules
        if (entry.name.startsWith(".") || entry.name === "node_modules") {
          continue;
        }
        
        if (entry.isDirectory()) {
          scan(fullPath, relPath);
        } else {
          files.push(relPath);
        }
      }
    };
    
    scan(dir);
    return files.sort();
  }

  /**
   * 计算校验和
   */
  private calculateChecksum(dir: string, files: string[]): string {
    const crypto = require("crypto");
    const hash = crypto.createHash("md5");
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        hash.update(content);
      }
    }
    
    return hash.digest("hex");
  }

  /**
   * 复制目录
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    this.ensureDirectory(dest);
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      // 跳过隐藏文件和 node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * 清理目录
   */
  private async cleanDirectory(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      return;
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  }

  /**
   * 删除目录
   */
  private async removeDirectory(dir: string): Promise<void> {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  /**
   * 确保目录存在
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 获取状态
   */
  getStatus(): { snapshots: number; sandboxes: number } {
    return {
      snapshots: this.snapshots.size,
      sandboxes: this.sandboxes.size
    };
  }
}

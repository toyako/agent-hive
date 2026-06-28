/**
 * Context Bus — 消息/上下文总线
 * 
 * 职责：
 * - node ↔ node communication
 * - shared execution context
 * - artifact passing
 */

export class ContextBus {
  private context: Map<string, any> = new Map();
  private artifacts: Map<string, any> = new Map();

  /**
   * 设置上下文
   */
  set(key: string, value: any): void {
    this.context.set(key, value);
  }

  /**
   * 获取上下文
   */
  get(key: string): any {
    return this.context.get(key);
  }

  /**
   * 获取所有上下文
   */
  getAll(): Map<string, any> {
    return new Map(this.context);
  }

  /**
   * 添加 artifact
   */
  addArtifact(name: string, artifact: any): void {
    this.artifacts.set(name, artifact);
  }

  /**
   * 获取 artifact
   */
  getArtifact(name: string): any {
    return this.artifacts.get(name);
  }

  /**
   * 获取所有 artifacts
   */
  getAllArtifacts(): Map<string, any> {
    return new Map(this.artifacts);
  }

  /**
   * 合并上下文（copy-on-write）
   */
  merge(other: Map<string, any>): void {
    for (const [key, value] of other) {
      this.context.set(key, value);
    }
  }

  /**
   * 清空
   */
  clear(): void {
    this.context.clear();
    this.artifacts.clear();
  }
}

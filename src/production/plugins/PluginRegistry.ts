/**
 * PluginRegistry — Production Runtime Phase 3
 * 
 * 支持：
 * - registerPolicy()
 * - registerFailureClassifier()
 * - registerEvaluator()
 * - registerRecovery()
 * - registerCheckpoint()
 * - registerScheduler()
 * - registerRuntimePlugin()
 * 
 * 插件无需修改 Runtime Core
 */

// Plugin Type
export type PluginType = 
  | "policy"
  | "failureClassifier"
  | "evaluator"
  | "recovery"
  | "checkpoint"
  | "scheduler"
  | "runtime";

// Plugin
export interface Plugin {
  name: string;
  type: PluginType;
  version: string;
  enabled: boolean;
  handler: any;
}

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();

  /**
   * 注册插件
   */
  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  /**
   * 获取插件
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * 按类型获取插件
   */
  getByType(type: PluginType): Plugin[] {
    return Array.from(this.plugins.values()).filter(p => p.type === type && p.enabled);
  }

  /**
   * 启用/禁用插件
   */
  toggle(name: string, enabled: boolean): boolean {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * 获取所有插件
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 删除插件
   */
  remove(name: string): boolean {
    return this.plugins.delete(name);
  }
}

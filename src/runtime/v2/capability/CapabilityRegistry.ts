/**
 * Capability Registry — Phase 1
 * 
 * 能力注册表
 * 
 * 按能力（Capability）进行抽象注册，不与特定供应商绑死。
 * 
 * 能力示例：
 * - supportsWorktree
 * - supportsBackgroundTask
 * - supportsGoal
 * - supportsLoop
 * - supportsVision
 * - supportsBrowser
 * - supportsMCP
 * - supportsFilesystem
 * - supportsPatch
 * - supportsReview
 * - supportsPlanning
 * 
 * Agents register capabilities.
 * Runtime schedules capabilities.
 */

// 能力类型
export enum CapabilityType {
  // 代码能力
  WORKTREE = "supportsWorktree",
  PATCH = "supportsPatch",
  FILESYSTEM = "supportsFilesystem",
  
  // 执行能力
  BACKGROUND_TASK = "supportsBackgroundTask",
  GOAL = "supportsGoal",
  LOOP = "supportsLoop",
  
  // 感知能力
  VISION = "supportsVision",
  BROWSER = "supportsBrowser",
  MCP = "supportsMCP",
  
  // 协作能力
  REVIEW = "supportsReview",
  PLANNING = "supportsPlanning",
  
  // 自定义能力
  CUSTOM = "custom"
}

// Agent 能力描述
export interface AgentCapability {
  type: CapabilityType | string;
  name: string;
  description?: string;
  version?: string;
  metadata?: Record<string, any>;
}

// Agent 注册信息
export interface AgentRegistration {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  status: AgentStatus;
  registeredAt: number;
  lastHealthCheck?: number;
  metadata?: Record<string, any>;
}

export enum AgentStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BUSY = "busy",
  ERROR = "error"
}

export class CapabilityRegistry {
  private agents: Map<string, AgentRegistration> = new Map();
  private capabilityIndex: Map<string, Set<string>> = new Map(); // capability -> agent ids

  /**
   * 注册 Agent
   */
  registerAgent(agent: AgentRegistration): void {
    this.agents.set(agent.id, {
      ...agent,
      status: AgentStatus.ACTIVE,
      registeredAt: Date.now()
    });

    // 建立能力索引
    for (const cap of agent.capabilities) {
      if (!this.capabilityIndex.has(cap.type)) {
        this.capabilityIndex.set(cap.type, new Set());
      }
      this.capabilityIndex.get(cap.type)!.add(agent.id);
    }

    console.log(`[Capability] Agent registered: ${agent.name} with ${agent.capabilities.length} capabilities`);
  }

  /**
   * 注销 Agent
   */
  unregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // 移除能力索引
    for (const cap of agent.capabilities) {
      const agents = this.capabilityIndex.get(cap.type);
      if (agents) {
        agents.delete(agentId);
        if (agents.size === 0) {
          this.capabilityIndex.delete(cap.type);
        }
      }
    }

    this.agents.delete(agentId);
    return true;
  }

  /**
   * 更新 Agent 状态
   */
  updateAgentStatus(agentId: string, status: AgentStatus): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.status = status;
    return true;
  }

  /**
   * 按能力查找 Agent
   */
  findAgentsByCapability(capability: CapabilityType | string): AgentRegistration[] {
    const agentIds = this.capabilityIndex.get(capability);
    if (!agentIds) return [];

    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is AgentRegistration => agent !== undefined && agent.status === AgentStatus.ACTIVE);
  }

  /**
   * 按多个能力查找 Agent（AND 逻辑）
   */
  findAgentsByCapabilities(capabilities: (CapabilityType | string)[]): AgentRegistration[] {
    if (capabilities.length === 0) return [];

    // 获取第一个能力的 Agent 集合
    const firstAgents = this.findAgentsByCapability(capabilities[0]);
    if (firstAgents.length === 0) return [];

    // 过滤具有所有能力的 Agent
    return firstAgents.filter(agent => {
      const agentCapabilities = new Set(agent.capabilities.map(c => c.type));
      return capabilities.every(cap => agentCapabilities.has(cap));
    });
  }

  /**
   * 获取最佳 Agent（基于能力匹配和状态）
   */
  getBestAgent(capabilities: (CapabilityType | string)[], preferredAgentId?: string): AgentRegistration | null {
    const candidates = this.findAgentsByCapabilities(capabilities);
    if (candidates.length === 0) return null;

    // 如果指定了首选 Agent
    if (preferredAgentId) {
      const preferred = candidates.find(a => a.id === preferredAgentId);
      if (preferred) return preferred;
    }

    // 按状态排序：ACTIVE > BUSY > INACTIVE > ERROR
    const statusOrder = {
      [AgentStatus.ACTIVE]: 0,
      [AgentStatus.BUSY]: 1,
      [AgentStatus.INACTIVE]: 2,
      [AgentStatus.ERROR]: 3
    };

    candidates.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return candidates[0];
  }

  /**
   * 获取 Agent
   */
  getAgent(agentId: string): AgentRegistration | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 获取所有 Agent
   */
  getAllAgents(): AgentRegistration[] {
    return Array.from(this.agents.values());
  }

  /**
   * 获取所有能力
   */
  getAllCapabilities(): string[] {
    return Array.from(this.capabilityIndex.keys());
  }

  /**
   * 检查 Agent 是否具有指定能力
   */
  hasCapability(agentId: string, capability: CapabilityType | string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    return agent.capabilities.some(c => c.type === capability);
  }

  /**
   * 健康检查
   */
  async healthCheck(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.lastHealthCheck = Date.now();
    // TODO: 实现实际的健康检查逻辑
    return true;
  }

  /**
   * 获取状态
   */
  getStatus(): { totalAgents: number; activeAgents: number; totalCapabilities: number } {
    const agents = Array.from(this.agents.values());
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === AgentStatus.ACTIVE).length,
      totalCapabilities: this.capabilityIndex.size
    };
  }
}

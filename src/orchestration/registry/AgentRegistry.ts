/**
 * AgentRegistry — manages registered agents.
 */
import { AgentProfile } from "./AgentProfile";

export class AgentRegistry {
  private agents: Map<string, AgentProfile> = new Map();

  register(agent: AgentProfile): void {
    this.agents.set(agent.id, agent);
  }

  unregister(id: string): boolean {
    return this.agents.delete(id);
  }

  list(): AgentProfile[] {
    return Array.from(this.agents.values());
  }

  get(id: string): AgentProfile | null {
    return this.agents.get(id) || null;
  }

  findByCapability(capability: string): AgentProfile[] {
    return this.list().filter(a => a.enabled && a.capabilities.includes(capability));
  }

  findByRole(role: string): AgentProfile[] {
    return this.list().filter(a => a.enabled && a.role === role);
  }

  enabled(): AgentProfile[] {
    return this.list().filter(a => a.enabled);
  }
}

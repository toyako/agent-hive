/**
 * AgentProfile — agent registration profile.
 */
export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  priority: number;
  enabled: boolean;
}

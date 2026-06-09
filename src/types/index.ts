// ─── Task ────────────────────────────────────────────

export type TaskStatus =
  | "PENDING"
  | "EXECUTING"
  | "REVIEWING"
  | "REVISION_REQUIRED"
  | "COMPLETED"
  | "FAILED"
  | "ESCALATED";  // NEW: for escalation path

export interface Task {
  id: string;
  instruction: string;
  executor: string;
  reviewer: string;
  status: TaskStatus;
  revisionCount: number;
  maxRevision: number;
  timeout: number; // ms
  workingDirectory: string;
  createdAt: number;
  updatedAt: number;
  result?: any;
  reviewResult?: ReviewResult;
  // v2.0 additions
  conversationId?: string;       // links to conversation
  agentChain?: string[];         // ordered list of agents that processed this task
  escalationPolicy?: EscalationPolicy;
}

export interface TaskCreateOptions {
  instruction: string;
  executor: string;
  reviewer: string;
  workingDirectory?: string;
  maxRevision?: number;
  timeout?: number;
  // v2.0 additions
  conversationId?: string;
  escalationPolicy?: EscalationPolicy;
  timeBudget?: TaskTimeBudget;
}

// ─── Review ──────────────────────────────────────────

export interface ReviewResult {
  decision: "PASS" | "FAIL";
  score: number;
  issues: string[];
  // v2.0: structured issues
  structuredIssues?: ReviewIssue[];
  suggestions?: string[];
  context?: string;
}

export interface ReviewIssue {
  severity: "critical" | "major" | "minor" | "info";
  category: "logic" | "style" | "performance" | "security" | "test";
  description: string;
  file?: string;
  line?: number;
  suggestedFix?: string;
}

// ─── Agent Message ───────────────────────────────────

export type MessageType =
  | "TASK"
  | "RESULT"
  | "REVIEW"
  | "REVISION"
  | "ERROR"
  // v2.0 additions
  | "DELEGATE"
  | "ESCALATE"
  | "CONTEXT"
  | "PING"
  | "PONG"
  | "CONVERSATION_START"
  | "CONVERSATION_END"
  | "CONVERSATION_MESSAGE";

export interface AgentMessage {
  id: string;
  taskId: string;
  from: string;
  to: string;
  type: MessageType;
  payload: any;
  timestamp: number;
}

// v2.0: Enhanced message envelope
export interface MessageEnvelope {
  id: string;
  taskId: string;
  conversationId: string;
  from: string;
  to: string;
  type: MessageType;
  payload: any;
  metadata: MessageMetadata;
  timestamp: number;
}

export interface MessageMetadata {
  hopCount: number;
  maxHops: number;
  replyTo?: string;
  deadline?: number;
  priority: number;
  // Tracking
  routingPath: string[];     // list of agents this message has passed through
}

// ─── Agent Adapter ───────────────────────────────────

export type AgentRole =
  | "planner"
  | "executor"
  | "reviewer"
  | "coordinator"
  | "custom"
  | "developer";  // v1.1 backward compat (same as executor)

export interface AgentAdapter {
  name: string;
  role: AgentRole;
  capabilities: string[];
  version?: string;  // NEW: adapter version

  detect(): Promise<boolean>;
  health(): Promise<boolean>;
  execute(task: Task, instruction?: string): Promise<AgentResult>;
  review?(task: Task): Promise<ReviewResult>;

  // v2.0: optional conversation mode
  converse?(messages: MessageEnvelope[]): Promise<MessageEnvelope>;

  // v2.0: capability query
  supportsFeature?(feature: string): boolean;

  // v2.0: secret requirements (for future Secret Vault)
  getRequiredSecrets?(): string[];
}

export interface AgentResult {
  success: boolean;
  output: string;
  files?: string[];
  error?: string;
}

// ─── Registry Entry ──────────────────────────────────

// v1.1: kept for backward compatibility
export interface RegistryEntry {
  name: string;
  role: AgentRole;
  reportsTo?: string;
  capabilities: string[];
  installed: boolean;
  healthy: boolean;
  path?: string;
}

// v2.0: Runtime vs Agent separation
export interface RuntimeEntry {
  id: string;
  binary: string;
  adapter: AgentAdapter;
  capabilities: string[];
  healthy: boolean;
  installed: boolean;
  features: string[];
}

export interface AgentProfile {
  id: string;
  runtimeId: string;
  role: AgentRole;
  systemPrompt?: string;
  maxConcurrency: number;
  status: "idle" | "busy" | "offline";
}

// ─── Graph ───────────────────────────────────────────

export type EdgeRelation =
  | "delegates"
  | "reviews"
  | "provides"
  | "escalates"
  | "collaborates"
  | "approves";

export interface GraphEdge {
  from: string;
  to: string;
  relation: EdgeRelation;
  condition?: string;
  weight: number;
}

export interface AgentGraphData {
  agents: Record<string, AgentProfile>;
  edges: GraphEdge[];
}

// ─── Conversation ────────────────────────────────────

export interface Conversation {
  id: string;
  taskId: string;
  participants: string[];      // agent profile ids
  messages: MessageEnvelope[];
  status: "active" | "completed" | "failed" | "timeout";
  createdAt: number;
  updatedAt: number;
}

// ─── Revision History ────────────────────────────────

export interface RevisionRecord {
  taskId: string;
  attempt: number;
  executor: string;
  reviewer: string;
  decision: "PASS" | "FAIL";
  score: number;
  issues: string[];
  timestamp: string;
}

// ─── Safety ──────────────────────────────────────────

export interface EscalationPolicy {
  onMaxRevisionReached: "fail" | "escalate" | "accept-with-warnings";
  escalateTo?: string;
}

export interface TaskTimeBudget {
  totalMs: number;
  perAgentMs: number;
  reviewCycleMs: number;
}

export interface CircuitBreakerState {
  agentId: string;
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
  nextRetryAt?: number;
}

// ─── Health Report ───────────────────────────────────

export interface HealthReport {
  timestamp: number;
  runtimes: RuntimeHealthReport[];
  agents: AgentHealthReport[];
  graph: GraphHealthReport;
}

export interface RuntimeHealthReport {
  id: string;
  installed: boolean;
  healthy: boolean;
  features: string[];
}

export interface AgentHealthReport {
  id: string;
  runtimeId: string;
  role: AgentRole;
  status: string;
  circuitBreaker: CircuitBreakerState;
}

export interface GraphHealthReport {
  agentCount: number;
  edgeCount: number;
  cycles: string[][];
  isolatedAgents: string[];
}

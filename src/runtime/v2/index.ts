/**
 * Runtime v2 — Phase 1
 * 
 * Agent Hive Runtime v2.0 基础设施
 */

// 核心
export { RuntimeCore, RuntimeConfig, Verdict, VerificationResult, EvaluatorPipeline } from "./RuntimeCore";

// 状态机
export { RuntimeStateMachine, RuntimeState, RuntimeContext, RuntimeStateTransition } from "./state-machine/RuntimeStateMachine";

// 任务契约
export {
  TaskContract,
  TaskConstraint,
  TaskBudget,
  TaskPriority,
  VerificationCriteria,
  VerificationCheck,
  RetryPolicy,
  CheckpointPolicy,
  CheckpointAction,
  ExpectedOutput,
  createDefaultTaskContract
} from "./intent/TaskContract";

// 事件系统
export {
  RuntimeEventType,
  RuntimeEvent,
  EventHandler,
  EventBus,
  globalEventBus
} from "./observation/EventBus";

// 队列
export { RuntimeQueue, QueueItem } from "./queue/RuntimeQueue";

// 策略引擎
export { PolicyEngine, PolicyResult, PolicyCheck, PolicyEvaluation } from "./policy/PolicyEngine";

// 评估流水线
export {
  EvaluationNode,
  EvaluationNodeResult,
  LintEvaluationNode,
  TypeCheckEvaluationNode,
  UnitTestEvaluationNode,
  IntegrationTestEvaluationNode,
  SecurityScanEvaluationNode,
  ReviewerEvaluationNode,
  DefaultEvaluatorPipeline
} from "./evaluator/EvaluatorPipeline";

// 发现引擎
export {
  DiscoverySourceType,
  DiscoveryEvent,
  DiscoverySource,
  Intent,
  DiscoveryEngine
} from "./discovery/DiscoveryEngine";

// 调度引擎
export {
  ScheduleType,
  ScheduledTask,
  SchedulerEngine
} from "./scheduler/SchedulerEngine";

// 能力注册表
export {
  CapabilityType,
  AgentCapability,
  AgentRegistration,
  AgentStatus,
  CapabilityRegistry
} from "./capability/CapabilityRegistry";

// 持久化引擎
export {
  PersistenceConfig,
  PersistedState,
  PersistenceEngine
} from "./persistence/PersistenceEngine";

// 预算守卫
export {
  BudgetLimits,
  BudgetConsumption,
  BudgetState,
  BudgetGuard
} from "./budget/BudgetGuard";

// 恢复引擎
export {
  RecoveryAction,
  RecoveryConfig,
  RecoveryRecord,
  RecoveryEngine
} from "./recovery/RecoveryEngine";

// 人工检查点
export {
  CheckpointStatus,
  ChangeDiff,
  CheckpointSnapshot,
  HumanCheckpointManager
} from "./checkpoint/HumanCheckpoint";

// 工作流桥接
export {
  WorkflowExecutionResult,
  RuntimeWorkflowConfig,
  RuntimeWorkflowBridge
} from "./workflow/RuntimeWorkflowBridge";

// 工作区隔离
export {
  WorkspaceSnapshot,
  WorkspaceSandbox,
  WorkspaceIsolation
} from "./isolation/WorkspaceIsolation";

// Provider 插件系统
export {
  ProviderType,
  ProviderConfig,
  ProviderCapability,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  CompletionOptions,
  CompletionResponse,
  Provider,
  ProviderRegistration,
  ProviderRegistry,
  globalProviderRegistry
} from "./provider/ProviderRegistry";

export {
  OpenAICompatibleProvider,
  registerOpenAIProvider
} from "./provider/OpenAIProvider";

export {
  AnthropicProvider,
  registerAnthropicProvider
} from "./provider/AnthropicProvider";

export {
  GoogleProvider,
  registerGoogleProvider
} from "./provider/GoogleProvider";

export {
  ProviderSelectionStrategy,
  ProviderManager,
  globalProviderManager
} from "./provider/ProviderManager";

// 审计追踪
export {
  AuditEventType,
  AuditEvent,
  AuditQuery,
  AuditStats,
  AuditTrail
} from "./audit/AuditTrail";

// 并发管理
export {
  LockType,
  LockInfo,
  TenantInfo,
  ConcurrencyConfig,
  ConcurrencyManager
} from "./concurrency/ConcurrencyManager";

// 水合引擎
export {
  HydrationStatus,
  HydrationResult,
  RecoveryStrategy,
  HydrationEngine
} from "./hydration/HydrationEngine";

// Planner 引擎
export {
  ExecutionPlan,
  ExecutionStep,
  PlannerConfig,
  PlannerEngine
} from "./planner/PlannerEngine";

// Dashboard API
export {
  ApiResponse,
  TaskStatusView,
  CheckpointView,
  DecisionRequest,
  DecisionResponse,
  AuditView,
  DashboardApi
} from "./dashboard/DashboardApi";

export {
  DashboardServerConfig,
  DashboardServer
} from "./dashboard/DashboardServer";

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

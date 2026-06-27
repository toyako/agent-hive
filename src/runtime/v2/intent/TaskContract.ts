/**
 * Task Contract — Phase 1
 * 
 * 每个任务必须表示为 Runtime Contract
 * 
 * 最小 schema:
 * - Goal
 * - Constraints
 * - Budget
 * - Deadline
 * - Priority
 * - Required Skills
 * - Verification Criteria
 * - Retry Policy
 * - Checkpoint Policy
 * - Expected Outputs
 */

export interface TaskContract {
  // 基本信息
  id: string;
  goal: string;
  description?: string;
  
  // 约束
  constraints: TaskConstraint[];
  
  // 预算
  budget: TaskBudget;
  
  // 时间
  deadline?: number; // timestamp
  timeout?: number; // ms
  
  // 优先级
  priority: TaskPriority;
  
  // 所需技能
  requiredSkills: string[];
  
  // 验证标准
  verificationCriteria: VerificationCriteria;
  
  // 重试策略
  retryPolicy: RetryPolicy;
  
  // 检查点策略
  checkpointPolicy: CheckpointPolicy;
  
  // 预期输出
  expectedOutputs: ExpectedOutput[];
  
  // 元数据
  metadata: Record<string, any>;
  
  // 时间戳
  createdAt: number;
  updatedAt: number;
}

export interface TaskConstraint {
  type: "file" | "directory" | "command" | "network" | "resource" | "custom";
  description: string;
  value?: any;
}

export interface TaskBudget {
  maxTokens?: number;
  maxCost?: number; // USD
  maxRetries?: number;
  maxRuntime?: number; // ms
  dailyBudget?: number; // USD
}

export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  URGENT = 3,
  CRITICAL = 4
}

export interface VerificationCriteria {
  // 必须通过的检查
  required: VerificationCheck[];
  
  // 可选的检查
  optional?: VerificationCheck[];
  
  // 最低通过分数
  minScore?: number;
}

export interface VerificationCheck {
  type: "lint" | "typecheck" | "test" | "security" | "review" | "custom";
  name: string;
  command?: string;
  expected?: any;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number; // ms
  backoffMultiplier?: number;
  maxDelay?: number; // ms
  retryOn?: ("timeout" | "error" | "budget" | "policy")[];
}

export interface CheckpointPolicy {
  // 需要人工检查点的操作
  requireApproval: CheckpointAction[];
  
  // 自动检查点
  autoCheckpoint?: boolean;
  
  // 检查点超时
  checkpointTimeout?: number; // ms
}

export enum CheckpointAction {
  MERGE = "merge",
  RELEASE = "release",
  DELETE = "delete",
  DEPLOY = "deploy",
  PUBLISH = "publish",
  DATABASE_MIGRATION = "database_migration",
  MODIFY_SECRETS = "modify_secrets"
}

export interface ExpectedOutput {
  type: "file" | "directory" | "message" | "status" | "custom";
  name: string;
  description?: string;
  required: boolean;
}

/**
 * 创建默认任务契约
 */
export function createDefaultTaskContract(goal: string, options: Partial<TaskContract> = {}): TaskContract {
  const now = Date.now();
  
  return {
    id: options.id || `task-${now}-${Math.random().toString(36).substr(2, 9)}`,
    goal,
    description: options.description || "",
    constraints: options.constraints || [],
    budget: options.budget || {
      maxTokens: 100000,
      maxCost: 1.0,
      maxRetries: 3,
      maxRuntime: 300000 // 5 minutes
    },
    deadline: options.deadline,
    timeout: options.timeout || 300000,
    priority: options.priority || TaskPriority.NORMAL,
    requiredSkills: options.requiredSkills || [],
    verificationCriteria: options.verificationCriteria || {
      required: [
        { type: "lint", name: "code-lint" },
        { type: "review", name: "agent-review" }
      ],
      minScore: 70
    },
    retryPolicy: options.retryPolicy || {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000,
      retryOn: ["timeout", "error"]
    },
    checkpointPolicy: options.checkpointPolicy || {
      requireApproval: [CheckpointAction.DEPLOY, CheckpointAction.PUBLISH],
      autoCheckpoint: true,
      checkpointTimeout: 60000
    },
    expectedOutputs: options.expectedOutputs || [],
    metadata: options.metadata || {},
    createdAt: now,
    updatedAt: now
  };
}

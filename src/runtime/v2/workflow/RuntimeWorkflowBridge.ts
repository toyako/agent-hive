/**
 * Runtime Workflow Bridge — Phase 2
 * 
 * 将 WorkflowMachine 对接到 Runtime 状态机和验证管线
 * 
 * 职责：
 * 1. 将 WorkflowMachine 的状态同步到 Runtime State Machine
 * 2. 在工作流执行前调用 Policy Engine
 * 3. 在工作流验证阶段调用 Evaluator Pipeline
 * 4. 在工作流执行中监控 Budget Guard
 * 5. 在工作流失败时调用 Recovery Engine
 * 6. 在工作流等待时调用 Human Checkpoint
 */

import { RuntimeCore, Verdict, VerificationResult } from "../RuntimeCore";
import { RuntimeState, RuntimeContext } from "../state-machine/RuntimeStateMachine";
import { TaskContract } from "../intent/TaskContract";
import { PolicyEngine, PolicyResult } from "../policy/PolicyEngine";
import { DefaultEvaluatorPipeline } from "../evaluator/EvaluatorPipeline";
import { BudgetGuard } from "../budget/BudgetGuard";
import { RecoveryEngine, RecoveryAction } from "../recovery/RecoveryEngine";
import { HumanCheckpointManager, ChangeDiff } from "../checkpoint/HumanCheckpoint";
import { PersistenceEngine } from "../persistence/PersistenceEngine";
import { CapabilityRegistry, CapabilityType } from "../capability/CapabilityRegistry";
import { EventBus, RuntimeEventType, globalEventBus } from "../observation/EventBus";
import { WorkspaceIsolation } from "../isolation/WorkspaceIsolation";

// 工作流执行结果
export interface WorkflowExecutionResult {
  taskId: string;
  success: boolean;
  output?: any;
  error?: string;
  verificationResult?: VerificationResult;
  state: RuntimeState;
  duration: number;
  metadata?: Record<string, any>;  // TD-3: 支持 error.stack 等元数据
}

// 工作流配置
export interface RuntimeWorkflowConfig {
  enablePolicyCheck: boolean;
  enableEvaluator: boolean;
  enableBudgetGuard: boolean;
  enableRecovery: boolean;
  enableCheckpoint: boolean;
  maxRetries: number;
}

export class RuntimeWorkflowBridge {
  private runtime: RuntimeCore;
  private policy: PolicyEngine;
  private evaluator: DefaultEvaluatorPipeline;
  private budgetGuard: BudgetGuard;
  private recovery: RecoveryEngine;
  private checkpoint: HumanCheckpointManager;
  private persistence: PersistenceEngine;
  private capabilityRegistry: CapabilityRegistry;
  private workspaceIsolation: WorkspaceIsolation;
  private eventBus: EventBus;
  private config: RuntimeWorkflowConfig;

  constructor(
    runtime: RuntimeCore,
    options: {
      policy?: PolicyEngine;
      evaluator?: DefaultEvaluatorPipeline;
      budgetGuard?: BudgetGuard;
      persistence?: PersistenceEngine;
      capabilityRegistry?: CapabilityRegistry;
      config?: Partial<RuntimeWorkflowConfig>;
    } = {}
  ) {
    this.runtime = runtime;
    this.policy = options.policy || new PolicyEngine();
    this.evaluator = options.evaluator || new DefaultEvaluatorPipeline();
    this.persistence = options.persistence || new PersistenceEngine();
    this.capabilityRegistry = options.capabilityRegistry || new CapabilityRegistry();
    this.workspaceIsolation = new WorkspaceIsolation(this.persistence);
    this.eventBus = runtime.getEventBus();
    this.config = {
      enablePolicyCheck: true,
      enableEvaluator: true,
      enableBudgetGuard: true,
      enableRecovery: true,
      enableCheckpoint: true,
      maxRetries: 3,
      ...options.config
    };

    // 创建 Budget Guard
    this.budgetGuard = options.budgetGuard || new BudgetGuard({
      maxTokensPerTask: 100000,
      maxCostPerTask: 1.0,
      maxRetriesPerTask: this.config.maxRetries
    }, this.eventBus);

    // 创建 Recovery Engine
    this.recovery = new RecoveryEngine(
      runtime.getStateMachine(),
      { maxRetriesPerTask: this.config.maxRetries },
      this.eventBus
    );

    // 创建 Human Checkpoint Manager
    this.checkpoint = new HumanCheckpointManager(
      runtime.getStateMachine(),
      this.persistence,
      this.eventBus
    );

    // 设置回调
    this.setupCallbacks();
  }

  /**
   * 设置回调
   */
  private setupCallbacks(): void {
    // Budget Guard 硬中断回调
    this.budgetGuard.onHardAbort((taskId, reason) => {
      console.error(`[WorkflowBridge] 🚨 Budget hard abort: ${taskId} - ${reason}`);
      this.runtime.failTask(taskId, `Budget exceeded: ${reason}`);
    });

    // Recovery 升级回调
    this.recovery.onEscalate((taskId: string, reason: string) => {
      console.error(`[WorkflowBridge] 🚨 Recovery escalate: ${taskId} - ${reason}`);
      // 创建检查点
      this.createHumanCheckpoint(taskId, reason);
    });

    // Checkpoint 审批回调
    this.checkpoint.onApproval((taskId: string, approved: boolean, reason?: string) => {
      if (approved) {
        console.log(`[WorkflowBridge] ✅ Checkpoint approved: ${taskId}`);
        this.recovery.approveTask(taskId);
      } else {
        console.log(`[WorkflowBridge] ❌ Checkpoint rejected: ${taskId} - ${reason}`);
        this.recovery.rejectTask(taskId, reason || "Rejected by human");
      }
    });
  }

  /**
   * 执行工作流
   * 
   * 完整流程：
   * 1. 发现任务
   * 2. Policy 检查
   * 3. 预算检查
   * 4. 执行任务
   * 5. Evaluator 验证
   * 6. 完成或失败
   */
  async executeWorkflow(
    goal: string,
    executor: (task: TaskContract) => Promise<any>,
    options: {
      requiredSkills?: CapabilityType[];
      changes?: ChangeDiff;
      metadata?: Record<string, any>;
      workspaceDir?: string;  // 工作区目录
    } = {}
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const workspaceDir = options.workspaceDir || process.cwd();

    // 1. 发现任务
    const task = await this.runtime.discoverTask(goal, {
      requiredSkills: options.requiredSkills?.map(s => s.toString()),
      metadata: options.metadata
    });
    const taskId = task.id;

    // 2. 创建工作区快照（Handoff Isolation）
    await this.workspaceIsolation.createSnapshot(taskId, workspaceDir);

    // 3. 创建工作区沙箱
    const sandbox = await this.workspaceIsolation.createSandbox(taskId, workspaceDir);
    const sandboxDir = sandbox.sandboxDir;

    try {
      // 2. Policy 检查
      if (this.config.enablePolicyCheck) {
        const policyResult = await this.policy.evaluate(task);
        if (policyResult.result === PolicyResult.REJECT) {
          await this.runtime.failTask(taskId, `Policy rejected: ${policyResult.checks.map((c: any) => c.message).join(", ")}`);
          return {
            taskId,
            success: false,
            error: `Policy rejected: ${policyResult.checks.map((c: any) => c.message).join(", ")}`,
            state: RuntimeState.FAILED,
            duration: Date.now() - startTime
          };
        }
      }

      // 3. 预算检查
      if (this.config.enableBudgetGuard) {
        const budgetCheck = this.budgetGuard.canStartTask(taskId);
        if (!budgetCheck.allowed) {
          await this.runtime.failTask(taskId, `Budget check failed: ${budgetCheck.reason}`);
          return {
            taskId,
            success: false,
            error: `Budget check failed: ${budgetCheck.reason}`,
            state: RuntimeState.BUDGET_LIMIT,
            duration: Date.now() - startTime
          };
        }
      }

      // 4. 加入队列并开始执行
      await this.runtime.enqueueTask(taskId);
      await this.runtime.executeTask(taskId);

      // 5. 执行任务（在沙箱中执行）
      let output: any;
      let retryCount = 0;
      let success = false;

      while (retryCount <= this.config.maxRetries && !success) {
        try {
          // 🚨 重试时强制回滚（Rollback on Retry）
          if (retryCount > 0) {
            console.log(`[WorkflowBridge] 🔄 Rolling back sandbox for retry ${retryCount}`);
            await this.workspaceIsolation.rollbackSandbox(taskId);
          }

          // 记录执行开始
          this.budgetGuard.recordConsumption(taskId, { runtimeElapsed: 0 });

          // 执行任务（在沙箱目录中）
          output = await executor({ ...task, metadata: { ...task.metadata, workingDirectory: sandboxDir } });

          // 记录执行完成
          this.budgetGuard.recordConsumption(taskId, { 
            tokensUsed: output?.tokensUsed || 0,
            costIncurred: output?.costIncurred || 0
          });

          success = true;
        } catch (error: any) {
          retryCount++;
          
          // 🚨 TD-3 Fix: error.stack 全量透传
          const errorInfo = {
            message: error.message || String(error),
            stack: error.stack || 'No stack trace available',
            name: error.name || 'Error',
            timestamp: Date.now()
          };
          
          console.error(`[WorkflowBridge] Execution error (attempt ${retryCount}):`, errorInfo.message);

          // 记录重试
          this.budgetGuard.recordRetry(taskId);

          // 尝试恢复
          if (this.config.enableRecovery && retryCount <= this.config.maxRetries) {
            const recoveryAction = await this.recovery.attemptRecovery(taskId, errorInfo.message);
            if (recoveryAction === RecoveryAction.ESCALATE) {
              // 升级到人工 - 全量透传错误信息
              return {
                taskId,
                success: false,
                error: errorInfo.message,
                state: RuntimeState.WAITING_CHECKPOINT,
                duration: Date.now() - startTime,
                metadata: {
                  errorStack: errorInfo.stack,
                  errorName: errorInfo.name,
                  retryCount,
                  escalatedAt: Date.now()
                }
              };
            }
          }
        }
      }

      // 销毁沙箱
      await this.workspaceIsolation.destroySandbox(taskId);

      if (!success) {
        await this.runtime.failTask(taskId, `Failed after ${retryCount} retries`);
        return {
          taskId,
          success: false,
          error: `Failed after ${retryCount} retries`,
          state: RuntimeState.FAILED,
          duration: Date.now() - startTime
        };
      }

      // 6. 完成执行，进入审查
      await this.runtime.finishExecution(taskId, output);

      // 7. 完成审查，进入验证
      await this.runtime.finishReview(taskId);

      // 8. Evaluator 验证
      let verificationResult: VerificationResult | undefined;
      if (this.config.enableEvaluator) {
        verificationResult = await this.evaluator.evaluate(taskId, output);
        await this.runtime.submitVerification(taskId, verificationResult);

        if (verificationResult.verdict === Verdict.REJECT) {
          // 验证失败，创建检查点
          if (this.config.enableCheckpoint) {
            await this.createHumanCheckpoint(taskId, `Verification rejected: score ${verificationResult.score}`);
          }
          return {
            taskId,
            success: false,
            error: `Verification rejected: score ${verificationResult.score}`,
            verificationResult,
            state: RuntimeState.WAITING_CHECKPOINT,
            duration: Date.now() - startTime
          };
        }
      } else {
        // 没有 Evaluator，直接完成
        await this.runtime.finishReview(taskId);
        await this.runtime.submitVerification(taskId, {
          verdict: Verdict.PASS,
          score: 100,
          checks: [{ name: "no-evaluator", passed: true }],
          timestamp: Date.now()
        });
      }

      // 8. 成功
      return {
        taskId,
        success: true,
        output,
        verificationResult,
        state: RuntimeState.COMPLETED,
        duration: Date.now() - startTime
      };

    } catch (error) {
      // 未捕获的错误
      await this.runtime.failTask(taskId, String(error));
      return {
        taskId,
        success: false,
        error: String(error),
        state: RuntimeState.FAILED,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 创建人工检查点
   */
  private async createHumanCheckpoint(taskId: string, reason: string): Promise<void> {
    const context = this.runtime.getTaskContext(taskId);
    if (!context) return;

    await this.checkpoint.createCheckpoint(
      taskId,
      {
        filesChanged: context.metadata?.changes?.filesChanged || [],
        linesAdded: context.metadata?.changes?.linesAdded || 0,
        linesRemoved: context.metadata?.changes?.linesRemoved || 0,
        summary: context.metadata?.changes?.summary || "No changes recorded"
      },
      context.metadata?.verificationResult || null,
      reason,
      this.recovery.getRecoveryHistory(taskId).map((r: any) => ({
        action: r.action,
        reason: r.reason,
        timestamp: r.timestamp
      })),
      this.budgetGuard.getTaskConsumption(taskId)
    );
  }

  /**
   * 获取检查点管理器
   */
  getCheckpointManager(): HumanCheckpointManager {
    return this.checkpoint;
  }

  /**
   * 获取预算守卫
   */
  getBudgetGuard(): BudgetGuard {
    return this.budgetGuard;
  }

  /**
   * 获取恢复引擎
   */
  getRecoveryEngine(): RecoveryEngine {
    return this.recovery;
  }

  /**
   * 获取配置
   */
  getConfig(): RuntimeWorkflowConfig {
    return { ...this.config };
  }
}

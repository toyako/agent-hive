/**
 * SelfHealingRuntime — Self-Healing Runtime Phase 2
 * 
 * 将所有组件整合为一个完整的自愈运行时
 */

import { FailureClassifier, FailureAnalysis } from "./FailureClassifier";
import { PolicyEngine, RecoveryPlan, RecoveryAction } from "./PolicyEngine";
import { RetryPolicy } from "./RetryPolicy";
import { LoopMemory } from "./LoopMemory";
import { ExecutionTrace } from "./ExecutionTrace";
import { RuntimeEventEmitter, RuntimeEventType } from "./RuntimeEvents";
import { RuntimeV2 } from "../runtime-v2";
import { ObservationEngine, Observation } from "../loop-layer/ObservationEngine";
import { EvaluationEngine, Evaluation } from "../loop-layer/EvaluationEngine";

// Self-Healing Result
export interface SelfHealingResult {
  success: boolean;
  iterations: number;
  finalEvaluation: Evaluation;
  trace: ExecutionTrace;
  memory: LoopMemory;
}

export class SelfHealingRuntime {
  private runtime: RuntimeV2;
  private failureClassifier: FailureClassifier;
  private policyEngine: PolicyEngine;
  private retryPolicy: RetryPolicy;
  private loopMemory: LoopMemory;
  private observationEngine: ObservationEngine;
  private evaluationEngine: EvaluationEngine;
  private eventEmitter: RuntimeEventEmitter;
  private maxIterations: number;

  constructor(maxIterations: number = 5) {
    this.runtime = new RuntimeV2();
    this.failureClassifier = new FailureClassifier();
    this.policyEngine = new PolicyEngine();
    this.retryPolicy = new RetryPolicy();
    this.loopMemory = new LoopMemory();
    this.observationEngine = new ObservationEngine();
    this.evaluationEngine = new EvaluationEngine();
    this.eventEmitter = new RuntimeEventEmitter();
    this.maxIterations = maxIterations;
  }

  /**
   * 执行任务（自愈）
   */
  async execute(task: string): Promise<SelfHealingResult> {
    const executionId = `self-healing-${Date.now()}`;
    const trace = new ExecutionTrace(executionId);
    let iteration = 0;
    let currentTask = task;

    this.eventEmitter.emit({
      type: "TASK_STARTED",
      executionId,
      data: { task }
    });

    while (iteration < this.maxIterations) {
      iteration++;
      const nodeId = `iteration-${iteration}`;

      this.eventEmitter.emit({
        type: "LOOP_STARTED",
        executionId,
        nodeId,
        data: { iteration }
      });

      trace.startNode(nodeId, { task: currentTask });

      try {
        // 执行 Runtime
        const startTime = Date.now();
        const result = await this.runtime.run(currentTask);
        const duration = Date.now() - startTime;

        // 观察结果
        const observation = this.observationEngine.observe(nodeId, result, startTime);

        // 评估结果
        const evaluation = this.evaluationEngine.evaluate(observation);

        // 记录到内存
        this.loopMemory.record({
          iteration,
          result,
          evaluation
        });

        trace.completeNode(nodeId, result);

        this.eventEmitter.emit({
          type: "NODE_COMPLETED",
          executionId,
          nodeId,
          data: { result }
        });

        // 检查是否成功
        if (evaluation.status === "SUCCESS") {
          this.eventEmitter.emit({
            type: "TASK_COMPLETED",
            executionId,
            data: { iterations: iteration }
          });

          return {
            success: true,
            iterations: iteration,
            finalEvaluation: evaluation,
            trace,
            memory: this.loopMemory
          };
        }

        // 失败处理
        const failure: FailureAnalysis = {
          type: "UNKNOWN",
          confidence: 0.5,
          reason: evaluation.reason
        };

        const recoveryPlan = this.policyEngine.createRecoveryPlan(failure);

        this.loopMemory.record({
          iteration,
          failureAnalysis: failure,
          recoveryPlan
        });

        // 根据恢复计划执行
        switch (recoveryPlan.action) {
          case "RETRY":
            trace.retryNode(nodeId);
            this.eventEmitter.emit({
              type: "NODE_RETRY",
              executionId,
              nodeId,
              data: { recoveryPlan }
            });
            break;

          case "REPLAN":
            currentTask = `Replan: ${task} (attempt ${iteration})`;
            this.eventEmitter.emit({
              type: "NODE_REPLAN",
              executionId,
              nodeId,
              data: { recoveryPlan }
            });
            break;

          case "ESCALATE":
          default:
            this.eventEmitter.emit({
              type: "LOOP_FAILED",
              executionId,
              nodeId,
              data: { reason: "Escalated to human" }
            });

            return {
              success: false,
              iterations: iteration,
              finalEvaluation: evaluation,
              trace,
              memory: this.loopMemory
            };
        }

      } catch (error) {
        // 失败分类
        const failure = this.failureClassifier.classify(error);
        const recoveryPlan = this.policyEngine.createRecoveryPlan(failure);

        trace.failNode(nodeId, String(error), failure.type);

        this.eventEmitter.emit({
          type: "NODE_FAILED",
          executionId,
          nodeId,
          data: { failure, recoveryPlan }
        });

        this.loopMemory.record({
          iteration,
          failureAnalysis: failure,
          recoveryPlan
        });

        // 根据恢复计划执行
        switch (recoveryPlan.action) {
          case "RETRY":
            if (this.retryPolicy.canRetry(failure.type)) {
              const delay = this.retryPolicy.getDelay();
              this.retryPolicy.recordRetry(failure.reason);
              
              trace.retryNode(nodeId);
              await this.delay(delay);
              
              this.eventEmitter.emit({
                type: "NODE_RETRY",
                executionId,
                nodeId,
                data: { delay }
              });
            } else {
              return {
                success: false,
                iterations: iteration,
                finalEvaluation: {
                  status: "FAILED",
                  reason: "Max retries exceeded",
                  nextAction: "COMPLETE"
                },
                trace,
                memory: this.loopMemory
              };
            }
            break;

          case "REPLAN":
            currentTask = `Replan: ${task} (attempt ${iteration})`;
            this.eventEmitter.emit({
              type: "NODE_REPLAN",
              executionId,
              nodeId,
              data: { recoveryPlan }
            });
            break;

          case "ESCALATE":
          default:
            return {
              success: false,
              iterations: iteration,
              finalEvaluation: {
                status: "FAILED",
                reason: failure.reason,
                nextAction: "COMPLETE"
              },
              trace,
              memory: this.loopMemory
            };
        }
      }
    }

    // 超过最大迭代次数
    return {
      success: false,
      iterations: iteration,
      finalEvaluation: {
        status: "FAILED",
        reason: "LOOP_LIMIT_EXCEEDED",
        nextAction: "COMPLETE"
      },
      trace,
      memory: this.loopMemory
    };
  }

  /**
   * 获取事件发射器
   */
  getEventEmitter(): RuntimeEventEmitter {
    return this.eventEmitter;
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

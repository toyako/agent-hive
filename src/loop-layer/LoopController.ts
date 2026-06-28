/**
 * LoopController — Loop Layer Phase 1
 * 
 * 唯一职责：
 * 根据 Evaluation：
 * - SUCCESS → return
 * - FAILED → REPLAN → 重新调用 Planner → 生成新 DAG → Runtime.execute()
 * - PARTIAL → RETRY → Runtime.execute()
 * 
 * LoopController 不允许直接操作 Agent
 * 所有执行必须通过 Runtime
 */

import { ObservationEngine, Observation } from "./ObservationEngine";
import { EvaluationEngine, Evaluation } from "./EvaluationEngine";
import { RuntimeV2 } from "../runtime-v2";

// Loop Result
export interface LoopResult {
  success: boolean;
  iteration: number;
  finalEvaluation: Evaluation;
  observations: Observation[];
}

export class LoopController {
  private observationEngine: ObservationEngine;
  private evaluationEngine: EvaluationEngine;
  private runtime: RuntimeV2;
  private maxIterations: number;

  constructor(runtime: RuntimeV2, maxIterations: number = 5) {
    this.observationEngine = new ObservationEngine();
    this.evaluationEngine = new EvaluationEngine();
    this.runtime = runtime;
    this.maxIterations = maxIterations;
  }

  /**
   * 执行 Loop
   */
  async execute(task: string): Promise<LoopResult> {
    const observations: Observation[] = [];
    let iteration = 0;
    let currentTask = task;

    while (iteration < this.maxIterations) {
      iteration++;
      const startTime = Date.now();
      const executionId = `loop-${iteration}-${Date.now()}`;

      // 执行 Runtime
      const result = await this.runtime.run(currentTask);

      // 观察结果
      const observation = this.observationEngine.observe(executionId, result, startTime);
      observations.push(observation);

      // 评估结果
      const evaluation = this.evaluationEngine.evaluate(observation);

      // 根据评估决定下一步
      switch (evaluation.nextAction) {
        case "COMPLETE":
          return {
            success: true,
            iteration,
            finalEvaluation: evaluation,
            observations
          };

        case "RETRY":
          // 重试相同任务
          continue;

        case "REPLAN":
          // 重新规划
          currentTask = `Replan: ${task} (attempt ${iteration})`;
          continue;
      }
    }

    // 超过最大迭代次数
    return {
      success: false,
      iteration,
      finalEvaluation: {
        status: "FAILED",
        reason: "LOOP_LIMIT_EXCEEDED",
        nextAction: "COMPLETE"
      },
      observations
    };
  }
}

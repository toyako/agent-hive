/**
 * Planner Engine — TD-1 Fix
 * 
 * Planner 动态生成执行计划，结果实时反哺给执行队列
 */

import { TaskContract, createDefaultTaskContract, TaskPriority } from "../intent/TaskContract";
import { RuntimeQueue } from "../queue/RuntimeQueue";
import { EventBus, RuntimeEventType, globalEventBus } from "../observation/EventBus";
import { RuntimeStateMachine, RuntimeState } from "../state-machine/RuntimeStateMachine";

export interface ExecutionPlan {
  id: string;
  parentTaskId: string;
  steps: ExecutionStep[];
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface ExecutionStep {
  id: string;
  order: number;
  goal: string;
  requiredSkills: string[];
  dependsOn?: string[];
  timeout?: number;
}

export interface PlannerConfig {
  maxStepsPerPlan: number;
  defaultTimeout: number;
}

export class PlannerEngine {
  private queue: RuntimeQueue;
  private stateMachine: RuntimeStateMachine;
  private eventBus: EventBus;
  private config: PlannerConfig;
  private plans: Map<string, ExecutionPlan> = new Map();

  constructor(
    queue: RuntimeQueue,
    stateMachine: RuntimeStateMachine,
    eventBus: EventBus = globalEventBus,
    config: Partial<PlannerConfig> = {}
  ) {
    this.queue = queue;
    this.stateMachine = stateMachine;
    this.eventBus = eventBus;
    this.config = {
      maxStepsPerPlan: 10,
      defaultTimeout: 300000,
      ...config
    };
  }

  async createPlan(
    taskId: string,
    intent: string,
    options: { requiredSkills?: string[]; metadata?: Record<string, any> } = {}
  ): Promise<ExecutionPlan> {
    const steps = await this.decomposeIntent(intent, options);

    const plan: ExecutionPlan = {
      id: `plan-${taskId}-${Date.now()}`,
      parentTaskId: taskId,
      steps,
      createdAt: Date.now(),
      metadata: options.metadata
    };

    this.plans.set(plan.id, plan);

    this.eventBus.emit({
      type: RuntimeEventType.LOOP_PLAN,
      taskId,
      timestamp: Date.now(),
      data: { planId: plan.id, stepCount: steps.length }
    });

    console.log(`[Planner] Plan created: ${plan.id} (${steps.length} steps)`);
    return plan;
  }

  private async decomposeIntent(
    intent: string,
    options: { requiredSkills?: string[] }
  ): Promise<ExecutionStep[]> {
    const steps: ExecutionStep[] = [];
    const intentLower = intent.toLowerCase();

    if (intentLower.includes("build") || intentLower.includes("create")) {
      steps.push({ id: `step-${Date.now()}-1`, order: 1, goal: `Analyze: ${intent}`, requiredSkills: ["analysis"] });
      steps.push({ id: `step-${Date.now()}-2`, order: 2, goal: `Implement: ${intent}`, requiredSkills: options.requiredSkills || ["coding"], dependsOn: [`step-${Date.now()}-1`] });
      steps.push({ id: `step-${Date.now()}-3`, order: 3, goal: `Test: ${intent}`, requiredSkills: ["testing"], dependsOn: [`step-${Date.now()}-2`] });
    } else if (intentLower.includes("fix") || intentLower.includes("debug")) {
      steps.push({ id: `step-${Date.now()}-1`, order: 1, goal: `Diagnose: ${intent}`, requiredSkills: ["analysis"] });
      steps.push({ id: `step-${Date.now()}-2`, order: 2, goal: `Fix: ${intent}`, requiredSkills: options.requiredSkills || ["coding"], dependsOn: [`step-${Date.now()}-1`] });
    } else {
      steps.push({ id: `step-${Date.now()}-1`, order: 1, goal: intent, requiredSkills: options.requiredSkills || ["general"] });
    }

    return steps;
  }

  async feedPlanToQueue(planId: string): Promise<number> {
    const plan = this.plans.get(planId);
    if (!plan) return 0;

    let enqueuedCount = 0;
    for (const step of plan.steps) {
      const task = createDefaultTaskContract(step.goal, {
        priority: TaskPriority.NORMAL,
        requiredSkills: step.requiredSkills,
        timeout: step.timeout || this.config.defaultTimeout,
        metadata: { planId: plan.id, parentTaskId: plan.parentTaskId, stepOrder: step.order }
      });

      if (this.queue.enqueue(task, { dependencies: step.dependsOn })) {
        enqueuedCount++;
      }
    }

    console.log(`[Planner] Plan fed to queue: ${enqueuedCount}/${plan.steps.length} steps`);
    return enqueuedCount;
  }

  getPlan(planId: string): ExecutionPlan | undefined { return this.plans.get(planId); }
  getPlansByTask(taskId: string): ExecutionPlan[] { return Array.from(this.plans.values()).filter(p => p.parentTaskId === taskId); }
  getStatus(): { totalPlans: number; totalSteps: number } {
    const plans = Array.from(this.plans.values());
    return { totalPlans: plans.length, totalSteps: plans.reduce((s, p) => s + p.steps.length, 0) };
  }
}

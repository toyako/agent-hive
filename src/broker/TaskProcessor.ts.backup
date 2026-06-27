import { AgentRegistry } from "./AgentRegistry";
import { MessageBus } from "./MessageBus";
import { TaskRouter } from "./TaskRouter";
import { TaskQueue } from "../utils/TaskQueue";
import { Logger } from "../utils/logger";
import { RevisionHistory } from "../utils/RevisionHistory";
import { GraphOperations } from "./GraphOperations";
import { workflowMachine, stateToStatus } from "../workflow/WorkflowMachine";
import { interpret } from "xstate";
import { Task, AgentAdapter, ReviewResult, TaskTimeBudget } from "../types";
import * as fs from "fs";
import * as path from "path";

const REVISION_PROMPT_TEMPLATE = fs.readFileSync(
  path.join(__dirname, "../prompts/revision.txt"), "utf-8"
);

/**
 * TaskProcessor — unified execute→review→revision loop.
 * Handles both v1.1 (simple) and v2.0 (graph+conversation+safety) modes.
 */
export class TaskProcessor {
  constructor(
    private registry: AgentRegistry,
    private bus: MessageBus,
    private router: TaskRouter,
    private queue: TaskQueue,
    private history: RevisionHistory,
    private graphOps: GraphOperations
  ) {}

  async process(task: Task, graphMode: boolean): Promise<void> {
    if (graphMode) {
      await this.processWithGraph(task);
    } else {
      await this.processSimple(task);
    }
  }

  // ─── v1.1 Simple Processing ───────────────────────

  private async processSimple(task: Task): Promise<void> {
    const log = new Logger(task.id, "broker");
    const reviewerName = task.reviewer || this.router.resolveReviewer(task);

    this.printHeader(task);

    const errors = this.router.validate(task);
    if (errors.length > 0) {
      task.status = "FAILED";
      this.queue.save(task);
      console.log(`  [router] VALIDATION FAILED: ${errors.join(", ")}`);
      return;
    }

    const actor = this.createActor(task);
    const executor = this.registry.getAdapter(task.executor)!;
    let execResult;

    // Execute
    actor.send({ type: "START" });
    log.log({ from: "broker", to: task.executor, prompt: task.instruction, type: "TASK" });
    this.bus.send("broker", task.executor, task.id, "TASK", { instruction: task.instruction });
    console.log(`  [→ ${task.executor}] Executing...`);

    try {
      execResult = await this.execWithTimeout(() => executor.execute(task), task.timeout);
    } catch (err: any) {
      actor.send({ type: "ERROR", error: err.message });
      log.error(`Execution failed: ${err.message}`);
      console.log(`  [✗ ${task.executor}] ERROR: ${err.message}`);
      this.saveFinal(task, actor);
      actor.stop();
      return;
    }

    actor.send({ type: "EXEC_DONE" });
    task.result = execResult.output;
    log.log({ from: task.executor, to: "broker", response: execResult.output, type: "RESULT" });
    this.bus.send(task.executor, "broker", task.id, "RESULT", execResult);
    console.log(`  [✓ ${task.executor}] Done: ${execResult.output.slice(0, 80)}`);

    // Review loop
    await this.reviewLoop(task, actor, executor, reviewerName, log, execResult);

    this.saveFinal(task, actor, execResult?.output);
    this.printFooter(task, actor);
    actor.stop();
  }

  // ─── v2.0 Graph Processing ───────────────────────

  private async processWithGraph(task: Task): Promise<void> {
    const log = new Logger(task.id, "broker-graph");
    let escalated = false;

    // Conversation + time budget
    const participants = [task.executor, task.reviewer];
    const conversation = this.graphOps.conversations.create(task.id, participants);
    task.conversationId = conversation.id;

    const budget: TaskTimeBudget = {
      totalMs: task.timeout * 3,
      perAgentMs: task.timeout,
      reviewCycleMs: task.timeout,
    };
    this.graphOps.timeBudget.create(task.id, budget);

    this.printHeader(task, "graph mode");
    console.log(`  conversation: ${conversation.id}`);

    // Validate via graph
    const reviewerName = task.reviewer || this.graphOps.messageRouter.findReviewer(task.executor) || task.reviewer;
    const routeErrors = this.graphOps.messageRouter.validateRoute(task.executor, reviewerName);
    if (routeErrors.length > 0) {
      task.status = "FAILED";
      this.queue.save(task);
      this.graphOps.conversations.fail(conversation.id, routeErrors.join(", "));
      console.log(`  [router] VALIDATION FAILED: ${routeErrors.join(", ")}`);
      return;
    }

    if (!this.graphOps.circuitBreaker.isAvailable(task.executor)) {
      task.status = "FAILED";
      this.queue.save(task);
      this.graphOps.conversations.fail(conversation.id, `Circuit breaker open for ${task.executor}`);
      console.log(`  [safety] Circuit breaker OPEN for ${task.executor}`);
      return;
    }

    const actor = this.createActor(task);
    const executor = this.registry.getAdapter(task.executor)!;
    let execResult;

    // Execute
    actor.send({ type: "START" });
    this.graphOps.timeBudget.startAgentInvocation(task.id);

    const taskEnv = this.graphOps.createEnvelope("broker", task.executor, task.id, conversation.id, "TASK", { instruction: task.instruction });
    this.bus.sendEnvelope(taskEnv);
    log.log({ from: "broker", to: task.executor, prompt: task.instruction, type: "TASK" });
    console.log(`  [→ ${task.executor}] Executing...`);

    try {
      execResult = await this.execWithTimeout(() => executor.execute(task), task.timeout);
      this.graphOps.circuitBreaker.recordSuccess(task.executor);
    } catch (err: any) {
      this.graphOps.circuitBreaker.recordFailure(task.executor);
      actor.send({ type: "ERROR", error: err.message });
      log.error(`Execution failed: ${err.message}`);
      console.log(`  [✗ ${task.executor}] ERROR: ${err.message}`);
      this.saveFinal(task, actor);
      this.graphOps.conversations.fail(conversation.id, err.message);
      actor.stop();
      return;
    }

    actor.send({ type: "EXEC_DONE" });
    task.result = execResult.output;
    task.agentChain = [task.executor];

    const resultEnv = this.graphOps.createEnvelope(task.executor, "broker", task.id, conversation.id, "RESULT", execResult);
    this.bus.sendEnvelope(resultEnv);
    this.graphOps.conversations.addMessage(conversation.id, resultEnv);
    log.log({ from: task.executor, to: "broker", response: execResult.output, type: "RESULT" });
    console.log(`  [✓ ${task.executor}] Done: ${execResult.output.slice(0, 80)}`);

    // Review loop with graph features
    const originalExecutor = task.executor;
    await this.reviewLoopGraph(task, actor, executor, reviewerName, log, execResult, conversation.id);

    // Check if escalation happened in THIS run
    const escalatedThisRun = task.executor !== originalExecutor;

    if (escalatedThisRun) {
      // Task was already saved as ESCALATED by handleReviewFailGraph
      // Don't overwrite with saveFinal
      this.printFooter(task, actor, "graph mode");
    } else {
      this.saveFinal(task, actor, execResult?.output);
      if (task.status === "COMPLETED") {
        this.graphOps.conversations.complete(conversation.id);
      }
      this.printFooter(task, actor, "graph mode");
    }

    actor.stop();
  }

  // ─── Shared Review Loop (v1.1) ────────────────────

  private async reviewLoop(
    task: Task, actor: any, executor: AgentAdapter,
    reviewerName: string, log: Logger, execResult: any
  ): Promise<void> {
    let reviewPassed = false;

    while (!reviewPassed) {
      const current = actor.getSnapshot();
      if (current.value === "FAILED" || current.value === "COMPLETED") break;

      log.log({ from: "broker", to: reviewerName, prompt: "Review latest result", type: "REVIEW" });
      this.bus.send("broker", reviewerName, task.id, "REVIEW", {});
      console.log(`  [→ ${reviewerName}] Reviewing...`);

      const reviewer = this.registry.getAdapter(reviewerName)!;
      let reviewResult: ReviewResult;

      try {
        if (!reviewer.review) throw new Error(`${reviewerName} has no review capability`);
        reviewResult = await this.execWithTimeout(() => reviewer.review!(task), task.timeout);
      } catch (err: any) {
        actor.send({ type: "ERROR", error: err.message });
        log.error(`Review failed: ${err.message}`);
        console.log(`  [✗ ${reviewerName}] REVIEW ERROR: ${err.message}`);
        break;
      }

      log.log({ from: reviewerName, to: "broker", response: JSON.stringify(reviewResult), type: "REVIEW" });
      this.bus.send(reviewerName, "broker", task.id, "REVIEW", reviewResult);
      this.history.add({
        taskId: task.id, attempt: actor.getSnapshot().context.revisionCount + 1,
        executor: task.executor, reviewer: reviewerName,
        decision: reviewResult.decision, score: reviewResult.score,
        issues: reviewResult.issues, timestamp: new Date().toISOString(),
      });

      if (reviewResult.decision === "PASS") {
        actor.send({ type: "REVIEW_PASS", result: reviewResult });
        console.log(`  [✓ ${reviewerName}] PASS (score: ${reviewResult.score})`);
        reviewPassed = true;
      } else {
        const handled = await this.handleReviewFail(task, actor, executor, reviewerName, log, reviewResult, execResult);
        if (!handled) break;
      }
    }
  }

  // ─── Graph Review Loop (v2.0) ─────────────────────

  private async reviewLoopGraph(
    task: Task, actor: any, executor: AgentAdapter,
    reviewerName: string, log: Logger, execResult: any, conversationId: string
  ): Promise<void> {
    let reviewPassed = false;

    while (!reviewPassed) {
      if (this.graphOps.timeBudget.isTotalExceeded(task.id)) {
        console.log(`  [safety] Total time budget exceeded for ${task.id}`);
        actor.send({ type: "ERROR", error: "TIMEOUT: total budget exceeded" });
        break;
      }

      const current = actor.getSnapshot();
      if (current.value === "FAILED" || current.value === "COMPLETED") break;

      if (!this.graphOps.circuitBreaker.isAvailable(reviewerName)) {
        console.log(`  [safety] Circuit breaker OPEN for reviewer ${reviewerName}`);
        break;
      }

      this.graphOps.timeBudget.startReviewCycle(task.id);

      const reviewEnv = this.graphOps.createEnvelope("broker", reviewerName, task.id, conversationId, "REVIEW", {});
      this.bus.sendEnvelope(reviewEnv);
      this.graphOps.conversations.addMessage(conversationId, reviewEnv);
      log.log({ from: "broker", to: reviewerName, prompt: "Review latest result", type: "REVIEW" });
      console.log(`  [→ ${reviewerName}] Reviewing...`);

      const reviewer = this.registry.getAdapter(reviewerName)!;
      let reviewResult: ReviewResult;

      try {
        if (!reviewer.review) throw new Error(`${reviewerName} has no review capability`);
        reviewResult = await this.execWithTimeout(() => reviewer.review!(task), task.timeout);
        this.graphOps.circuitBreaker.recordSuccess(reviewerName);
      } catch (err: any) {
        this.graphOps.circuitBreaker.recordFailure(reviewerName);
        actor.send({ type: "ERROR", error: err.message });
        log.error(`Review failed: ${err.message}`);
        console.log(`  [✗ ${reviewerName}] REVIEW ERROR: ${err.message}`);
        break;
      }

      const resultEnv = this.graphOps.createEnvelope(reviewerName, "broker", task.id, conversationId, "REVIEW", reviewResult);
      this.bus.sendEnvelope(resultEnv);
      this.graphOps.conversations.addMessage(conversationId, resultEnv);
      log.log({ from: reviewerName, to: "broker", response: JSON.stringify(reviewResult), type: "REVIEW" });

      this.history.add({
        taskId: task.id, attempt: actor.getSnapshot().context.revisionCount + 1,
        executor: task.executor, reviewer: reviewerName,
        decision: reviewResult.decision, score: reviewResult.score,
        issues: reviewResult.issues, timestamp: new Date().toISOString(),
      });

      if (reviewResult.decision === "PASS") {
        actor.send({ type: "REVIEW_PASS", result: reviewResult });
        console.log(`  [✓ ${reviewerName}] PASS (score: ${reviewResult.score})`);
        reviewPassed = true;
      } else {
        const handled = await this.handleReviewFailGraph(task, actor, executor, reviewerName, log, reviewResult, execResult, conversationId);
        if (!handled) break;
      }
    }
  }

  // ─── Handle Review Failure (v1.1) ─────────────────

  private async handleReviewFail(
    task: Task, actor: any, executor: AgentAdapter,
    reviewerName: string, log: Logger, reviewResult: ReviewResult, execResult: any
  ): Promise<boolean> {
    console.log(`  [✗ ${reviewerName}] FAIL (score: ${reviewResult.score})`);
    console.log(`    issues: ${reviewResult.issues.join(", ")}`);

    actor.send({ type: "REVIEW_FAIL", result: reviewResult });
    const afterFail = actor.getSnapshot();

    if (afterFail.value === "FAILED") {
      return this.handleEscalation(task, actor, log, execResult, reviewResult);
    }

    return this.doRevision(task, actor, executor, log, afterFail.context.revisionCount, reviewResult, execResult);
  }

  // ─── Handle Review Failure (v2.0) ─────────────────

  private async handleReviewFailGraph(
    task: Task, actor: any, executor: AgentAdapter,
    reviewerName: string, log: Logger, reviewResult: ReviewResult, execResult: any, conversationId: string
  ): Promise<boolean> {
    console.log(`  [✗ ${reviewerName}] FAIL (score: ${reviewResult.score})`);
    console.log(`    issues: ${reviewResult.issues.join(", ")}`);

    actor.send({ type: "REVIEW_FAIL", result: reviewResult });
    const afterFail = actor.getSnapshot();

    if (afterFail.value === "FAILED") {
      const escalation = task.escalationPolicy;
      if (escalation?.onMaxRevisionReached === "escalate" && escalation.escalateTo) {
        console.log(`  [escalate] Max revisions reached. Escalating to ${escalation.escalateTo}`);
        task.status = "ESCALATED";
        task.executor = escalation.escalateTo;
        task.revisionCount = 0;
        task.result = execResult?.output;
        task.escalationPolicy = undefined;
        this.queue.save(task);
        this.graphOps.conversations.fail(conversationId, "Escalated after max revisions");
        log.log({ from: "broker", to: escalation.escalateTo, prompt: "Escalated task", type: "ESCALATE" });
        return false;
      } else if (escalation?.onMaxRevisionReached === "accept-with-warnings") {
        console.log(`  [accept-with-warnings] Max revisions reached. Accepting with warnings.`);
        task.status = "COMPLETED";
        task.result = execResult?.output;
        (task as any).warnings = reviewResult.issues;
        this.queue.save(task);
        this.graphOps.conversations.complete(conversationId);
        return false;
      }
      log.error(`Max revisions reached (${task.maxRevision})`);
      console.log(`  [✗] Max revisions reached. FAILED.`);
      this.graphOps.conversations.fail(conversationId, "Max revisions reached");
      return false;
    }

    return this.doRevision(task, actor, executor, log, afterFail.context.revisionCount, reviewResult, execResult);
  }

  // ─── Escalation (v1.1) ────────────────────────────

  private handleEscalation(task: Task, actor: any, log: Logger, execResult: any, reviewResult: ReviewResult): boolean {
    const escalation = task.escalationPolicy;
    if (escalation?.onMaxRevisionReached === "escalate" && escalation.escalateTo) {
      console.log(`  [escalate] Escalating to ${escalation.escalateTo}`);
      task.status = "ESCALATED";
      task.executor = escalation.escalateTo;
      task.revisionCount = 0;
      task.result = execResult?.output;
      task.escalationPolicy = undefined;
      this.queue.save(task);
      log.log({ from: "broker", to: escalation.escalateTo, prompt: "Escalated task", type: "ESCALATE" });
      return false;
    } else if (escalation?.onMaxRevisionReached === "accept-with-warnings") {
      task.status = "COMPLETED";
      task.result = execResult?.output;
      (task as any).warnings = reviewResult.issues;
      this.queue.save(task);
      return false;
    }
    log.error(`Max revisions reached`);
    console.log(`  [✗] Max revisions reached. FAILED.`);
    return false;
  }

  // ─── Shared Revision Logic ────────────────────────

  private async doRevision(
    task: Task, actor: any, executor: AgentAdapter,
    log: Logger, newRevCount: number, reviewResult: ReviewResult, execResult: any
  ): Promise<boolean> {
    console.log(`  [↻ ${task.executor}] Revision #${newRevCount}...`);

    const revisionInstruction = buildRevisionPrompt(reviewResult.issues, task.instruction);
    this.bus.send("broker", task.executor, task.id, "REVISION", { issues: reviewResult.issues });
    log.log({ from: "broker", to: task.executor, prompt: revisionInstruction, type: "REVISION" });

    try {
      execResult = await this.execWithTimeout(() => executor.execute(task, revisionInstruction), task.timeout);
      this.graphOps?.getCircuitBreaker().recordSuccess(task.executor);
      task.result = execResult.output;
      if (!task.agentChain) task.agentChain = [];
      task.agentChain.push(task.executor);
      actor.send({ type: "REVISION_DONE" });
      actor.send({ type: "EXEC_DONE" });
      console.log(`  [✓ ${task.executor}] Revision done: ${execResult.output.slice(0, 80)}`);
      return true;
    } catch (err: any) {
      this.graphOps?.getCircuitBreaker().recordFailure(task.executor);
      actor.send({ type: "ERROR", error: err.message });
      log.error(`Revision failed: ${err.message}`);
      return false;
    }
  }

  // ─── Helpers ──────────────────────────────────────

  private createActor(task: Task) {
    const actor = interpret(workflowMachine, {
      input: { taskId: task.id, maxRevision: task.maxRevision },
    });
    actor.start();
    return actor;
  }

  private saveFinal(task: Task, actor: any, result?: string): void {
    const snapshot = actor.getSnapshot();
    task.status = stateToStatus(snapshot.value as string);
    task.revisionCount = snapshot.context.revisionCount;
    if (result) task.result = result;
    this.queue.save(task);
  }

  private execWithTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
      fn().then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); }
      );
    });
  }

  private printHeader(task: Task, mode?: string): void {
    console.log(`\n  ═══ ${task.id}${mode ? ` (${mode})` : ""} ═══`);
    console.log(`  instruction: "${task.instruction}"`);
    console.log(`  workingDirectory: ${task.workingDirectory}`);
  }

  private printFooter(task: Task, actor: any, mode?: string): void {
    const finalState = actor.getSnapshot();
    const status = stateToStatus(finalState.value as string);
    const modeStr = mode ? ` (${mode})` : "";
    console.log(`\n  ═══ ${task.id} → ${status}${modeStr} ═══\n`);
  }
}

function buildRevisionPrompt(issues: string[], instruction: string): string {
  return REVISION_PROMPT_TEMPLATE
    .replace("{{issues}}", issues.map((i) => `- ${i}`).join("\n"))
    .replace("{{instruction}}", instruction);
}

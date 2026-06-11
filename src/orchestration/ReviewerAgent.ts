/**
 * ReviewerAgent — reviews all agent outputs.
 */
import { Agent, Task, TaskResult, ReviewResult } from "./contracts/Agent";
import { AgentProfile } from "./registry/AgentProfile";

export class ReviewerAgent implements Agent {
  profile: AgentProfile = {
    id: "reviewer",
    name: "Reviewer",
    role: "reviewer",
    capabilities: ["audit", "verification", "quality"],
    priority: 10,
    enabled: true,
  };

  canHandle(task: Task): boolean {
    return task.type === "review" || task.type === "audit";
  }

  async execute(task: Task): Promise<TaskResult> {
    return {
      taskId: task.id,
      agentId: this.profile.id,
      success: true,
      output: "Review completed",
      durationMs: 0,
    };
  }

  async review(result: TaskResult): Promise<ReviewResult> {
    // Analyze the result
    const findings: string[] = [];
    let score = 100;

    if (!result.success) {
      findings.push("Task execution failed");
      score -= 50;
    }

    if (!result.output || result.output.length < 10) {
      findings.push("Output too short or empty");
      score -= 20;
    }

    if (result.durationMs > 60000) {
      findings.push("Execution took over 60 seconds");
      score -= 10;
    }

    return {
      taskId: result.taskId,
      reviewerId: this.profile.id,
      score: Math.max(0, score),
      findings,
      approved: score >= 60,
    };
  }
}

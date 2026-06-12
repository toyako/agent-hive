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
    const findings: string[] = [];
    let score = 100;

    // P0: Task execution failed
    if (!result.success) {
      findings.push("Task execution failed");
      score -= 50;
    }

    // P1: Output quality checks (Finding #1 fix)
    if (!result.output || result.output.trim().length === 0) {
      findings.push("Empty output — no deliverable produced");
      score -= 80; // Almost certainly a failure
    } else if (result.output.trim().length < 10) {
      findings.push("Output too short — insufficient deliverable");
      score -= 60; // Very likely a failure
    }

    // P2: Negative keyword detection (Finding #2 fix)
    const negativeKeywords = ["warning", "TODO", "FIXME", "no tests", "partial", "incomplete", "not implemented", "stub"];
    const outputLower = (result.output || "").toLowerCase();
    for (const keyword of negativeKeywords) {
      if (outputLower.includes(keyword)) {
        findings.push(`Negative indicator found: "${keyword}"`);
        score -= 15;
      }
    }

    // P3: Execution time
    if (result.durationMs > 60000) {
      findings.push("Execution took over 60 seconds");
      score -= 10;
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      taskId: result.taskId,
      reviewerId: this.profile.id,
      score: finalScore,
      findings,
      approved: finalScore >= 60,
    };
  }
}

/**
 * JudgeAgent — final acceptance authority.
 * Reviewer Pass ≠ Judge Pass. Judge has final say.
 */
import { Agent, Task, TaskResult, ReviewResult, JudgeResult } from "./contracts/Agent";
import { AgentProfile } from "./registry/AgentProfile";

export class JudgeAgent implements Agent {
  profile: AgentProfile = {
    id: "judge",
    name: "Judge",
    role: "judge",
    capabilities: ["acceptance", "scoring"],
    priority: 100,
    enabled: true,
  };

  canHandle(task: Task): boolean {
    return task.type === "acceptance" || task.type === "scoring";
  }

  async execute(task: Task): Promise<TaskResult> {
    return {
      taskId: task.id,
      agentId: this.profile.id,
      success: true,
      output: "Judgment completed",
      durationMs: 0,
    };
  }

  /** Judge accepts or rejects based on task result + review */
  judge(result: TaskResult, review: ReviewResult): JudgeResult {
    let score = review.score;
    const reasons: string[] = [];

    // Judge criteria
    if (!result.success) {
      score = 0;
      reasons.push("Task execution failed");
    }

    if (!review.approved) {
      score = Math.min(score, 40);
      reasons.push("Reviewer did not approve");
    }

    if (review.findings.length > 3) {
      score -= 10;
      reasons.push("Too many findings from reviewer");
    }

    if (result.output.length > 100) {
      score += 5;
      reasons.push("Substantial output produced");
    }

    const finalScore = Math.max(0, Math.min(100, score));
    const accepted = finalScore >= 70;

    return {
      taskId: result.taskId,
      judgeId: this.profile.id,
      accepted,
      score: finalScore,
      reason: reasons.length > 0 ? reasons.join("; ") : (accepted ? "All criteria met" : "Score below threshold"),
    };
  }
}

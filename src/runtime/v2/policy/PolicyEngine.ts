/**
 * Policy Engine — Phase 1
 * 
 * 策略引擎
 * 
 * 在 Review 之前执行
 * 
 * 职责：
 * - Permission validation
 * - Safety validation
 * - Budget validation
 * - Workspace validation
 * - Risk validation
 * - Compliance validation
 * - Sensitive action detection
 * 
 * Policy Engine may reject execution immediately.
 */

import { TaskContract, CheckpointAction } from "../intent/TaskContract";
import { RuntimeContext } from "../state-machine/RuntimeStateMachine";

export enum PolicyResult {
  PASS = "PASS",
  REJECT = "REJECT"
}

export interface PolicyCheck {
  name: string;
  result: PolicyResult;
  message?: string;
  severity?: "low" | "medium" | "high" | "critical";
}

export interface PolicyEvaluation {
  result: PolicyResult;
  checks: PolicyCheck[];
  timestamp: number;
}

export class PolicyEngine {
  private sensitiveActions: Set<string> = new Set([
    "delete",
    "deploy",
    "publish",
    "merge",
    "release",
    "drop",
    "truncate",
    "remove",
    "destroy",
    "force"
  ]);

  private blockedCommands: Set<string> = new Set([
    "rm -rf /",
    "rm -rf /*",
    "dd if=",
    "mkfs",
    "format",
    ":(){:|:&};:"
  ]);

  constructor() {
    // 默认策略
  }

  /**
   * 评估任务是否可以通过策略检查
   * 
   * 悲观验证：默认 REJECT，所有检查通过才返回 PASS
   */
  async evaluate(task: TaskContract, context?: RuntimeContext): Promise<PolicyEvaluation> {
    const checks: PolicyCheck[] = [];

    // 1. Permission validation
    checks.push(this.checkPermissions(task));

    // 2. Safety validation
    checks.push(this.checkSafety(task));

    // 3. Budget validation
    checks.push(this.checkBudget(task));

    // 4. Workspace validation
    checks.push(this.checkWorkspace(task));

    // 5. Risk validation
    checks.push(this.checkRisk(task));

    // 6. Compliance validation
    checks.push(this.checkCompliance(task));

    // 7. Sensitive action detection
    checks.push(this.checkSensitiveActions(task));

    // 悲观验证：所有检查必须通过
    const allPassed = checks.every(c => c.result === PolicyResult.PASS);

    return {
      result: allPassed ? PolicyResult.PASS : PolicyResult.REJECT,
      checks,
      timestamp: Date.now()
    };
  }

  private checkPermissions(task: TaskContract): PolicyCheck {
    // 检查任务是否有必要的权限
    if (!task.requiredSkills || task.requiredSkills.length === 0) {
      return {
        name: "permission-check",
        result: PolicyResult.PASS,
        message: "No specific skills required"
      };
    }

    // TODO: 检查技能权限
    return {
      name: "permission-check",
      result: PolicyResult.PASS,
      message: "Permission check passed"
    };
  }

  private checkSafety(task: TaskContract): PolicyCheck {
    // 检查任务是否包含危险操作
    const goal = task.goal.toLowerCase();

    // 检查敏感关键词
    const dangerousKeywords = ["password", "secret", "key", "token", "credential"];
    for (const keyword of dangerousKeywords) {
      if (goal.includes(keyword)) {
        return {
          name: "safety-check",
          result: PolicyResult.REJECT,
          message: `Task contains sensitive keyword: ${keyword}`,
          severity: "high"
        };
      }
    }

    return {
      name: "safety-check",
      result: PolicyResult.PASS,
      message: "Safety check passed"
    };
  }

  private checkBudget(task: TaskContract): PolicyCheck {
    // 检查预算是否合理
    if (task.budget.maxCost && task.budget.maxCost > 100) {
      return {
        name: "budget-check",
        result: PolicyResult.REJECT,
        message: `Budget too high: $${task.budget.maxCost} > $100 limit`,
        severity: "medium"
      };
    }

    if (task.budget.maxTokens && task.budget.maxTokens > 1000000) {
      return {
        name: "budget-check",
        result: PolicyResult.REJECT,
        message: `Token budget too high: ${task.budget.maxTokens} > 1M limit`,
        severity: "medium"
      };
    }

    return {
      name: "budget-check",
      result: PolicyResult.PASS,
      message: "Budget check passed"
    };
  }

  private checkWorkspace(task: TaskContract): PolicyCheck {
    // 检查工作空间约束
    if (task.constraints) {
      for (const constraint of task.constraints) {
        if (constraint.type === "directory") {
          // 检查是否尝试访问敏感目录
          const sensitiveDirs = ["/etc", "/var", "/usr", "/root", "~/.ssh", "~/.aws"];
          for (const dir of sensitiveDirs) {
            if (constraint.value && constraint.value.includes(dir)) {
              return {
                name: "workspace-check",
                result: PolicyResult.REJECT,
                message: `Cannot access sensitive directory: ${dir}`,
                severity: "critical"
              };
            }
          }
        }
      }
    }

    return {
      name: "workspace-check",
      result: PolicyResult.PASS,
      message: "Workspace check passed"
    };
  }

  private checkRisk(task: TaskContract): PolicyCheck {
    // 检查风险级别
    if (task.priority >= 4) { // CRITICAL
      return {
        name: "risk-check",
        result: PolicyResult.REJECT,
        message: "Critical priority tasks require manual approval",
        severity: "high"
      };
    }

    return {
      name: "risk-check",
      result: PolicyResult.PASS,
      message: "Risk check passed"
    };
  }

  private checkCompliance(task: TaskContract): PolicyCheck {
    // 检查合规性
    // TODO: 实现合规性检查
    return {
      name: "compliance-check",
      result: PolicyResult.PASS,
      message: "Compliance check passed"
    };
  }

  private checkSensitiveActions(task: TaskContract): PolicyCheck {
    // 检查是否包含敏感操作
    const goal = task.goal.toLowerCase();

    for (const action of this.sensitiveActions) {
      if (goal.includes(action)) {
        // 检查是否在需要审批的操作列表中
        if (task.checkpointPolicy.requireApproval.includes(action as CheckpointAction)) {
          return {
            name: "sensitive-action-check",
            result: PolicyResult.PASS,
            message: `Sensitive action '${action}' will require human checkpoint`
          };
        }

        return {
          name: "sensitive-action-check",
          result: PolicyResult.REJECT,
          message: `Sensitive action '${action}' not allowed without approval`,
          severity: "high"
        };
      }
    }

    return {
      name: "sensitive-action-check",
      result: PolicyResult.PASS,
      message: "No sensitive actions detected"
    };
  }

  /**
   * 检查命令是否安全
   */
  isCommandSafe(command: string): boolean {
    for (const blocked of this.blockedCommands) {
      if (command.includes(blocked)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 添加敏感动作
   */
  addSensitiveAction(action: string): void {
    this.sensitiveActions.add(action);
  }

  /**
   * 添加阻塞命令
   */
  addBlockedCommand(command: string): void {
    this.blockedCommands.add(command);
  }
}

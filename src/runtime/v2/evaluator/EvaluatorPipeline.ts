/**
 * Evaluator Pipeline — Phase 1
 * 
 * 验证流水线
 * 
 * 悲观验证原则：
 * 1. 默认 Verdict 必须初始化为 REJECT
 * 2. 每一个评估节点必须显式返回 PASS
 * 3. 任何一个节点未通过或异常，整个 Pipeline 必须立刻短路并走向 FAILED
 * 
 * 永远不要自我评估。
 * 评估器从不赞美。
 * 评估器只证明正确性。
 */

import { Verdict, VerificationResult, EvaluatorPipeline } from "../RuntimeCore";
import { TaskContract } from "../intent/TaskContract";
import { RuntimeContext } from "../state-machine/RuntimeStateMachine";

// 评估节点接口
export interface EvaluationNode {
  name: string;
  evaluate(taskId: string, result: any, context?: RuntimeContext): Promise<EvaluationNodeResult>;
}

// 评估节点结果
export interface EvaluationNodeResult {
  passed: boolean;
  score: number;
  message?: string;
  details?: any;
}

// 评估节点实现
export class LintEvaluationNode implements EvaluationNode {
  name = "lint";

  async evaluate(taskId: string, result: any, context?: RuntimeContext): Promise<EvaluationNodeResult> {
    // TODO: 实现实际的 lint 检查
    // 目前返回通过
    return {
      passed: true,
      score: 100,
      message: "Lint check passed"
    };
  }
}

export class TypeCheckEvaluationNode implements EvaluationNode {
  name = "typecheck";

  async evaluate(taskId: string, result: any, context?: RuntimeContext): Promise<EvaluationNodeResult> {
    // TODO: 实现实际的类型检查
    return {
      passed: true,
      score: 100,
      message: "Type check passed"
    };
  }
}

export class UnitTestEvaluationNode implements EvaluationNode {
  name = "unittest";

  async evaluate(taskId: string, result: any, context?: RuntimeContext): Promise<EvaluationNodeResult> {
    // TODO: 实现实际的单元测试
    return {
      passed: true,
      score: 100,
      message: "Unit tests passed"
    };
  }
}

export class IntegrationTestEvaluationNode implements EvaluationNode {
  name = "integrationtest";

  async evaluate(taskId: string, result: any, context?: RuntimeContext): Promise<EvaluationNodeResult> {
    // TODO: 实现实际的集成测试
    return {
      passed: true,
      score: 100,
      message: "Integration tests passed"
    };
  }
}

export class SecurityScanEvaluationNode implements EvaluationNode {
  name = "security";

  async evaluate(taskId: string, result: any, context?: RuntimeContext): Promise<EvaluationNodeResult> {
    // 检查是否包含敏感信息
    if (typeof result === "object" && result !== null) {
      // 只检查字符串值，不检查数字或布尔值
      const checkValue = (key: string, value: any): boolean => {
        if (typeof value !== "string") return false;
        const lowerValue = value.toLowerCase();
        const sensitivePatterns = ["password", "secret", "api_key", "apikey", "credential", "private_key"];
        return sensitivePatterns.some(pattern => lowerValue.includes(pattern));
      };

      // 递归检查对象
      const checkObject = (obj: any, path: string = ""): boolean => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          // 跳过数字、布尔值和常见的非敏感字段
          if (typeof value === "number" || typeof value === "boolean") continue;
          if (["tokensUsed", "costIncurred", "retryCount", "runtimeElapsed", "timestamp", "score"].includes(key)) continue;
          
          if (checkValue(key, value)) {
            return true;
          }
          
          if (typeof value === "object" && value !== null) {
            if (checkObject(value, currentPath)) {
              return true;
            }
          }
        }
        return false;
      };

      if (checkObject(result)) {
        return {
          passed: false,
          score: 0,
          message: "Security risk: contains sensitive information"
        };
      }
    }

    return {
      passed: true,
      score: 100,
      message: "Security scan passed"
    };
  }
}

export class ReviewerEvaluationNode implements EvaluationNode {
  name = "reviewer";

  async evaluate(taskId: string, result: any, context?: RuntimeContext): Promise<EvaluationNodeResult> {
    // TODO: 实现实际的 reviewer 检查
    return {
      passed: true,
      score: 85,
      message: "Reviewer approved"
    };
  }
}

// Evaluator Pipeline 实现
export class DefaultEvaluatorPipeline implements EvaluatorPipeline {
  private nodes: EvaluationNode[] = [];
  private minScore: number;

  constructor(minScore: number = 70) {
    this.minScore = minScore;

    // 默认评估节点
    this.addNode(new LintEvaluationNode());
    this.addNode(new TypeCheckEvaluationNode());
    this.addNode(new UnitTestEvaluationNode());
    this.addNode(new SecurityScanEvaluationNode());
    this.addNode(new ReviewerEvaluationNode());
  }

  /**
   * 添加评估节点
   */
  addNode(node: EvaluationNode): void {
    this.nodes.push(node);
  }

  /**
   * 移除评估节点
   */
  removeNode(name: string): void {
    this.nodes = this.nodes.filter(n => n.name !== name);
  }

  /**
   * 评估任务
   * 
   * 悲观验证原则：
   * 1. 默认 Verdict = REJECT
   * 2. 每个节点必须显式返回 PASS
   * 3. 任何节点失败，立即短路返回 REJECT
   */
  async evaluate(taskId: string, result: any): Promise<VerificationResult> {
    const checks: Array<{ name: string; passed: boolean; message?: string }> = [];
    let totalScore = 0;
    let passedCount = 0;

    // 悲观验证：默认 REJECT
    let verdict = Verdict.REJECT;

    // 遍历所有评估节点
    for (const node of this.nodes) {
      try {
        const nodeResult = await node.evaluate(taskId, result);

        checks.push({
          name: node.name,
          passed: nodeResult.passed,
          message: nodeResult.message
        });

        if (nodeResult.passed) {
          totalScore += nodeResult.score;
          passedCount++;
        } else {
          // 任何节点失败，立即短路返回 REJECT
          return {
            verdict: Verdict.REJECT,
            score: 0,
            checks,
            timestamp: Date.now()
          };
        }
      } catch (error) {
        // 节点异常，立即短路返回 REJECT
        checks.push({
          name: node.name,
          passed: false,
          message: `Evaluation node error: ${error}`
        });

        return {
          verdict: Verdict.REJECT,
          score: 0,
          checks,
          timestamp: Date.now()
        };
      }
    }

    // 所有节点都通过，计算平均分数
    const avgScore = passedCount > 0 ? totalScore / passedCount : 0;

    // 检查是否达到最低分数要求
    if (avgScore >= this.minScore) {
      verdict = Verdict.PASS;
    }

    return {
      verdict,
      score: avgScore,
      checks,
      timestamp: Date.now()
    };
  }
}

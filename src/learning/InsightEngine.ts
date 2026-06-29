/**
 * InsightEngine — Learning Loop Module 2
 * 
 * 从 execution episode 中提取"可学习信息"
 * 
 * 规则：
 * 1. root cause detection: FAILED node with longest latency = root candidate
 * 2. bottleneck scoring: node_time / total_time
 * 3. recovery effectiveness: retry_success ? 1 : 0
 */

import { ExecutionEpisode, NodeExecution } from "./ExecutionEpisodeStore";

// Execution Insight
export interface ExecutionInsight {
  rootCause: string;
  failureType: "NETWORK" | "TOOL" | "MODEL" | "PLANNER" | "UNKNOWN";
  criticalNode?: string;
  retryEffectiveness: number; // 0-1
  recoveryRequired: boolean;
  bottleneckScore: number; // 0-1
  confidence: number; // 0-1
}

export class InsightEngine {
  /**
   * 从 episode 生成 insight
   */
  analyze(episode: ExecutionEpisode): ExecutionInsight {
    const failedNodes = episode.executionTrace.filter(t => t.status === "failed");
    const retriedNodes = episode.executionTrace.filter(t => t.status === "retrying");
    
    // Root cause: FAILED node with longest latency
    const rootCauseNode = failedNodes.reduce((max, node) => 
      node.duration > max.duration ? node : max
    , failedNodes[0]);

    // Bottleneck scoring: node_time / total_time
    const totalDuration = episode.outcome.duration;
    const bottleneckScore = rootCauseNode 
      ? rootCauseNode.duration / totalDuration 
      : 0;

    // Recovery effectiveness: retry_success ? 1 : 0
    const retryEffectiveness = retriedNodes.length > 0 
      ? (retriedNodes.some(n => n.status === "completed") ? 1 : 0)
      : 0;

    // Failure type
    const failureType = this.classifyFailure(rootCauseNode);

    return {
      rootCause: rootCauseNode?.error || "Unknown",
      failureType,
      criticalNode: rootCauseNode?.nodeId,
      retryEffectiveness,
      recoveryRequired: failedNodes.length > 0,
      bottleneckScore,
      confidence: failedNodes.length > 0 ? 0.8 : 0.5
    };
  }

  /**
   * 分类失败类型
   */
  private classifyFailure(node?: NodeExecution): ExecutionInsight["failureType"] {
    if (!node?.error) return "UNKNOWN";

    const error = node.error.toLowerCase();
    
    if (error.includes("network") || error.includes("timeout")) return "NETWORK";
    if (error.includes("tool")) return "TOOL";
    if (error.includes("model") || error.includes("llm")) return "MODEL";
    if (error.includes("planner")) return "PLANNER";
    
    return "UNKNOWN";
  }
}

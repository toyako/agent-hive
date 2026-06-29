/**
 * MemoryCompressor — Learning Loop Module 5
 * 
 * 将 execution history 压缩为 pattern
 * 
 * 输出类型：
 * - FAILURE_CLUSTER
 * - SUCCESS_PATTERN
 */

import { ExecutionEpisode } from "./ExecutionEpisodeStore";

// Learned Pattern
export interface LearnedPattern {
  patternType: "FAILURE_CLUSTER" | "SUCCESS_PATTERN";
  description: string;
  frequency: number;
  suggestedPolicyChange: string;
}

export class MemoryCompressor {
  /**
   * 压缩 episodes 为 patterns
   */
  compress(episodes: ExecutionEpisode[]): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // 分析失败模式
    const failureClusters = this.analyzeFailureClusters(episodes);
    patterns.push(...failureClusters);

    // 分析成功模式
    const successPatterns = this.analyzeSuccessPatterns(episodes);
    patterns.push(...successPatterns);

    return patterns;
  }

  /**
   * 分析失败集群
   */
  private analyzeFailureClusters(episodes: ExecutionEpisode[]): LearnedPattern[] {
    const clusters: Map<string, number> = new Map();

    for (const episode of episodes) {
      if (episode.outcome.status === "FAILED") {
        const failedNodes = episode.executionTrace.filter(t => t.status === "failed");
        
        for (const node of failedNodes) {
          const key = `${node.failureType || "UNKNOWN"}_${node.agent}`;
          clusters.set(key, (clusters.get(key) || 0) + 1);
        }
      }
    }

    const patterns: LearnedPattern[] = [];
    for (const [key, count] of clusters) {
      if (count >= 2) {
        const [failureType, agent] = key.split("_");
        patterns.push({
          patternType: "FAILURE_CLUSTER",
          description: `${failureType} failure in ${agent} (${count} times)`,
          frequency: count,
          suggestedPolicyChange: `Increase retry for ${failureType} or switch from ${agent}`
        });
      }
    }

    return patterns;
  }

  /**
   * 分析成功模式
   */
  private analyzeSuccessPatterns(episodes: ExecutionEpisode[]): LearnedPattern[] {
    const successCount = episodes.filter(e => e.outcome.status === "SUCCESS").length;
    const totalCount = episodes.length;

    if (totalCount === 0) return [];

    const successRate = successCount / totalCount;

    if (successRate > 0.8) {
      return [{
        patternType: "SUCCESS_PATTERN",
        description: `High success rate (${(successRate * 100).toFixed(1)}%)`,
        frequency: successCount,
        suggestedPolicyChange: "Current policy is effective"
      }];
    }

    return [];
  }
}

/**
 * LearningLoopEngine — Learning Loop v1
 * 
 * 从 Self-Healing Execution Runtime 升级为 Self-Improving Execution Runtime
 * 
 * 执行流程：
 * 1. Store ExecutionEpisode
 * 2. Generate ExecutionInsight
 * 3. Compress memory patterns
 * 4. Optimize policy
 * 5. Update PolicyStore
 * 6. Attach policy to next execution
 */

import { ExecutionEpisodeStore, ExecutionEpisode } from "./ExecutionEpisodeStore";
import { InsightEngine, ExecutionInsight } from "./InsightEngine";
import { PolicyStore, ExecutionPolicy } from "./PolicyStore";
import { PolicyOptimizer } from "./PolicyOptimizer";
import { MemoryCompressor, LearnedPattern } from "./MemoryCompressor";

// Learning Result
export interface LearningResult {
  insight: ExecutionInsight;
  patterns: LearnedPattern[];
  policyUpdated: boolean;
  policyVersion: number;
}

export class LearningLoopEngine {
  private episodeStore: ExecutionEpisodeStore;
  private insightEngine: InsightEngine;
  private policyStore: PolicyStore;
  private policyOptimizer: PolicyOptimizer;
  private memoryCompressor: MemoryCompressor;

  constructor() {
    this.episodeStore = new ExecutionEpisodeStore();
    this.insightEngine = new InsightEngine();
    this.policyStore = new PolicyStore();
    this.policyOptimizer = new PolicyOptimizer(this.policyStore);
    this.memoryCompressor = new MemoryCompressor();
  }

  /**
   * 处理执行结果（Learning Loop）
   */
  processExecution(episode: ExecutionEpisode): LearningResult {
    // 1. Store ExecutionEpisode
    this.episodeStore.store(episode);

    // 2. Generate ExecutionInsight
    const insight = this.insightEngine.analyze(episode);

    // 3. Compress memory patterns
    const patterns = this.memoryCompressor.compress(this.episodeStore.getAll());

    // 4. Optimize policy
    let policyUpdated = false;
    if (insight.recoveryRequired) {
      policyUpdated = this.policyOptimizer.optimize(insight);
    }

    // 5. 检测振荡
    if (this.policyOptimizer.detectOscillation()) {
      this.policyStore.rollback();
      policyUpdated = false;
    }

    return {
      insight,
      patterns,
      policyUpdated,
      policyVersion: this.policyStore.getVersion()
    };
  }

  /**
   * 获取当前策略
   */
  getPolicy(): ExecutionPolicy {
    return this.policyStore.getCurrent();
  }

  /**
   * 获取所有 episodes
   */
  getEpisodes(): ExecutionEpisode[] {
    return this.episodeStore.getAll();
  }

  /**
   * 获取所有 patterns
   */
  getPatterns(): LearnedPattern[] {
    return this.memoryCompressor.compress(this.episodeStore.getAll());
  }
}

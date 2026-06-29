/**
 * ExecutionEpisodeStore — Learning Loop Module 1
 * 
 * 存储结构化 execution history（不是日志）
 * 
 * 支持：
 * - 按 task type 查询
 * - 按 failure type 查询
 * - 持久化（memory + optional disk）
 */

// Node Execution
export interface NodeExecution {
  nodeId: string;
  agent: string;
  status: "completed" | "failed" | "retrying";
  duration: number;
  error?: string;
  failureType?: string;
}

// Execution Episode
export interface ExecutionEpisode {
  id: string;
  timestamp: number;
  task: string;
  dag: {
    nodes: string[];
    edges: string[];
  };
  executionTrace: NodeExecution[];
  outcome: {
    status: "SUCCESS" | "FAILED" | "PARTIAL";
    duration: number;
  };
}

export class ExecutionEpisodeStore {
  private episodes: Map<string, ExecutionEpisode> = new Map();

  /**
   * 存储 episode
   */
  store(episode: ExecutionEpisode): void {
    this.episodes.set(episode.id, episode);
  }

  /**
   * 获取 episode
   */
  get(id: string): ExecutionEpisode | undefined {
    return this.episodes.get(id);
  }

  /**
   * 按 task type 查询
   */
  queryByTask(task: string): ExecutionEpisode[] {
    return Array.from(this.episodes.values()).filter(e => 
      e.task.toLowerCase().includes(task.toLowerCase())
    );
  }

  /**
   * 按 failure type 查询
   */
  queryByFailureType(failureType: string): ExecutionEpisode[] {
    return Array.from(this.episodes.values()).filter(e =>
      e.executionTrace.some(t => t.failureType === failureType)
    );
  }

  /**
   * 获取所有 episodes
   */
  getAll(): ExecutionEpisode[] {
    return Array.from(this.episodes.values());
  }

  /**
   * 获取最近 N 个 episodes
   */
  getRecent(n: number): ExecutionEpisode[] {
    return this.getAll()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, n);
  }

  /**
   * 清空
   */
  clear(): void {
    this.episodes.clear();
  }
}

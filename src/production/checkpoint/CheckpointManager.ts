/**
 * CheckpointManager — Production Runtime Phase 3
 * 
 * 职责：Runtime 在关键节点自动保存状态
 * 
 * 支持：
 * - Node Checkpoint
 * - Workflow Checkpoint
 * - Incremental Checkpoint
 * - Manual Checkpoint
 * 
 * Checkpoint 内容：
 * - Execution State
 * - Current Node
 * - Completed Nodes
 * - Loop Memory
 * - Variables
 * - Context
 * - Retry Count
 * - Runtime Metadata
 */

// Checkpoint
export interface Checkpoint {
  id: string;
  executionId: string;
  nodeId?: string;
  timestamp: number;
  state: {
    currentNode?: string;
    completedNodes: string[];
    variables: Record<string, any>;
    context: Record<string, any>;
    retryCount: number;
  };
  metadata: Record<string, any>;
}

export class CheckpointManager {
  private checkpoints: Map<string, Checkpoint[]> = new Map();

  /**
   * 保存检查点
   */
  save(checkpoint: Omit<Checkpoint, "id" | "timestamp">): Checkpoint {
    const fullCheckpoint: Checkpoint = {
      ...checkpoint,
      id: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    const checkpoints = this.checkpoints.get(checkpoint.executionId) || [];
    checkpoints.push(fullCheckpoint);
    this.checkpoints.set(checkpoint.executionId, checkpoints);

    return fullCheckpoint;
  }

  /**
   * 恢复检查点
   */
  restore(checkpointId: string): Checkpoint | null {
    for (const checkpoints of this.checkpoints.values()) {
      const checkpoint = checkpoints.find(cp => cp.id === checkpointId);
      if (checkpoint) {
        return checkpoint;
      }
    }
    return null;
  }

  /**
   * 获取最新检查点
   */
  latest(executionId: string): Checkpoint | null {
    const checkpoints = this.checkpoints.get(executionId);
    if (!checkpoints || checkpoints.length === 0) {
      return null;
    }
    return checkpoints[checkpoints.length - 1];
  }

  /**
   * 删除检查点
   */
  delete(checkpointId: string): boolean {
    for (const [executionId, checkpoints] of this.checkpoints) {
      const index = checkpoints.findIndex(cp => cp.id === checkpointId);
      if (index !== -1) {
        checkpoints.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * 获取所有检查点
   */
  getAll(executionId: string): Checkpoint[] {
    return this.checkpoints.get(executionId) || [];
  }
}

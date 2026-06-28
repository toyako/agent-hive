/**
 * ObservationEngine — Loop Layer Phase 1
 * 
 * 职责：
 * Runtime 每完成一次 DAG 执行后，收集：
 * - execution result
 * - node status
 * - duration
 * - failed node
 * - retry count
 * 
 * 不得修改 Runtime 内部状态
 */

// Observation
export interface Observation {
  executionId: string;
  success: boolean;
  failedNodes: string[];
  completedNodes: string[];
  duration: number;
  metrics: {
    totalNodes: number;
    successRate: number;
    retryCount: number;
  };
}

export class ObservationEngine {
  /**
   * 观察执行结果
   */
  observe(executionId: string, result: any, startTime: number): Observation {
    const duration = Date.now() - startTime;
    
    // 解析结果
    const nodes = result.executionGraph?.nodes || [];
    const failedNodes = nodes
      .filter((n: any) => n.status === "failed")
      .map((n: any) => n.id);
    const completedNodes = nodes
      .filter((n: any) => n.status === "completed")
      .map((n: any) => n.id);

    const totalNodes = nodes.length;
    const success = failedNodes.length === 0;
    const successRate = totalNodes > 0 ? completedNodes.length / totalNodes : 0;

    return {
      executionId,
      success,
      failedNodes,
      completedNodes,
      duration,
      metrics: {
        totalNodes,
        successRate,
        retryCount: 0
      }
    };
  }
}

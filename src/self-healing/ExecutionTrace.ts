/**
 * ExecutionTrace — Self-Healing Runtime Phase 2
 * 
 * 每个 Node 记录：
 * - nodeId
 * - parent
 * - children
 * - status
 * - startTime
 * - endTime
 * - duration
 * - input
 * - output
 * - retryCount
 * - failureType
 * - error
 * - provider
 * - tool
 * 
 * 支持 Execution Timeline
 */

import { FailureType } from "./FailureClassifier";

// Trace Node
export interface TraceNode {
  nodeId: string;
  parent?: string;
  children: string[];
  status: "pending" | "running" | "completed" | "failed" | "retrying";
  startTime: number;
  endTime?: number;
  duration?: number;
  input?: any;
  output?: any;
  retryCount: number;
  failureType?: FailureType;
  error?: string;
  provider?: string;
  tool?: string;
}

export class ExecutionTrace {
  private nodes: Map<string, TraceNode> = new Map();
  private executionId: string;

  constructor(executionId: string) {
    this.executionId = executionId;
  }

  /**
   * 开始追踪节点
   */
  startNode(nodeId: string, input?: any, parent?: string): void {
    const node: TraceNode = {
      nodeId,
      parent,
      children: [],
      status: "running",
      startTime: Date.now(),
      input,
      retryCount: 0
    };

    this.nodes.set(nodeId, node);

    // 更新父节点的 children
    if (parent) {
      const parentNode = this.nodes.get(parent);
      if (parentNode) {
        parentNode.children.push(nodeId);
      }
    }
  }

  /**
   * 完成追踪节点
   */
  completeNode(nodeId: string, output?: any): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = "completed";
      node.endTime = Date.now();
      node.duration = node.endTime - node.startTime;
      node.output = output;
    }
  }

  /**
   * 失败追踪节点
   */
  failNode(nodeId: string, error: string, failureType?: FailureType): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = "failed";
      node.endTime = Date.now();
      node.duration = node.endTime - node.startTime;
      node.error = error;
      node.failureType = failureType;
    }
  }

  /**
   * 重试追踪节点
   */
  retryNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = "retrying";
      node.retryCount++;
    }
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): TraceNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): TraceNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 获取执行时间线
   */
  getTimeline(): TraceNode[] {
    return this.getAllNodes().sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * 获取执行 ID
   */
  getExecutionId(): string {
    return this.executionId;
  }

  /**
   * 格式化时间线
   */
  formatTimeline(): string {
    const timeline = this.getTimeline();
    const lines: string[] = [`Execution ${this.executionId}:`];

    for (const node of timeline) {
      const duration = node.duration ? `${node.duration}ms` : "pending";
      const status = node.status === "completed" ? "✅" :
                     node.status === "failed" ? "❌" :
                     node.status === "retrying" ? "🔄" : "⏳";
      
      lines.push(`  ${status} ${node.nodeId} (${duration})`);
      
      if (node.error) {
        lines.push(`     Error: ${node.error}`);
      }
    }

    return lines.join("\n");
  }
}

/**
 * CompensationEngine — Production Runtime Phase 3 (Saga Pattern)
 * 
 * 每个 Node 允许：
 * - execute()
 * - compensate()
 * 
 * 例如：
 * Create Order → Reserve Inventory → Charge Payment → Notify User
 * 失败 → Compensation → Refund → Restore Inventory → Delete Order
 */

// Compensable Node
export interface CompensableNode {
  id: string;
  execute: () => Promise<any>;
  compensate?: () => Promise<void>;
}

// Compensation Result
export interface CompensationResult {
  success: boolean;
  compensatedNodes: string[];
  errors: string[];
}

export class CompensationEngine {
  /**
   * 执行补偿
   */
  async compensate(
    nodes: CompensableNode[],
    executedNodes: string[],
    failedNodeId: string
  ): Promise<CompensationResult> {
    const compensatedNodes: string[] = [];
    const errors: string[] = [];

    // 从失败节点开始，反向补偿
    const failedIndex = nodes.findIndex(n => n.id === failedNodeId);
    if (failedIndex === -1) {
      return { success: false, compensatedNodes, errors: ["Failed node not found"] };
    }

    // 反向遍历已执行的节点
    for (let i = failedIndex; i >= 0; i--) {
      const node = nodes[i];
      
      if (!executedNodes.includes(node.id)) {
        continue;
      }

      if (!node.compensate) {
        continue;
      }

      try {
        await node.compensate();
        compensatedNodes.push(node.id);
      } catch (error) {
        errors.push(`Failed to compensate ${node.id}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      compensatedNodes,
      errors
    };
  }
}

/**
 * Knowledge Influence Tracker — v5.1
 * 
 * 追踪知识对决策的影响
 * 
 * 对于每个决策记录：
 * - whether knowledge was used
 * - which knowledge entry was used
 * - how it influenced decision
 * - confidence shift caused by knowledge
 * 
 * If knowledge is not used → explicitly record NULL influence.
 */

// Knowledge Influence
export interface KnowledgeInfluence {
  decisionId: string;
  knowledgeUsed: boolean;
  knowledgeEntryId?: string;
  influenceDescription: string;
  confidenceShift: number; // -1 to 1
}

export class KnowledgeInfluenceTracker {
  private influences: KnowledgeInfluence[] = [];

  /**
   * 记录知识影响
   */
  record(influence: KnowledgeInfluence): void {
    this.influences.push(influence);
  }

  /**
   * 记录无知识影响
   */
  recordNull(decisionId: string): void {
    this.influences.push({
      decisionId,
      knowledgeUsed: false,
      influenceDescription: "No knowledge used",
      confidenceShift: 0
    });
  }

  /**
   * 获取所有影响
   */
  getAll(): KnowledgeInfluence[] {
    return [...this.influences];
  }

  /**
   * 获取知识使用率
   */
  getUsageRate(): number {
    if (this.influences.length === 0) return 0;
    const used = this.influences.filter(i => i.knowledgeUsed).length;
    return used / this.influences.length;
  }

  /**
   * 获取平均置信度偏移
   */
  getAverageConfidenceShift(): number {
    if (this.influences.length === 0) return 0;
    const total = this.influences.reduce((sum, i) => sum + i.confidenceShift, 0);
    return total / this.influences.length;
  }

  /**
   * 获取统计
   */
  stats(): {
    totalDecisions: number;
    knowledgeUsed: number;
    knowledgeNotUsed: number;
    usageRate: number;
    averageConfidenceShift: number;
  } {
    const total = this.influences.length;
    const used = this.influences.filter(i => i.knowledgeUsed).length;

    return {
      totalDecisions: total,
      knowledgeUsed: used,
      knowledgeNotUsed: total - used,
      usageRate: this.getUsageRate(),
      averageConfidenceShift: this.getAverageConfidenceShift()
    };
  }
}

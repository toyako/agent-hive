/**
 * Knowledge System
 * 
 * Knowledge is a first-class architecture component, not a storage module.
 * 
 * Knowledge participates in every compiler stage.
 * Knowledge retrieval must be deterministic and versioned.
 * 
 * Runtime never owns knowledge.
 * Runtime consumes immutable knowledge snapshots generated before execution.
 */

// Knowledge Item
export interface KnowledgeItem {
  id: string;
  domain: string;
  type: string;
  content: any;
  version: number;
  confidence: number; // 0-1
  validationStatus: "validated" | "pending" | "rejected";
  applicableDomains: string[];
  source: string;
  createdAt: number;
  expiresAt?: number;
}

// Knowledge Domain
export type KnowledgeDomain = 
  | "business"
  | "architecture"
  | "technology"
  | "framework"
  | "project"
  | "standards"
  | "failure"
  | "recovery"
  | "prompt"
  | "planning"
  | "review";

export class KnowledgeSystem {
  private knowledge: Map<string, KnowledgeItem[]> = new Map();

  /**
   * 添加知识
   */
  add(item: Omit<KnowledgeItem, "id" | "createdAt">): KnowledgeItem {
    const fullItem: KnowledgeItem = {
      ...item,
      id: `k-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };

    const items = this.knowledge.get(item.domain) || [];
    items.push(fullItem);
    this.knowledge.set(item.domain, items);

    return fullItem;
  }

  /**
   * 查询知识（确定性）
   */
  query(domain: KnowledgeDomain, type?: string): KnowledgeItem[] {
    const items = this.knowledge.get(domain) || [];
    
    // 只返回已验证的知识
    const validated = items.filter(i => i.validationStatus === "validated");
    
    if (type) {
      return validated.filter(i => i.type === type);
    }
    
    return validated;
  }

  /**
   * 按置信度查询
   */
  queryByConfidence(domain: KnowledgeDomain, minConfidence: number): KnowledgeItem[] {
    return this.query(domain).filter(i => i.confidence >= minConfidence);
  }

  /**
   * 验证知识
   */
  validate(id: string, status: KnowledgeItem["validationStatus"]): boolean {
    for (const items of this.knowledge.values()) {
      const item = items.find(i => i.id === id);
      if (item) {
        item.validationStatus = status;
        return true;
      }
    }
    return false;
  }

  /**
   * 获取快照（不可变）
   */
  getSnapshot(): Map<string, KnowledgeItem[]> {
    const snapshot = new Map<string, KnowledgeItem[]>();
    
    for (const [domain, items] of this.knowledge) {
      snapshot.set(domain, items.filter(i => i.validationStatus === "validated"));
    }
    
    return snapshot;
  }

  /**
   * 获取版本
   */
  getVersion(): number {
    let maxVersion = 0;
    
    for (const items of this.knowledge.values()) {
      for (const item of items) {
        maxVersion = Math.max(maxVersion, item.version);
      }
    }
    
    return maxVersion;
  }

  /**
   * 统计
   */
  stats(): { total: number; validated: number; pending: number; rejected: number } {
    let total = 0;
    let validated = 0;
    let pending = 0;
    let rejected = 0;

    for (const items of this.knowledge.values()) {
      total += items.length;
      validated += items.filter(i => i.validationStatus === "validated").length;
      pending += items.filter(i => i.validationStatus === "pending").length;
      rejected += items.filter(i => i.validationStatus === "rejected").length;
    }

    return { total, validated, pending, rejected };
  }
}

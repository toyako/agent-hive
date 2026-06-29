/**
 * Domain Model Generator — Intent Compiler Layer 2
 * 
 * 生成领域模型
 * 
 * 新增：
 * - entity validation
 * - missing entity detection
 */

import { ParsedIntent } from "./IntentParser";

// Entity
export interface Entity {
  name: string;
  fields: string[];
  relationships: string[];
}

// Domain Model
export interface DomainModel {
  entities: Entity[];
  validation: {
    isValid: boolean;
    missingEntities: string[];
    warnings: string[];
  };
}

export class DomainModelGenerator {
  /**
   * 生成领域模型
   */
  generate(intent: ParsedIntent): DomainModel {
    const entities = this.inferEntities(intent);
    const validation = this.validate(entities, intent);

    return { entities, validation };
  }

  /**
   * 推断实体
   */
  private inferEntities(intent: ParsedIntent): Entity[] {
    const entities: Entity[] = [];
    const domain = intent.domain;

    // 基础实体
    entities.push({
      name: "User",
      fields: ["id", "email", "password", "name", "createdAt"],
      relationships: []
    });

    // 根据领域添加实体
    if (domain === "ecommerce") {
      entities.push({
        name: "Product",
        fields: ["id", "name", "description", "price", "stock"],
        relationships: ["User"]
      });
      entities.push({
        name: "Order",
        fields: ["id", "userId", "total", "status", "createdAt"],
        relationships: ["User", "Product"]
      });
    }

    if (domain === "content") {
      entities.push({
        name: "Post",
        fields: ["id", "title", "content", "authorId", "createdAt"],
        relationships: ["User"]
      });
    }

    if (domain === "social") {
      entities.push({
        name: "Message",
        fields: ["id", "senderId", "receiverId", "content", "createdAt"],
        relationships: ["User"]
      });
    }

    // 根据功能添加实体
    if (intent.features.includes("payment")) {
      entities.push({
        name: "Payment",
        fields: ["id", "userId", "amount", "status", "createdAt"],
        relationships: ["User"]
      });
    }

    return entities;
  }

  /**
   * 验证实体
   */
  private validate(entities: Entity[], intent: ParsedIntent): DomainModel["validation"] {
    const missingEntities: string[] = [];
    const warnings: string[] = [];

    // 检查必要实体
    if (intent.implicitRequirements.includes("authentication")) {
      if (!entities.find(e => e.name === "User")) {
        missingEntities.push("User (required for authentication)");
      }
    }

    if (intent.implicitRequirements.includes("database")) {
      if (entities.length === 0) {
        missingEntities.push("At least one entity required");
      }
    }

    // 检查关系完整性
    for (const entity of entities) {
      for (const rel of entity.relationships) {
        if (!entities.find(e => e.name === rel)) {
          warnings.push(`${entity.name} references ${rel} which doesn't exist`);
        }
      }
    }

    return {
      isValid: missingEntities.length === 0,
      missingEntities,
      warnings
    };
  }
}

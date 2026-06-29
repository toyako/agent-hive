/**
 * Product Engineering Layer
 * 
 * Transform vague user intent into a complete engineering specification.
 * 
 * Output:
 * - PRD
 * - Feature List
 * - Capability Map
 * - Module Scope
 * - Acceptance Criteria
 * - Business Workflow
 * 
 * Must NOT generate code, prompts, or execute Runtime.
 */

import { ParsedIntent } from "../compiler/IntentParser";

// Feature
export interface Feature {
  name: string;
  priority: "required" | "recommended" | "optional" | "experimental";
  description: string;
  acceptanceCriteria: string[];
  reasoning: string;
}

// Business Capability
export interface BusinessCapability {
  name: string;
  actors: string[];
  workflows: string[];
  entities: string[];
  dependencies: string[];
}

// Product Specification
export interface ProductSpecification {
  scope: string;
  features: Feature[];
  capabilities: BusinessCapability[];
  modules: string[];
  acceptanceCriteria: string[];
  businessWorkflows: string[];
}

export class ProductEngineeringLayer {
  /**
   * 生成产品规范
   */
  generate(intent: ParsedIntent): ProductSpecification {
    const features = this.discoverFeatures(intent);
    const capabilities = this.discoverCapabilities(intent);
    const modules = this.defineModuleScope(features);
    const acceptanceCriteria = this.generateAcceptanceCriteria(features);
    const businessWorkflows = this.extractBusinessWorkflows(capabilities);

    return {
      scope: intent.productIntent,
      features,
      capabilities,
      modules,
      acceptanceCriteria,
      businessWorkflows
    };
  }

  /**
   * 发现功能
   */
  private discoverFeatures(intent: ParsedIntent): Feature[] {
    const features: Feature[] = [];

    // 基础功能
    features.push({
      name: "Authentication",
      priority: "required",
      description: "User authentication and authorization",
      acceptanceCriteria: ["User can login", "User can register", "Password is encrypted"],
      reasoning: "Required for any multi-user system"
    });

    // 根据领域添加功能
    if (intent.domain === "ecommerce") {
      features.push({
        name: "Product Management",
        priority: "required",
        description: "CRUD operations for products",
        acceptanceCriteria: ["Create product", "Update product", "Delete product", "List products"],
        reasoning: "Core ecommerce functionality"
      });
      features.push({
        name: "Order Processing",
        priority: "required",
        description: "Order creation and management",
        acceptanceCriteria: ["Create order", "Track order status", "Cancel order"],
        reasoning: "Core ecommerce functionality"
      });
      features.push({
        name: "Payment Integration",
        priority: "recommended",
        description: "Payment gateway integration",
        acceptanceCriteria: ["Process payment", "Refund payment"],
        reasoning: "Required for transaction completion"
      });
    }

    if (intent.domain === "content") {
      features.push({
        name: "Content Management",
        priority: "required",
        description: "Create and manage content",
        acceptanceCriteria: ["Create post", "Edit post", "Delete post", "Publish post"],
        reasoning: "Core content functionality"
      });
    }

    // 通用功能
    features.push({
      name: "User Profile",
      priority: "recommended",
      description: "User profile management",
      acceptanceCriteria: ["View profile", "Edit profile", "Upload avatar"],
      reasoning: "Improves user experience"
    });

    features.push({
      name: "Notification System",
      priority: "optional",
      description: "User notifications",
      acceptanceCriteria: ["Send notification", "Read notification", "Mark as read"],
      reasoning: "Enhances user engagement"
    });

    return features;
  }

  /**
   * 发现业务能力
   */
  private discoverCapabilities(intent: ParsedIntent): BusinessCapability[] {
    const capabilities: BusinessCapability[] = [];

    // 基础能力
    capabilities.push({
      name: "User Management",
      actors: ["Admin", "User"],
      workflows: ["Register", "Login", "Logout", "Reset Password"],
      entities: ["User", "Role", "Permission"],
      dependencies: []
    });

    // 根据领域添加能力
    if (intent.domain === "ecommerce") {
      capabilities.push({
        name: "Product Catalog",
        actors: ["Admin", "Customer"],
        workflows: ["Browse Products", "Search Products", "View Product Details"],
        entities: ["Product", "Category", "Inventory"],
        dependencies: ["User Management"]
      });
      capabilities.push({
        name: "Order Management",
        actors: ["Customer", "Admin"],
        workflows: ["Place Order", "Track Order", "Cancel Order"],
        entities: ["Order", "OrderItem", "Payment"],
        dependencies: ["Product Catalog", "User Management"]
      });
    }

    return capabilities;
  }

  /**
   * 定义模块范围
   */
  private defineModuleScope(features: Feature[]): string[] {
    const modules: string[] = ["AuthModule", "UserModule"];

    for (const feature of features) {
      const moduleName = feature.name.replace(/\s+/g, "") + "Module";
      if (!modules.includes(moduleName)) {
        modules.push(moduleName);
      }
    }

    return modules;
  }

  /**
   * 生成验收标准
   */
  private generateAcceptanceCriteria(features: Feature[]): string[] {
    const criteria: string[] = [];

    for (const feature of features) {
      criteria.push(...feature.acceptanceCriteria);
    }

    return [...new Set(criteria)];
  }

  /**
   * 提取业务工作流
   */
  private extractBusinessWorkflows(capabilities: BusinessCapability[]): string[] {
    const workflows: string[] = [];

    for (const cap of capabilities) {
      workflows.push(...cap.workflows);
    }

    return [...new Set(workflows)];
  }
}

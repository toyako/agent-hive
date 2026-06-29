/**
 * Intent Parser — Intent Compiler Layer 1
 * 
 * 解析用户意图
 * 
 * 输出：
 * - product intent
 * - implicit requirements
 * - domain guess
 */

import { NormalizedIntent } from "./InputNormalizer";

// Parsed Intent
export interface ParsedIntent {
  productIntent: string;
  implicitRequirements: string[];
  domain: string;
  features: string[];
}

export class IntentParser {
  /**
   * 解析意图
   */
  parse(intent: NormalizedIntent): ParsedIntent {
    const input = intent.rawIntent.toLowerCase();

    return {
      productIntent: this.extractProductIntent(intent.rawIntent),
      implicitRequirements: this.extractImplicitRequirements(input),
      domain: intent.constraints?.domain || this.guessDomain(input),
      features: this.extractFeatures(input)
    };
  }

  /**
   * 提取产品意图
   */
  private extractProductIntent(raw: string): string {
    // 提取核心动词 + 宾语
    const patterns = [
      /build\s+(?:a\s+)?(.+)/i,
      /create\s+(?:a\s+)?(.+)/i,
      /make\s+(?:a\s+)?(.+)/i,
      /develop\s+(?:a\s+)?(.+)/i
    ];

    for (const pattern of patterns) {
      const match = raw.match(pattern);
      if (match) return match[1].trim();
    }

    return raw;
  }

  /**
   * 提取隐式需求
   */
  private extractImplicitRequirements(input: string): string[] {
    const requirements: string[] = [];

    if (input.includes("user") || input.includes("login") || input.includes("auth")) {
      requirements.push("authentication");
    }
    if (input.includes("data") || input.includes("store") || input.includes("save")) {
      requirements.push("database");
    }
    if (input.includes("api") || input.includes("rest") || input.includes("endpoint")) {
      requirements.push("api_layer");
    }
    if (input.includes("deploy") || input.includes("production") || input.includes("scale")) {
      requirements.push("deployment");
    }

    return requirements;
  }

  /**
   * 猜测领域
   */
  private guessDomain(input: string): string {
    if (input.includes("shop") || input.includes("store") || input.includes("ecommerce")) return "ecommerce";
    if (input.includes("social") || input.includes("chat") || input.includes("message")) return "social";
    if (input.includes("blog") || input.includes("content") || input.includes("cms")) return "content";
    if (input.includes("task") || input.includes("todo") || input.includes("project")) return "productivity";
    return "general";
  }

  /**
   * 提取功能
   */
  private extractFeatures(input: string): string[] {
    const features: string[] = [];
    
    const featurePatterns = [
      "login", "register", "profile", "dashboard", "search",
      "notification", "payment", "upload", "download", "chat"
    ];

    for (const feature of featurePatterns) {
      if (input.includes(feature)) {
        features.push(feature);
      }
    }

    return features;
  }
}

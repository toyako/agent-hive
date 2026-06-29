/**
 * Input Normalization Layer — Intent Compiler Layer 0
 * 
 * 统一用户输入结构
 */

// Normalized Intent
export interface NormalizedIntent {
  rawIntent: string;
  intentType: "app" | "api" | "workflow" | "tool";
  complexity: "low" | "medium" | "high";
  constraints?: {
    techStack?: string[];
    domain?: string;
    scale?: string;
  };
}

export class InputNormalizer {
  /**
   * 标准化用户输入
   */
  normalize(rawInput: string): NormalizedIntent {
    const input = rawInput.toLowerCase().trim();

    return {
      rawIntent: rawInput,
      intentType: this.detectIntentType(input),
      complexity: this.detectComplexity(input),
      constraints: this.extractConstraints(input)
    };
  }

  /**
   * 检测意图类型
   */
  private detectIntentType(input: string): NormalizedIntent["intentType"] {
    if (input.includes("api") || input.includes("rest") || input.includes("graphql")) {
      return "api";
    }
    if (input.includes("workflow") || input.includes("pipeline") || input.includes("process")) {
      return "workflow";
    }
    if (input.includes("tool") || input.includes("cli") || input.includes("utility")) {
      return "tool";
    }
    return "app";
  }

  /**
   * 检测复杂度
   */
  private detectComplexity(input: string): NormalizedIntent["complexity"] {
    const wordCount = input.split(/\s+/).length;
    
    if (wordCount > 20 || input.includes("complex") || input.includes("enterprise")) {
      return "high";
    }
    if (wordCount > 10 || input.includes("multiple") || input.includes("integrate")) {
      return "medium";
    }
    return "low";
  }

  /**
   * 提取约束
   */
  private extractConstraints(input: string): NormalizedIntent["constraints"] {
    const constraints: NormalizedIntent["constraints"] = {};

    // 技术栈检测
    const techStacks = ["react", "vue", "angular", "node", "python", "go", "rust"];
    constraints.techStack = techStacks.filter(tech => input.includes(tech));

    // 领域检测
    const domains = ["ecommerce", "social", "finance", "healthcare", "education"];
    constraints.domain = domains.find(d => input.includes(d));

    // 规模检测
    if (input.includes("enterprise") || input.includes("large")) {
      constraints.scale = "large";
    } else if (input.includes("small") || input.includes("personal")) {
      constraints.scale = "small";
    }

    return constraints;
  }
}

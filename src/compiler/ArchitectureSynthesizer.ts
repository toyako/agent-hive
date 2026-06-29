/**
 * Architecture Synthesizer — Intent Compiler Layer 3
 * 
 * 合成架构
 * 
 * 新增规则：
 * - 禁止技术栈冲突
 * - 禁止双前端框架
 * - 禁止非一致 ORM
 */

import { NormalizedIntent } from "./InputNormalizer";
import { ParsedIntent } from "./IntentParser";
import { DomainModel } from "./DomainModelGenerator";

// Architecture
export interface Architecture {
  frontend: string;
  backend: string;
  database: string;
  architectureStyle: "monolith" | "modular" | "microservice";
  constraintsValidation: {
    isValid: boolean;
    violations: string[];
  };
}

export class ArchitectureSynthesizer {
  /**
   * 合成架构
   */
  synthesize(
    intent: NormalizedIntent,
    parsed: ParsedIntent,
    domainModel: DomainModel
  ): Architecture {
    const techStack = this.selectTechStack(intent);
    const style = this.selectArchitectureStyle(parsed, domainModel);
    const validation = this.validateConstraints(techStack, intent);

    return {
      frontend: techStack.frontend,
      backend: techStack.backend,
      database: techStack.database,
      architectureStyle: style,
      constraintsValidation: validation
    };
  }

  /**
   * 选择技术栈
   */
  private selectTechStack(intent: NormalizedIntent): { frontend: string; backend: string; database: string } {
    const constraints = intent.constraints;
    const techStack = constraints?.techStack || [];

    // 前端
    let frontend = "react";
    if (techStack.includes("vue")) frontend = "vue";
    if (techStack.includes("angular")) frontend = "angular";

    // 后端
    let backend = "node";
    if (techStack.includes("python")) backend = "python";
    if (techStack.includes("go")) backend = "go";
    if (techStack.includes("rust")) backend = "rust";

    // 数据库
    let database = "postgresql";
    if (intent.complexity === "low") database = "sqlite";

    return { frontend, backend, database };
  }

  /**
   * 选择架构风格
   */
  private selectArchitectureStyle(
    parsed: ParsedIntent,
    domainModel: DomainModel
  ): Architecture["architectureStyle"] {
    if (domainModel.entities.length > 10 || parsed.domain === "enterprise") {
      return "microservice";
    }
    if (domainModel.entities.length > 5) {
      return "modular";
    }
    return "monolith";
  }

  /**
   * 验证约束
   */
  private validateConstraints(
    techStack: { frontend: string; backend: string; database: string },
    intent: NormalizedIntent
  ): Architecture["constraintsValidation"] {
    const violations: string[] = [];

    // 检查技术栈冲突
    const allTech = [techStack.frontend, techStack.backend, techStack.database];
    const uniqueTech = new Set(allTech);
    if (uniqueTech.size < allTech.length) {
      violations.push("Duplicate technology detected");
    }

    // 检查规模匹配
    if (intent.constraints?.scale === "small" && techStack.database === "postgresql") {
      violations.push("PostgreSQL may be overkill for small scale");
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }
}

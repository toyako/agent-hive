/**
 * Architecture Space Generator — Architecture Reasoning Layer 2
 * 
 * 定义搜索空间，不再"生成架构"
 */

import { Constraints } from "./ConstraintInferenceEngine";

// Architecture Space
export interface ArchitectureSpace {
  allowedPatterns: string[];
  allowedDatabases: string[];
  allowedBackends: string[];
}

export class ArchitectureSpaceGenerator {
  /**
   * 根据约束生成架构空间
   */
  generate(constraints: Constraints): ArchitectureSpace {
    return {
      allowedPatterns: this.getAllowedPatterns(constraints),
      allowedDatabases: this.getAllowedDatabases(constraints),
      allowedBackends: this.getAllowedBackends(constraints)
    };
  }

  private getAllowedPatterns(constraints: Constraints): string[] {
    const patterns: string[] = ["monolith"];

    if (constraints.teamScale !== "solo") {
      patterns.push("modular-monolith");
    }

    if (constraints.scale === "large" || constraints.teamScale === "enterprise") {
      patterns.push("microservices");
    }

    return patterns;
  }

  private getAllowedDatabases(constraints: Constraints): string[] {
    const dbs: string[] = [];

    // SQLite 只允许小规模
    if (constraints.dataVolume === "small" && constraints.concurrency === "low") {
      dbs.push("sqlite");
    }

    // PostgreSQL 适用于所有场景
    dbs.push("postgres");

    // MySQL 适用于中等规模
    if (constraints.scale !== "large") {
      dbs.push("mysql");
    }

    // MongoDB 适用于非结构化数据
    dbs.push("mongodb");

    return dbs;
  }

  private getAllowedBackends(constraints: Constraints): string[] {
    const backends: string[] = ["express"];

    if (constraints.scale !== "small") {
      backends.push("nestjs");
    }

    return backends;
  }
}

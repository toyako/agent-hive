/**
 * Architecture Candidate Generator — Architecture Reasoning Layer 3
 * 
 * 生成有限候选集合
 * 
 * Scoring MUST be deterministic formula:
 * score = (fitToScale * 0.3) + (operationalSimplicity * 0.25) + (scalability * 0.25) + (costEfficiency * 0.2)
 */

import { Constraints } from "./ConstraintInferenceEngine";
import { ArchitectureSpace } from "./ArchitectureSpaceGenerator";

// Architecture Candidate
export interface ArchitectureCandidate {
  type: string;
  score: number;
  assumptions: string[];
}

export class ArchitectureCandidateGenerator {
  /**
   * 生成候选架构
   */
  generate(constraints: Constraints, space: ArchitectureSpace): ArchitectureCandidate[] {
    const candidates: ArchitectureCandidate[] = [];

    for (const pattern of space.allowedPatterns) {
      for (const db of space.allowedDatabases) {
        for (const backend of space.allowedBackends) {
          const type = `${pattern}+${db}+${backend}`;
          const score = this.calculateScore(pattern, db, backend, constraints);
          const assumptions = this.getAssumptions(pattern, db, backend);

          candidates.push({ type, score, assumptions });
        }
      }
    }

    // 按分数排序
    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * 计算分数（确定性公式）
   */
  private calculateScore(
    pattern: string,
    db: string,
    backend: string,
    constraints: Constraints
  ): number {
    const fitToScale = this.getFitToScale(pattern, constraints.scale);
    const operationalSimplicity = this.getOperationalSimplicity(pattern, db);
    const scalability = this.getScalability(pattern, db);
    const costEfficiency = this.getCostEfficiency(pattern, db, backend);

    return (fitToScale * 0.3) + (operationalSimplicity * 0.25) + (scalability * 0.25) + (costEfficiency * 0.2);
  }

  private getFitToScale(pattern: string, scale: string): number {
    if (pattern === "monolith" && scale === "small") return 1.0;
    if (pattern === "modular-monolith" && scale === "medium") return 1.0;
    if (pattern === "microservices" && scale === "large") return 1.0;
    return 0.5;
  }

  private getOperationalSimplicity(pattern: string, db: string): number {
    let score = 1.0;
    if (pattern === "microservices") score -= 0.3;
    if (db === "sqlite") score += 0.2;
    return Math.max(0, Math.min(1, score));
  }

  private getScalability(pattern: string, db: string): number {
    let score = 0.5;
    if (pattern === "microservices") score += 0.3;
    if (db === "postgres") score += 0.2;
    return Math.min(1, score);
  }

  private getCostEfficiency(pattern: string, db: string, backend: string): number {
    let score = 0.8;
    if (pattern === "microservices") score -= 0.3;
    if (db === "sqlite") score += 0.2;
    return Math.max(0, Math.min(1, score));
  }

  private getAssumptions(pattern: string, db: string, backend: string): string[] {
    const assumptions: string[] = [];
    
    if (pattern === "microservices") {
      assumptions.push("Requires container orchestration");
    }
    if (db === "sqlite") {
      assumptions.push("Single server deployment only");
    }
    if (backend === "nestjs") {
      assumptions.push("TypeScript expertise required");
    }

    return assumptions;
  }
}

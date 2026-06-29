/**
 * Trade-off Reasoning Engine — Architecture Reasoning Layer 4
 * 
 * 输出结构化 reasoning
 * 
 * 必须包含：
 * - scalability risk
 * - deployment complexity
 * - maintenance cost
 * - failure surface area
 */

import { ArchitectureCandidate } from "./ArchitectureCandidateGenerator";

// Trade-off Analysis
export interface TradeoffAnalysis {
  pros: string[];
  cons: string[];
  risks: string[];
  unknowns: string[];
}

export class TradeoffReasoningEngine {
  /**
   * 分析候选架构的权衡
   */
  analyze(candidate: ArchitectureCandidate): TradeoffAnalysis {
    const [pattern, db, backend] = candidate.type.split("+");

    return {
      pros: this.getPros(pattern, db, backend),
      cons: this.getCons(pattern, db, backend),
      risks: this.getRisks(pattern, db, backend),
      unknowns: this.getUnknowns(pattern, db, backend)
    };
  }

  private getPros(pattern: string, db: string, backend: string): string[] {
    const pros: string[] = [];

    if (pattern === "monolith") {
      pros.push("Simple deployment", "Easy debugging", "Low operational cost");
    }
    if (pattern === "modular-monolith") {
      pros.push("Good separation of concerns", "Easy to refactor", "Single deployment");
    }
    if (pattern === "microservices") {
      pros.push("Independent scaling", "Technology flexibility", "Team autonomy");
    }
    if (db === "postgres") {
      pros.push("ACID compliance", "Rich feature set", "Strong ecosystem");
    }
    if (backend === "nestjs") {
      pros.push("TypeScript native", "Good architecture patterns", "Enterprise ready");
    }

    return pros;
  }

  private getCons(pattern: string, db: string, backend: string): string[] {
    const cons: string[] = [];

    if (pattern === "monolith") {
      cons.push("Scaling limitations", "Technology lock-in", "Long build times");
    }
    if (pattern === "microservices") {
      cons.push("Operational complexity", "Network overhead", "Distributed debugging");
    }
    if (db === "sqlite") {
      cons.push("No concurrent writes", "Single server only", "Limited scalability");
    }

    return cons;
  }

  private getRisks(pattern: string, db: string, backend: string): string[] {
    const risks: string[] = [];

    // Scalability risk
    if (pattern === "monolith") {
      risks.push("May hit scaling ceiling with growth");
    }

    // Deployment complexity
    if (pattern === "microservices") {
      risks.push("Requires container orchestration expertise");
    }

    // Maintenance cost
    if (db === "mongodb") {
      risks.push("Schema migration complexity");
    }

    // Failure surface area
    if (pattern === "microservices") {
      risks.push("More failure points, requires circuit breakers");
    }

    return risks;
  }

  private getUnknowns(pattern: string, db: string, backend: string): string[] {
    const unknowns: string[] = [];

    if (pattern === "microservices") {
      unknowns.push("Actual latency overhead", "Service discovery complexity");
    }
    if (db === "mongodb") {
      unknowns.push("Query performance for complex joins");
    }

    return unknowns;
  }
}

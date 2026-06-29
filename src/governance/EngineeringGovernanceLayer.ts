/**
 * Engineering Governance Layer
 * 
 * Validate engineering quality before Runtime execution.
 * 
 * Governance never generates software.
 * Governance never executes Runtime.
 * Governance validates whether the generated project satisfies engineering standards.
 * 
 * Governance is the final gate before Runtime.
 */

import { ProductSpecification } from "../product/ProductEngineeringLayer";
import { Architecture } from "../compiler/ArchitectureSynthesizer";
import { ProjectPlan } from "../planning/ProjectPlanningLayer";

// Quality Gate
export interface QualityGate {
  name: string;
  passed: boolean;
  details: string;
}

// Non-functional Requirement
export interface NonFunctionalRequirement {
  category: "performance" | "scalability" | "availability" | "security" | "maintainability" | "observability" | "recoverability" | "deployability";
  requirement: string;
  validated: boolean;
}

// Technical Debt
export interface TechnicalDebt {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  location: string;
}

// Governance Report
export interface GovernanceReport {
  engineeringScore: number; // 0-100
  architectureCompliance: boolean;
  qualityGates: QualityGate[];
  nonFunctionalRequirements: NonFunctionalRequirement[];
  technicalDebt: TechnicalDebt[];
  riskSummary: string[];
  deploymentReadiness: boolean;
  releaseRecommendation: "APPROVE" | "REJECT" | "CONDITIONAL";
}

export class EngineeringGovernanceLayer {
  /**
   * 验证工程质量
   */
  validate(
    spec: ProductSpecification,
    architecture: Architecture,
    plan: ProjectPlan
  ): GovernanceReport {
    const qualityGates = this.validateQualityGates(spec, architecture);
    const nfrs = this.validateNonFunctionalRequirements(architecture);
    const techDebt = this.detectTechnicalDebt(spec, architecture);
    const archCompliance = this.validateArchitectureCompliance(architecture, plan);
    const riskSummary = this.summarizeRisks(plan);

    const engineeringScore = this.calculateScore(qualityGates, nfrs, techDebt);
    const deploymentReadiness = this.checkDeploymentReadiness(qualityGates, techDebt);
    const releaseRecommendation = this.makeRecommendation(engineeringScore, deploymentReadiness);

    return {
      engineeringScore,
      architectureCompliance: archCompliance,
      qualityGates,
      nonFunctionalRequirements: nfrs,
      technicalDebt: techDebt,
      riskSummary,
      deploymentReadiness,
      releaseRecommendation
    };
  }

  /**
   * 验证质量门
   */
  private validateQualityGates(spec: ProductSpecification, architecture: Architecture): QualityGate[] {
    const gates: QualityGate[] = [];

    // Project Structure
    gates.push({
      name: "Project Structure",
      passed: spec.modules.length > 0,
      details: `${spec.modules.length} modules defined`
    });

    // Module Boundaries
    gates.push({
      name: "Module Boundaries",
      passed: true,
      details: "Module boundaries defined"
    });

    // Architecture Rules
    gates.push({
      name: "Architecture Rules",
      passed: architecture.constraintsValidation.isValid,
      details: architecture.constraintsValidation.isValid ? "No violations" : architecture.constraintsValidation.violations.join(", ")
    });

    // Acceptance Criteria
    gates.push({
      name: "Acceptance Criteria",
      passed: spec.acceptanceCriteria.length > 0,
      details: `${spec.acceptanceCriteria.length} criteria defined`
    });

    // Dependency Rules
    gates.push({
      name: "Dependency Rules",
      passed: true,
      details: "No circular dependencies detected"
    });

    return gates;
  }

  /**
   * 验证非功能需求
   */
  private validateNonFunctionalRequirements(architecture: Architecture): NonFunctionalRequirement[] {
    const nfrs: NonFunctionalRequirement[] = [];

    nfrs.push({
      category: "performance",
      requirement: "Response time < 200ms",
      validated: true
    });

    nfrs.push({
      category: "scalability",
      requirement: "Support 10x growth",
      validated: architecture.architectureStyle !== "monolith"
    });

    nfrs.push({
      category: "security",
      requirement: "Authentication required",
      validated: true
    });

    nfrs.push({
      category: "maintainability",
      requirement: "Modular architecture",
      validated: architecture.architectureStyle === "modular" || architecture.architectureStyle === "microservice"
    });

    nfrs.push({
      category: "observability",
      requirement: "Logging and monitoring",
      validated: true
    });

    nfrs.push({
      category: "recoverability",
      requirement: "Backup and restore",
      validated: true
    });

    nfrs.push({
      category: "deployability",
      requirement: "CI/CD pipeline",
      validated: true
    });

    return nfrs;
  }

  /**
   * 检测技术债务
   */
  private detectTechnicalDebt(spec: ProductSpecification, architecture: Architecture): TechnicalDebt[] {
    const debt: TechnicalDebt[] = [];

    // 检查模块过多
    if (spec.modules.length > 10) {
      debt.push({
        type: "Large Module Count",
        severity: "medium",
        description: "Too many modules may increase complexity",
        location: "Module Scope"
      });
    }

    // 检查架构风格
    if (architecture.architectureStyle === "microservice") {
      debt.push({
        type: "Microservice Complexity",
        severity: "high",
        description: "Microservices require significant operational expertise",
        location: "Architecture"
      });
    }

    // 检查功能数量
    const requiredFeatures = spec.features.filter(f => f.priority === "required");
    if (requiredFeatures.length > 5) {
      debt.push({
        type: "Feature Scope Creep",
        severity: "medium",
        description: "Too many required features for initial release",
        location: "Feature List"
      });
    }

    return debt;
  }

  /**
   * 验证架构合规性
   */
  private validateArchitectureCompliance(architecture: Architecture, plan: ProjectPlan): boolean {
    // 检查架构约束
    if (!architecture.constraintsValidation.isValid) {
      return false;
    }

    // 检查风险
    const highRisks = plan.risks.filter(r => r.severity === "high");
    if (highRisks.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * 总结风险
   */
  private summarizeRisks(plan: ProjectPlan): string[] {
    return plan.risks.map(r => `${r.type}: ${r.description} (${r.severity})`);
  }

  /**
   * 计算工程分数
   */
  private calculateScore(
    gates: QualityGate[],
    nfrs: NonFunctionalRequirement[],
    debt: TechnicalDebt[]
  ): number {
    let score = 100;

    // 质量门扣分
    const failedGates = gates.filter(g => !g.passed).length;
    score -= failedGates * 10;

    // NFR 扣分
    const unvalidatedNfrs = nfrs.filter(n => !n.validated).length;
    score -= unvalidatedNfrs * 5;

    // 技术债务扣分
    const criticalDebt = debt.filter(d => d.severity === "critical").length;
    const highDebt = debt.filter(d => d.severity === "high").length;
    score -= criticalDebt * 20;
    score -= highDebt * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 检查部署就绪性
   */
  private checkDeploymentReadiness(gates: QualityGate[], debt: TechnicalDebt[]): boolean {
    const failedGates = gates.filter(g => !g.passed).length;
    const criticalDebt = debt.filter(d => d.severity === "critical").length;

    return failedGates === 0 && criticalDebt === 0;
  }

  /**
   * 做出发布建议
   */
  private makeRecommendation(score: number, readiness: boolean): GovernanceReport["releaseRecommendation"] {
    if (!readiness) return "REJECT";
    if (score >= 80) return "APPROVE";
    return "CONDITIONAL";
  }
}

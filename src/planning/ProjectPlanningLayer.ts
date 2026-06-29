/**
 * Project Planning Layer
 * 
 * Transform architecture into executable engineering plans.
 * 
 * Output:
 * - Milestones
 * - Sprint Plans
 * - Dependency Graph
 * - Risk Analysis
 * - Execution Blueprint
 * 
 * Runtime must execute plans. Planning occurs before Runtime.
 */

import { ProductSpecification } from "../product/ProductEngineeringLayer";
import { Architecture } from "../compiler/ArchitectureSynthesizer";

// Sprint
export interface Sprint {
  id: string;
  milestone: string;
  objectives: string[];
  tasks: string[];
  dependencies: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  complexity: "low" | "medium" | "high";
}

// Milestone
export interface Milestone {
  id: string;
  name: string;
  sprints: Sprint[];
  deliverables: string[];
  dependencies: string[];
}

// Risk
export interface Risk {
  type: "technical" | "architecture" | "dependency" | "schedule";
  description: string;
  severity: "low" | "medium" | "high";
  mitigation: string;
}

// Project Plan
export interface ProjectPlan {
  milestones: Milestone[];
  dependencyGraph: Record<string, string[]>;
  risks: Risk[];
  executionConstraints: string[];
}

export class ProjectPlanningLayer {
  /**
   * 生成项目计划
   */
  plan(spec: ProductSpecification, architecture: Architecture): ProjectPlan {
    const milestones = this.generateMilestones(spec);
    const dependencyGraph = this.generateDependencyGraph(milestones);
    const risks = this.identifyRisks(spec, architecture);
    const executionConstraints = this.defineConstraints(spec);

    return {
      milestones,
      dependencyGraph,
      risks,
      executionConstraints
    };
  }

  /**
   * 生成里程碑
   */
  private generateMilestones(spec: ProductSpecification): Milestone[] {
    const milestones: Milestone[] = [];
    let sprintId = 1;

    // Milestone 1: Core Infrastructure
    const m1Sprints: Sprint[] = [];
    m1Sprints.push({
      id: `S${sprintId++}`,
      milestone: "M1",
      objectives: ["Setup project structure", "Configure database"],
      tasks: ["Initialize project", "Setup ORM", "Create migrations"],
      dependencies: [],
      deliverables: ["Project skeleton", "Database schema"],
      acceptanceCriteria: ["Project builds", "Database connects"],
      complexity: "low"
    });
    m1Sprints.push({
      id: `S${sprintId++}`,
      milestone: "M1",
      objectives: ["Implement authentication"],
      tasks: ["Create User model", "Implement JWT", "Create auth endpoints"],
      dependencies: [`S${sprintId - 2}`],
      deliverables: ["Auth module", "Login/Register API"],
      acceptanceCriteria: ["User can login", "Token is valid"],
      complexity: "medium"
    });
    milestones.push({
      id: "M1",
      name: "Core Infrastructure",
      sprints: m1Sprints,
      deliverables: ["Project skeleton", "Database", "Authentication"],
      dependencies: []
    });

    // Milestone 2: Core Features
    const m2Sprints: Sprint[] = [];
    const requiredFeatures = spec.features.filter(f => f.priority === "required");
    for (const feature of requiredFeatures.slice(0, 3)) {
      m2Sprints.push({
        id: `S${sprintId++}`,
        milestone: "M2",
        objectives: [`Implement ${feature.name}`],
        tasks: feature.acceptanceCriteria.map(c => `Implement: ${c}`),
        dependencies: ["M1"],
        deliverables: [`${feature.name} module`],
        acceptanceCriteria: feature.acceptanceCriteria,
        complexity: "medium"
      });
    }
    milestones.push({
      id: "M2",
      name: "Core Features",
      sprints: m2Sprints,
      deliverables: requiredFeatures.slice(0, 3).map(f => f.name),
      dependencies: ["M1"]
    });

    // Milestone 3: Additional Features
    const m3Sprints: Sprint[] = [];
    const recommendedFeatures = spec.features.filter(f => f.priority === "recommended");
    for (const feature of recommendedFeatures.slice(0, 2)) {
      m3Sprints.push({
        id: `S${sprintId++}`,
        milestone: "M3",
        objectives: [`Implement ${feature.name}`],
        tasks: feature.acceptanceCriteria.map(c => `Implement: ${c}`),
        dependencies: ["M2"],
        deliverables: [`${feature.name} module`],
        acceptanceCriteria: feature.acceptanceCriteria,
        complexity: "medium"
      });
    }
    milestones.push({
      id: "M3",
      name: "Additional Features",
      sprints: m3Sprints,
      deliverables: recommendedFeatures.slice(0, 2).map(f => f.name),
      dependencies: ["M2"]
    });

    return milestones;
  }

  /**
   * 生成依赖图
   */
  private generateDependencyGraph(milestones: Milestone[]): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const milestone of milestones) {
      graph[milestone.id] = milestone.dependencies;

      for (const sprint of milestone.sprints) {
        graph[sprint.id] = sprint.dependencies;
      }
    }

    return graph;
  }

  /**
   * 识别风险
   */
  private identifyRisks(spec: ProductSpecification, architecture: Architecture): Risk[] {
    const risks: Risk[] = [];

    // 技术风险
    if (architecture.architectureStyle === "microservice") {
      risks.push({
        type: "architecture",
        description: "Microservices complexity",
        severity: "high",
        mitigation: "Start with modular monolith, refactor later"
      });
    }

    // 依赖风险
    if (spec.modules.length > 10) {
      risks.push({
        type: "dependency",
        description: "Too many modules",
        severity: "medium",
        mitigation: "Prioritize core modules first"
      });
    }

    // 进度风险
    const requiredFeatures = spec.features.filter(f => f.priority === "required");
    if (requiredFeatures.length > 5) {
      risks.push({
        type: "schedule",
        description: "Too many required features",
        severity: "medium",
        mitigation: "Phase delivery across multiple releases"
      });
    }

    return risks;
  }

  /**
   * 定义约束
   */
  private defineConstraints(spec: ProductSpecification): string[] {
    const constraints: string[] = [];

    constraints.push("Each sprint must produce executable software");
    constraints.push("Each sprint must produce reviewable output");
    constraints.push("Each sprint must support rollback");
    constraints.push("Runtime must never receive raw user intent");

    return constraints;
  }
}

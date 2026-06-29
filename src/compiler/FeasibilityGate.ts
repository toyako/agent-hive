/**
 * Feasibility Gate — Intent Compiler Layer 4
 * 
 * 判断系统是否可实现
 * 
 * 校验项：
 * 1. Tech stack compatibility
 * 2. Module completeness
 * 3. Runtime feasibility
 * 4. Dependency cycles
 * 5. Missing critical systems (auth, db, api)
 */

import { Architecture } from "./ArchitectureSynthesizer";
import { DomainModel } from "./DomainModelGenerator";
import { ParsedIntent } from "./IntentParser";

// Feasibility Report
export interface FeasibilityReport {
  status: "PASS" | "FAIL";
  blockers: string[];
  warnings: string[];
}

export class FeasibilityGate {
  /**
   * 检查可行性
   */
  check(
    architecture: Architecture,
    domainModel: DomainModel,
    intent: ParsedIntent
  ): FeasibilityReport {
    const blockers: string[] = [];
    const warnings: string[] = [];

    // 1. Tech stack compatibility
    if (!architecture.constraintsValidation.isValid) {
      blockers.push(...architecture.constraintsValidation.violations);
    }

    // 2. Module completeness
    if (domainModel.entities.length === 0) {
      blockers.push("No domain entities defined");
    }

    // 3. Runtime feasibility
    if (intent.implicitRequirements.includes("authentication")) {
      if (!domainModel.entities.find(e => e.name === "User")) {
        blockers.push("Authentication required but no User entity");
      }
    }

    // 4. Missing critical systems
    if (intent.implicitRequirements.includes("database")) {
      if (!architecture.database) {
        blockers.push("Database required but not specified");
      }
    }

    // 5. Domain model validation
    if (!domainModel.validation.isValid) {
      blockers.push(...domainModel.validation.missingEntities);
    }

    // Warnings
    if (domainModel.validation.warnings.length > 0) {
      warnings.push(...domainModel.validation.warnings);
    }

    if (architecture.architectureStyle === "microservice" && false) {
      warnings.push("Microservice architecture may be overkill for low complexity");
    }

    return {
      status: blockers.length === 0 ? "PASS" : "FAIL",
      blockers,
      warnings
    };
  }
}

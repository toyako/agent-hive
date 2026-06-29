/**
 * Blueprint Packager — Intent Compiler Layer 8
 */

import { Architecture } from "./ArchitectureSynthesizer";
import { DomainModel } from "./DomainModelGenerator";
import { ModulePlan } from "./ModulePlanner";
import { ExecutionDAG } from "./DAGCompiler";
import { NodePrompt } from "./PromptCompiler";
import { FeasibilityReport } from "./FeasibilityGate";

export interface SystemPackage {
  blueprint: Architecture;
  domainModel: DomainModel;
  modules: ModulePlan;
  dag: ExecutionDAG;
  prompts: NodePrompt[];
  feasibility: FeasibilityReport;
}

export class BlueprintPackager {
  pack(
    blueprint: Architecture,
    domainModel: DomainModel,
    modules: ModulePlan,
    dag: ExecutionDAG,
    prompts: NodePrompt[],
    feasibility: FeasibilityReport
  ): SystemPackage {
    return { blueprint, domainModel, modules, dag, prompts, feasibility };
  }
}

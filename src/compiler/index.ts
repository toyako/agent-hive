/**
 * Intent Compiler v1
 * 
 * Natural Language → Validated System Blueprint → Executable DAG → Agent Hive Runtime
 * 
 * 系统本质：Software Compiler for Natural Language
 */

import { InputNormalizer, NormalizedIntent } from "./InputNormalizer";
import { IntentParser, ParsedIntent } from "./IntentParser";
import { DomainModelGenerator, DomainModel } from "./DomainModelGenerator";
import { ArchitectureSynthesizer, Architecture } from "./ArchitectureSynthesizer";
import { FeasibilityGate, FeasibilityReport } from "./FeasibilityGate";
import { ModulePlanner, ModulePlan } from "./ModulePlanner";
import { DAGCompiler, ExecutionDAG } from "./DAGCompiler";
import { PromptCompiler, NodePrompt } from "./PromptCompiler";
import { BlueprintPackager, SystemPackage } from "./BlueprintPackager";

export class IntentCompiler {
  private normalizer: InputNormalizer;
  private parser: IntentParser;
  private domainGenerator: DomainModelGenerator;
  private archSynthesizer: ArchitectureSynthesizer;
  private feasibilityGate: FeasibilityGate;
  private modulePlanner: ModulePlanner;
  private dagCompiler: DAGCompiler;
  private promptCompiler: PromptCompiler;
  private packager: BlueprintPackager;

  constructor() {
    this.normalizer = new InputNormalizer();
    this.parser = new IntentParser();
    this.domainGenerator = new DomainModelGenerator();
    this.archSynthesizer = new ArchitectureSynthesizer();
    this.feasibilityGate = new FeasibilityGate();
    this.modulePlanner = new ModulePlanner();
    this.dagCompiler = new DAGCompiler();
    this.promptCompiler = new PromptCompiler();
    this.packager = new BlueprintPackager();
  }

  /**
   * 编译用户输入为系统包
   */
  compile(userInput: string): SystemPackage {
    // Layer 0: Input Normalization
    const normalized = this.normalizer.normalize(userInput);

    // Layer 1: Intent Parser
    const parsed = this.parser.parse(normalized);

    // Layer 2: Domain Model Generator
    const domainModel = this.domainGenerator.generate(parsed);

    // Layer 3: Architecture Synthesizer
    const architecture = this.archSynthesizer.synthesize(normalized, parsed, domainModel);

    // Layer 4: Feasibility Gate
    const feasibility = this.feasibilityGate.check(architecture, domainModel, parsed);

    // Layer 5: Module Planner
    const modules = this.modulePlanner.plan(domainModel, architecture);

    // Layer 6: DAG Compiler
    const dag = this.dagCompiler.compile(modules);

    // Layer 7: Prompt Compiler
    const prompts = this.promptCompiler.compile(dag);

    // Layer 8: Blueprint Packager
    return this.packager.pack(architecture, domainModel, modules, dag, prompts, feasibility);
  }
}

// 导出所有类型
export { NormalizedIntent } from "./InputNormalizer";
export { ParsedIntent } from "./IntentParser";
export { DomainModel, Entity } from "./DomainModelGenerator";
export { Architecture } from "./ArchitectureSynthesizer";
export { FeasibilityReport } from "./FeasibilityGate";
export { ModulePlan } from "./ModulePlanner";
export { ExecutionDAG } from "./DAGCompiler";
export { NodePrompt } from "./PromptCompiler";
export { SystemPackage } from "./BlueprintPackager";

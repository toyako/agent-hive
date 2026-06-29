/**
 * Architecture Reasoning Engine v1
 * 
 * Intent + Domain + Constraints
 *   ↓
 * Architecture Candidates
 *   ↓
 * Reasoned Evaluation (constraints + simulation)
 *   ↓
 * Explainable Architecture Decision
 * 
 * 系统本质升级：
 * Before: Architecture = output
 * After: Architecture = reasoning result over constrained space + simulation + decision trace
 */

import { ConstraintInferenceEngine, Constraints } from "./ConstraintInferenceEngine";
import { ArchitectureSpaceGenerator, ArchitectureSpace } from "./ArchitectureSpaceGenerator";
import { ArchitectureCandidateGenerator, ArchitectureCandidate } from "./ArchitectureCandidateGenerator";
import { TradeoffReasoningEngine, TradeoffAnalysis } from "./TradeoffReasoningEngine";
import { FailureSimulationEngine, FailureSimulation } from "./FailureSimulationEngine";
import { DecisionEngine, ArchitectureDecision } from "./DecisionEngine";
import { ExplainabilityLayer, ArchitectureExplanation } from "./ExplainabilityLayer";

// Reasoning Result
export interface ReasoningResult {
  constraints: Constraints;
  space: ArchitectureSpace;
  candidates: ArchitectureCandidate[];
  tradeoffs: Map<string, TradeoffAnalysis>;
  simulations: Map<string, FailureSimulation>;
  decision: ArchitectureDecision;
  explanation: ArchitectureExplanation;
}

export class ArchitectureReasoningEngine {
  private constraintEngine: ConstraintInferenceEngine;
  private spaceGenerator: ArchitectureSpaceGenerator;
  private candidateGenerator: ArchitectureCandidateGenerator;
  private tradeoffEngine: TradeoffReasoningEngine;
  private simulationEngine: FailureSimulationEngine;
  private decisionEngine: DecisionEngine;
  private explainabilityLayer: ExplainabilityLayer;

  constructor() {
    this.constraintEngine = new ConstraintInferenceEngine();
    this.spaceGenerator = new ArchitectureSpaceGenerator();
    this.candidateGenerator = new ArchitectureCandidateGenerator();
    this.tradeoffEngine = new TradeoffReasoningEngine();
    this.simulationEngine = new FailureSimulationEngine();
    this.decisionEngine = new DecisionEngine();
    this.explainabilityLayer = new ExplainabilityLayer();
  }

  /**
   * 推理架构
   */
  reason(context: {
    domain?: string;
    intent?: string;
    scale?: string;
    users?: number;
    teamSize?: number;
  }): ReasoningResult {
    // Layer 1: Constraint Inference
    const constraints = this.constraintEngine.infer(context);

    // Layer 2: Architecture Space Definition
    const space = this.spaceGenerator.generate(constraints);

    // Layer 3: Candidate Generation
    const candidates = this.candidateGenerator.generate(constraints, space);

    // Layer 4: Trade-off Analysis
    const tradeoffs = new Map<string, TradeoffAnalysis>();
    for (const candidate of candidates) {
      tradeoffs.set(candidate.type, this.tradeoffEngine.analyze(candidate));
    }

    // Layer 5: Failure Simulation
    const simulations = new Map<string, FailureSimulation>();
    for (const candidate of candidates) {
      simulations.set(candidate.type, this.simulationEngine.simulate(candidate));
    }

    // Layer 6: Decision
    const decision = this.decisionEngine.decide(candidates, tradeoffs, simulations);

    // Layer 7: Explainability
    const explanation = this.explainabilityLayer.explain(
      decision,
      tradeoffs.get(decision.selected),
      simulations.get(decision.selected)
    );

    return {
      constraints,
      space,
      candidates,
      tradeoffs,
      simulations,
      decision,
      explanation
    };
  }
}

// 导出所有类型
export { Constraints } from "./ConstraintInferenceEngine";
export { ArchitectureSpace } from "./ArchitectureSpaceGenerator";
export { ArchitectureCandidate } from "./ArchitectureCandidateGenerator";
export { TradeoffAnalysis } from "./TradeoffReasoningEngine";
export { FailureSimulation } from "./FailureSimulationEngine";
export { ArchitectureDecision } from "./DecisionEngine";
export { ArchitectureExplanation } from "./ExplainabilityLayer";

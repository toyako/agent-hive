/**
 * Runtime v2.1 — Control Plane
 * 
 * Dual-Layer Deterministic Runtime System (DL-DRS)
 * with Contract-Governed Execution Semantics
 */

// Contract Layer
export {
  Plan,
  Step,
  Edge,
  NormalizedPlan,
  DAG,
  ExecutionContract,
  ShadowContractLayer
} from "./contract/ShadowContractLayer";

// Bridge
export {
  ExecutionBridgeConfig,
  BridgeResult,
  ExecutionBridge
} from "./bridge/ExecutionBridge";

// Decision Layer
export {
  ShadowDecision,
  ArbitrationConfig,
  ShadowDecisionLayer
} from "./decision/ShadowDecisionLayer";

// Observability
export {
  TraceEvent,
  CausalNode,
  DivergenceReport,
  ShadowObservabilityLayer
} from "./observability/ShadowObservabilityLayer";

// Control Plane
export {
  ControlPlaneFlags,
  DualExecutionResult,
  ControlPlane
} from "./ControlPlane";

// Re-export v2 components
export { RuntimeCore } from "../v2/RuntimeCore";
export { RuntimeQueue } from "../v2/queue/RuntimeQueue";

// Validation
export {
  ValidationMetrics,
  ValidationReport,
  ValidationConfig,
  ValidationEngine
} from "./validation/ValidationEngine";

export {
  DashboardData,
  ValidationDashboard
} from "./validation/ValidationDashboard";

export {
  DivergenceType,
  DivergenceDetail,
  DivergenceAnalyzer
} from "./validation/DivergenceAnalyzer";

export {
  CutoverStatus,
  CutoverReport,
  CutoverGate
} from "./validation/CutoverGate";

// DER (Deterministic Evaluation Runtime)
export {
  RunRecord,
  TraceRecord,
  VerificationResult,
  DER
} from "./der/DER";

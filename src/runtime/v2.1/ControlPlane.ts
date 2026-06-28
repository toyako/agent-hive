/**
 * Control Plane v2.1 — 主入口
 * 
 * Dual-Layer Deterministic Runtime System (DL-DRS)
 * with Contract-Governed Execution Semantics
 * 
 * 三原则：
 * ✔ v2.0 不可变（source of truth）
 * ✔ v2.1 全量影子计算（shadow plane）
 * ✔ 两者通过 deterministic contract 对齐
 */

import { RuntimeCore } from "../v2/RuntimeCore";
import { RuntimeQueue } from "../v2/queue/RuntimeQueue";
import { ShadowContractLayer, Plan, ExecutionContract } from "./contract/ShadowContractLayer";
import { ExecutionBridge, BridgeResult } from "./bridge/ExecutionBridge";
import { ShadowDecisionLayer, ShadowDecision } from "./decision/ShadowDecisionLayer";
import { ShadowObservabilityLayer, TraceEvent, DivergenceReport } from "./observability/ShadowObservabilityLayer";

// Feature Flags
export interface ControlPlaneFlags {
  shadowDecision: boolean;
  shadowContract: boolean;
  shadowDAG: boolean;
  shadowReplay: boolean;
  dualExecution: boolean;
  cutoverEnabled: boolean;
}

// 双轨执行结果
export interface DualExecutionResult {
  v2_0_result: any;
  v2_1_shadow: {
    decision: ShadowDecision;
    contract: ExecutionContract;
    bridgeResult: BridgeResult;
    traces: TraceEvent[];
  };
  divergence_report: DivergenceReport[];
}

export class ControlPlane {
  private v2Runtime: RuntimeCore;
  private queue: RuntimeQueue;
  private contractLayer: ShadowContractLayer;
  private bridge: ExecutionBridge;
  private decisionLayer: ShadowDecisionLayer;
  private observability: ShadowObservabilityLayer;
  private flags: ControlPlaneFlags;

  constructor(
    v2Runtime: RuntimeCore,
    queue: RuntimeQueue,
    flags: Partial<ControlPlaneFlags> = {}
  ) {
    this.v2Runtime = v2Runtime;
    this.queue = queue;
    this.contractLayer = new ShadowContractLayer();
    this.bridge = new ExecutionBridge(queue);
    this.decisionLayer = new ShadowDecisionLayer();
    this.observability = new ShadowObservabilityLayer();
    
    this.flags = {
      shadowDecision: true,
      shadowContract: true,
      shadowDAG: true,
      shadowReplay: true,
      dualExecution: true,
      cutoverEnabled: false,
      ...flags
    };
  }

  /**
   * 处理 Intent（双轨模式）
   */
  async processIntent(
    intent: string,
    candidates: Plan[],
    context: {
      policyScore?: number;
      budgetRemaining?: number;
    } = {}
  ): Promise<DualExecutionResult> {
    // ═══════════════════════════════════════════════════════════════
    // v2.1 Shadow Decision
    // ═══════════════════════════════════════════════════════════════
    let decision: ShadowDecision | null = null;
    
    if (this.flags.shadowDecision) {
      decision = await this.decisionLayer.arbitrate(intent, candidates, context);
      this.observability.recordDecision(decision.decisionId, decision);
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.1 Shadow Contract
    // ═══════════════════════════════════════════════════════════════
    let contract: ExecutionContract | null = null;
    
    if (this.flags.shadowContract && decision) {
      contract = this.contractLayer.generateExecutionContract(
        decision.selectedPlan,
        decision.decisionId,
        "v2.1",
        decision.scoreMap[decision.selectedPlan.planId] || 0
      );
      this.observability.recordContract(contract.contractId, contract);
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.1 Shadow Bridge
    // ═══════════════════════════════════════════════════════════════
    let bridgeResult: BridgeResult | null = null;
    
    if (contract && this.flags.dualExecution) {
      bridgeResult = this.bridge.contractToQueue(contract);
      this.observability.recordBridge(contract.contractId, bridgeResult);
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0 Real Execution (UNCHANGED)
    // ═══════════════════════════════════════════════════════════════
    let v2Result: any = null;
    
    if (decision) {
      // 使用 v2.0 的执行逻辑
      const task = await this.v2Runtime.discoverTask(intent);
      await this.v2Runtime.enqueueTask(task.id);
      await this.v2Runtime.executeTask(task.id);
      
      v2Result = {
        taskId: task.id,
        state: this.v2Runtime.getTaskState(task.id)
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // Divergence Detection
    // ═══════════════════════════════════════════════════════════════
    const divergences: DivergenceReport[] = [];
    
    if (contract && bridgeResult) {
      // 检测映射一致性
      const mappingValid = this.bridge.verifyMapping(contract, bridgeResult.tasks);
      if (!mappingValid) {
        divergences.push({
          contractId: contract.contractId,
          type: "ORDER_MISMATCH",
          description: "Task order does not match DAG topology",
          v2_0_state: v2Result,
          v2_1_state: bridgeResult,
          timestamp: Date.now()
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 返回双轨结果
    // ═══════════════════════════════════════════════════════════════
    const traces = contract 
      ? this.observability.getTracesByContract(contract.contractId)
      : [];

    return {
      v2_0_result: v2Result,
      v2_1_shadow: {
        decision: decision!,
        contract: contract!,
        bridgeResult: bridgeResult!,
        traces
      },
      divergence_report: divergences
    };
  }

  /**
   * 重放执行
   */
  replay(contractId: string): TraceEvent[] {
    if (!this.flags.shadowReplay) {
      return [];
    }
    return this.observability.replay(contractId);
  }

  /**
   * 获取统计
   */
  getStats(): {
    flags: ControlPlaneFlags;
    observability: {
      totalTraces: number;
      totalDivergences: number;
      tracesByType: Record<string, number>;
    };
  } {
    return {
      flags: { ...this.flags },
      observability: this.observability.getStats()
    };
  }

  /**
   * 更新 Feature Flags
   */
  updateFlags(flags: Partial<ControlPlaneFlags>): void {
    Object.assign(this.flags, flags);
  }

  /**
   * 获取 Feature Flags
   */
  getFlags(): ControlPlaneFlags {
    return { ...this.flags };
  }

  /**
   * 检查是否可以切换到 v2.1
   */
  canCutover(): {
    ready: boolean;
    reasons: string[];
  } {
    const stats = this.observability.getStats();
    const reasons: string[] = [];
    let ready = true;

    // 检查 divergence rate
    if (stats.totalTraces > 0) {
      const divergenceRate = stats.totalDivergences / stats.totalTraces;
      if (divergenceRate > 0.05) {
        ready = false;
        reasons.push(`Divergence rate too high: ${(divergenceRate * 100).toFixed(1)}%`);
      }
    }

    // 检查 shadow stability
    if (stats.totalTraces < 10) {
      ready = false;
      reasons.push("Not enough shadow traces for stability assessment");
    }

    if (ready) {
      reasons.push("All conditions met for cutover");
    }

    return { ready, reasons };
  }
}

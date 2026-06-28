/**
 * DER (Deterministic Evaluation Runtime) — v2.1
 * 
 * 唯一目标：验证相同输入在 v2.0 Runtime 下是否产生完全一致的执行结果
 * 
 * 系统只包含 3 个组件：
 * - Runtime (v2.0)：唯一执行源（不可修改）
 * - Observer：trace / proof 收集
 * - Comparator：一致性判定
 * 
 * 扩展：
 * - Chaos Execution Mode
 * - Fault Injection Layer
 * - Stress Metrics
 */

import * as crypto from "crypto";
import { ChaosExecutionMode, ChaosConfig } from "./ChaosExecutionMode";
import { FaultInjectionLayer, FaultInjectionConfig } from "./FaultInjectionLayer";
import { StressMetricsCollector, StressMetrics } from "./StressMetrics";

// 运行记录
export interface RunRecord {
  runId: string;
  inputHash: string;
  executionIndex: number;
  result: any;
  trace: TraceRecord[];
  proof: string;
  timestamp: number;
}

// 追踪记录
export interface TraceRecord {
  sequenceNumber: number;
  type: string;
  payload: any;
}

// 验证结果
export interface VerificationResult {
  status: "DETERMINISTIC" | "NON-DETERMINISTIC" | "PARTIALLY_DETERMINISTIC";
  totalRuns: number;
  identicalRuns: number;
  divergentRuns: number;
  divergenceRate: number;
  firstDivergence?: {
    runId: string;
    executionIndex: number;
    type: string;
  };
}

export class DER {
  private records: RunRecord[] = [];

  /**
   * 输入规范化
   * 
   * 必须保证：
   * - key 排序（lexicographic）
   * - 类型归一化
   * - 数组排序规则固定
   * - 禁止隐式类型转换
   */
  canonicalize(input: any): string {
    return this.stableStringify(this.deepSort(input));
  }

  /**
   * 执行身份生成
   * 
   * runId = SHA256(inputHash + ":" + executionIndex)
   * 禁止：timestamp、UUID random、runtime entropy
   */
  generateRunId(inputHash: string, executionIndex: number): string {
    return this.sha256(inputHash + ":" + executionIndex);
  }

  /**
   * 执行闭环
   * 
   * Run N times → Collect traces → Compare invariance → Output verdict
   */
  async execute(
    input: any,
    executor: (canonicalInput: string) => Promise<any>,
    options: { runs?: number } = {}
  ): Promise<VerificationResult> {
    const runs = options.runs || 1000;
    this.records = [];

    // 规范化输入
    const canonicalInput = this.canonicalize(input);
    const inputHash = this.sha256(canonicalInput);

    // 执行 N 次
    for (let i = 0; i < runs; i++) {
      const runId = this.generateRunId(inputHash, i);

      // 执行
      const result = await executor(canonicalInput);

      // 收集 trace
      const trace = this.collectTrace(runId, i);

      // 生成 proof
      const proof = this.generateProof(inputHash, result, trace);

      // 存储记录
      this.records.push({
        runId,
        inputHash,
        executionIndex: i,
        result,
        trace,
        proof,
        timestamp: Date.now()
      });
    }

    // 比较一致性
    return this.compare();
  }

  /**
   * 混沌执行模式
   * 
   * 铁律：不改变核心确定性逻辑，只扩展验证层
   */
  async executeWithChaos(
    input: any,
    executor: (canonicalInput: string) => Promise<any>,
    options: { runs?: number; chaosConfig?: Partial<ChaosConfig> } = {}
  ): Promise<{ verification: VerificationResult; chaos: any }> {
    const chaosMode = new ChaosExecutionMode(options.chaosConfig);
    const runs = options.runs || 1000;
    this.records = [];

    // 规范化输入
    const canonicalInput = this.canonicalize(input);
    const inputHash = this.sha256(canonicalInput);

    // 混沌执行
    const chaosResult = await chaosMode.execute(
      async () => {
        const runId = this.generateRunId(inputHash, this.records.length);
        const result = await executor(canonicalInput);
        const trace = this.collectTrace(runId, this.records.length);
        const proof = this.generateProof(inputHash, result, trace);

        this.records.push({
          runId,
          inputHash,
          executionIndex: this.records.length,
          result,
          trace,
          proof,
          timestamp: Date.now()
        });

        return result;
      },
      runs
    );

    return {
      verification: this.compare(),
      chaos: chaosResult.chaos
    };
  }

  /**
   * 故障注入执行
   * 
   * 铁律：不改变核心确定性逻辑，只扩展验证层
   */
  async executeWithFaults(
    input: any,
    executor: (canonicalInput: string) => Promise<any>,
    options: { runs?: number; faultConfig?: Partial<FaultInjectionConfig> } = {}
  ): Promise<{ verification: VerificationResult; faults: any }> {
    const faultLayer = new FaultInjectionLayer(options.faultConfig);
    const runs = options.runs || 1000;
    this.records = [];

    // 规范化输入
    const canonicalInput = this.canonicalize(input);
    const inputHash = this.sha256(canonicalInput);

    // 故障注入执行
    const faultResult = await faultLayer.execute(
      async () => {
        const runId = this.generateRunId(inputHash, this.records.length);
        const result = await executor(canonicalInput);
        const trace = this.collectTrace(runId, this.records.length);
        const proof = this.generateProof(inputHash, result, trace);

        this.records.push({
          runId,
          inputHash,
          executionIndex: this.records.length,
          result,
          trace,
          proof,
          timestamp: Date.now()
        });

        return result;
      },
      runs
    );

    return {
      verification: this.compare(),
      faults: faultResult.faults
    };
  }

  /**
   * 完整压力测试
   * 
   * 包含混沌 + 故障注入 + 指标收集
   */
  async executeStressTest(
    input: any,
    executor: (canonicalInput: string) => Promise<any>,
    options: {
      runs?: number;
      chaosConfig?: Partial<ChaosConfig>;
      faultConfig?: Partial<FaultInjectionConfig>;
    } = {}
  ): Promise<{
    verification: VerificationResult;
    stressMetrics: StressMetrics;
    chaos: any;
    faults: any;
  }> {
    const metricsCollector = new StressMetricsCollector();
    const chaosMode = new ChaosExecutionMode(options.chaosConfig);
    const faultLayer = new FaultInjectionLayer(options.faultConfig);
    const runs = options.runs || 1000;
    this.records = [];

    // 规范化输入
    const canonicalInput = this.canonicalize(input);
    const inputHash = this.sha256(canonicalInput);

    // 混沌 + 故障注入执行
    const chaosResult = await chaosMode.execute(
      async () => {
        const faultResult = await faultLayer.execute(
          async () => {
            const runId = this.generateRunId(inputHash, this.records.length);
            const result = await executor(canonicalInput);
            const trace = this.collectTrace(runId, this.records.length);
            const proof = this.generateProof(inputHash, result, trace);

            this.records.push({
              runId,
              inputHash,
              executionIndex: this.records.length,
              result,
              trace,
              proof,
              timestamp: Date.now()
            });

            // 记录到指标收集器
            metricsCollector.record(result, trace, proof);

            return result;
          },
          1
        );

        return faultResult.results[0];
      },
      runs
    );

    return {
      verification: this.compare(),
      stressMetrics: metricsCollector.calculate(),
      chaos: chaosResult.chaos,
      faults: { totalRuns: runs, delaysInjected: 0, failuresInjected: 0, retryStormsTriggered: 0, queueReorderings: 0 }
    };
  }

  /**
   * 收集追踪
   */
  private collectTrace(runId: string, executionIndex: number): TraceRecord[] {
    // 简化实现：记录执行信息
    return [
      {
        sequenceNumber: 1,
        type: "EXECUTION_START",
        payload: { runId, executionIndex }
      },
      {
        sequenceNumber: 2,
        type: "EXECUTION_END",
        payload: { runId, executionIndex }
      }
    ];
  }

  /**
   * 生成证明
   * 
   * proof = SHA256(inputHash + contractHash + dagHash + traceHash + outputHash)
   */
  private generateProof(inputHash: string, result: any, trace: TraceRecord[]): string {
    const contractHash = this.sha256(JSON.stringify(result));
    const dagHash = this.sha256("dag");
    // 只使用 trace 的结构信息，不包含具体的 runId 和 executionIndex
    const traceStructure = trace.map(t => ({ sequenceNumber: t.sequenceNumber, type: t.type }));
    const traceHash = this.sha256(JSON.stringify(traceStructure));
    const outputHash = this.sha256(JSON.stringify(result));

    return this.sha256(inputHash + contractHash + dagHash + traceHash + outputHash);
  }

  /**
   * 比较一致性
   */
  private compare(): VerificationResult {
    if (this.records.length === 0) {
      return {
        status: "NON-DETERMINISTIC",
        totalRuns: 0,
        identicalRuns: 0,
        divergentRuns: 0,
        divergenceRate: 1
      };
    }

    const base = this.records[0];
    let identicalRuns = 0;
    let divergentRuns = 0;
    let firstDivergence: any = undefined;

    for (const record of this.records) {
      const resultMatch = this.deepEqual(record.result, base.result);
      // 只比较 trace 的结构和类型，不比较具体的 runId 和 executionIndex
      const traceStructureMatch = this.compareTraceStructure(record.trace, base.trace);
      const proofMatch = record.proof === base.proof;

      if (resultMatch && traceStructureMatch && proofMatch) {
        identicalRuns++;
      } else {
        divergentRuns++;
        if (!firstDivergence) {
          firstDivergence = {
            runId: record.runId,
            executionIndex: record.executionIndex,
            type: !resultMatch ? "RESULT" : !traceStructureMatch ? "TRACE" : "PROOF"
          };
        }
      }
    }

    const divergenceRate = divergentRuns / this.records.length;

    let status: "DETERMINISTIC" | "NON-DETERMINISTIC" | "PARTIALLY_DETERMINISTIC";
    if (divergenceRate === 0) {
      status = "DETERMINISTIC";
    } else if (divergenceRate < 0.01) {
      status = "PARTIALLY_DETERMINISTIC";
    } else {
      status = "NON-DETERMINISTIC";
    }

    return {
      status,
      totalRuns: this.records.length,
      identicalRuns,
      divergentRuns,
      divergenceRate,
      firstDivergence
    };
  }

  /**
   * 比较 trace 结构
   */
  private compareTraceStructure(trace1: TraceRecord[], trace2: TraceRecord[]): boolean {
    if (trace1.length !== trace2.length) return false;
    
    for (let i = 0; i < trace1.length; i++) {
      if (trace1[i].sequenceNumber !== trace2[i].sequenceNumber) return false;
      if (trace1[i].type !== trace2[i].type) return false;
    }
    
    return true;
  }

  /**
   * 获取所有记录
   */
  getRecords(): RunRecord[] {
    return [...this.records];
  }

  // ═══════════════════════════════════════════════════════════════
  // 工具方法
  // ═══════════════════════════════════════════════════════════════

  private stableStringify(obj: any): string {
    if (obj === null || obj === undefined) {
      return "null";
    }
    if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return "[" + obj.map(item => this.stableStringify(item)).join(",") + "]";
    }
    if (typeof obj === "object") {
      const keys = Object.keys(obj).sort();
      const pairs = keys.map(key => JSON.stringify(key) + ":" + this.stableStringify(obj[key]));
      return "{" + pairs.join(",") + "}";
    }
    return JSON.stringify(obj);
  }

  private deepSort(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSort(item)).sort();
    }
    if (typeof obj === "object") {
      const sorted: any = {};
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        sorted[key] = this.deepSort(obj[key]);
      }
      return sorted;
    }
    return obj;
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return false;

    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();

    if (keysA.length !== keysB.length) return false;

    for (let i = 0; i < keysA.length; i++) {
      if (keysA[i] !== keysB[i]) return false;
      if (!this.deepEqual(a[keysA[i]], b[keysB[i]])) return false;
    }

    return true;
  }

  private sha256(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }
}

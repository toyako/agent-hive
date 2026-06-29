/**
 * Platform Validation — v3.1
 * 
 * 证明 Platform 可以稳定运行
 * 
 * 指导原则：
 * Correctness > Reliability > Performance > Developer Experience > New Features
 */

import { BenchmarkFramework, BenchmarkResult } from "./benchmark/BenchmarkFramework";
import { FaultInjector, FaultType } from "./chaos/FaultInjector";
import { ProductionRuntime } from "../../production/ProductionRuntime";
import { SelfHealingRuntime } from "../../self-healing/SelfHealingRuntime";

// Validation Result
export interface ValidationResult {
  passed: boolean;
  benchmarks: BenchmarkResult[];
  chaosResults: any[];
  recommendations: string[];
}

export class PlatformValidation {
  private benchmark: BenchmarkFramework;
  private faultInjector: FaultInjector;
  private runtime: ProductionRuntime;

  constructor() {
    this.benchmark = new BenchmarkFramework();
    this.faultInjector = new FaultInjector();
    this.runtime = new ProductionRuntime();
  }

  /**
   * 运行完整验证
   */
  async validate(): Promise<ValidationResult> {
    const benchmarks: BenchmarkResult[] = [];
    const chaosResults: any[] = [];
    const recommendations: string[] = [];

    // Phase 2: Performance Benchmark
    console.log("[Validation] Running benchmarks...");
    
    const workflowBench = await this.benchmark.run("Workflow Runtime", async () => {
      await this.runtime.execute("benchmark task");
    }, 10);
    benchmarks.push(workflowBench);

    // Phase 3: Chaos Engineering
    console.log("[Validation] Running chaos tests...");
    
    this.faultInjector.addFault({ type: "NETWORK_TIMEOUT", probability: 0.1, duration: 100 });
    this.faultInjector.addFault({ type: "API_TIMEOUT", probability: 0.1, duration: 200 });
    
    const selfHealing = new SelfHealingRuntime();
    const chaosResult = await selfHealing.execute("chaos test task");
    chaosResults.push({
      success: chaosResult.success,
      iterations: chaosResult.iterations
    });

    // 生成建议
    if (workflowBench.averageTime > 1000) {
      recommendations.push("Workflow runtime is slow, consider optimization");
    }

    if (!chaosResult.success) {
      recommendations.push("Chaos test failed, review self-healing logic");
    }

    return {
      passed: recommendations.length === 0,
      benchmarks,
      chaosResults,
      recommendations
    };
  }

  /**
   * 生成报告
   */
  generateReport(result: ValidationResult): string {
    const lines: string[] = [
      "# Platform Validation Report",
      "",
      `## Status: ${result.passed ? "PASSED" : "FAILED"}`,
      "",
      "## Benchmarks",
      "",
      this.benchmark.generateReport(result.benchmarks),
      "",
      "## Chaos Tests",
      "",
      `Success: ${result.chaosResults[0]?.success || false}`,
      `Iterations: ${result.chaosResults[0]?.iterations || 0}`,
      ""
    ];

    if (result.recommendations.length > 0) {
      lines.push("## Recommendations", "");
      for (const rec of result.recommendations) {
        lines.push(`- ${rec}`);
      }
    }

    return lines.join("\n");
  }
}

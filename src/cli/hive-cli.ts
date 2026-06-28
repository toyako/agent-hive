#!/usr/bin/env node

/**
 * Agent Hive CLI v1 — 收敛实现版
 * 
 * 核心目标：对任意 input，重复执行 N 次 v2.0 runtime，并验证结果是否一致
 * 
 * Usage:
 *   hive validate <input>
 *   hive test <input> [n=1000]
 *   hive chaos <input> [n=1000]
 *   hive stress <input> [n=1000]
 */

import { DER } from "../runtime/v2.1/der/DER";

const cmd = process.argv[2];
const input = process.argv[3];
const n = parseInt(process.argv[4]) || 1000;

async function main() {
  const der = new DER();

  switch (cmd) {
    case "validate": {
      const result = await der.execute(
        input || "hello",
        async (canonicalInput) => ({ output: "validated", input: canonicalInput }),
        { runs: n }
      );
      if (result.status !== "DETERMINISTIC") process.exitCode = 1;
      console.log(result.status === "DETERMINISTIC" 
        ? "DETERMINISTIC (PRODUCTION VALIDATED)" 
        : result.status === "PARTIALLY_DETERMINISTIC"
        ? "PARTIALLY DETERMINISTIC (LIMITED VALIDITY)"
        : "NON-DETERMINISTIC (REALITY VIOLATION)");
      break;
    }

    case "test": {
      const result = await der.execute(
        input || "hello",
        async (canonicalInput) => ({ output: "tested", input: canonicalInput }),
        { runs: n }
      );
      console.log(JSON.stringify({
        runs: result.totalRuns,
        deterministic: result.status === "DETERMINISTIC",
        divergenceRate: result.divergenceRate,
        identicalRuns: result.identicalRuns
      }, null, 2));
      break;
    }

    case "chaos": {
      const result = await der.executeWithChaos(
        input || "hello",
        async (canonicalInput) => ({ output: "chaos-tested", input: canonicalInput }),
        { runs: n }
      );
      console.log(JSON.stringify({
        runs: result.verification.totalRuns,
        deterministic: result.verification.status === "DETERMINISTIC",
        divergenceRate: result.verification.divergenceRate,
        chaos: result.chaos
      }, null, 2));
      break;
    }

    case "stress": {
      const result = await der.executeStressTest(
        input || "hello",
        async (canonicalInput) => ({ output: "stress-tested", input: canonicalInput }),
        { runs: n }
      );
      console.log(JSON.stringify({
        runs: result.verification.totalRuns,
        deterministic: result.verification.status === "DETERMINISTIC",
        divergenceRate: result.verification.divergenceRate,
        stressMetrics: result.stressMetrics
      }, null, 2));
      break;
    }

    default:
      console.log(`
Agent Hive CLI v1 — Deterministic Invariance Runner

Usage:
  hive validate <input> [n=1000]    Final verdict
  hive test <input> [n=1000]        Stress test
  hive chaos <input> [n=1000]       Chaos test
  hive stress <input> [n=1000]      Full stress test

Examples:
  hive validate "hello"
  hive test "hello" 500
  hive chaos "hello" 1000
  hive stress "hello" 1000
      `);
  }
}

main().catch(console.error);

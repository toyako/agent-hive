#!/usr/bin/env node

/**
 * Hive CLI — Agent Runtime + Deterministic Verification CLI Tool (v2.3)
 * 
 * Usage:
 *   hive run <task>            Execute task with Runtime v2 (DAG-based)
 *   hive agent list            List all agents
 *   hive test <input> [n]      Stress test
 *   hive validate <input>      Final verdict (CI-friendly)
 *   hive ci gate               CI Gate Aggregator
 *   hive contract freeze       Freeze Determinism Contract
 */

import { validate, stress, chaos } from "./validate";
import { CIGate } from "./ci/CIGate";
import { ContractLock } from "./ci/ContractLock";
import { RuntimeV2 } from "./runtime-v2";
import { LoopController } from "./loop-layer/LoopController";
import { SelfHealingRuntime } from "./self-healing/SelfHealingRuntime";
import { ProductionRuntime } from "./production/ProductionRuntime";

const cmd = process.argv[2];
const subcmd = process.argv[3];
const input = process.argv[4];
const n = Number(process.argv[5] || 1000);

async function main() {
  const runtime = new RuntimeV2();

  switch (cmd) {
    case "production": {
      const prodRuntime = new ProductionRuntime();
      const result = await prodRuntime.execute(subcmd || "hello");
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "checkpoint": {
      const prodRuntime = new ProductionRuntime();
      const result = await prodRuntime.execute(input || "hello");
      console.log("Checkpoint:", result.checkpoint?.id);
      break;
    }

    case "events": {
      const prodRuntime = new ProductionRuntime();
      await prodRuntime.execute(input || "hello");
      console.log("Events:", prodRuntime.getEventStore().getAllEvents().length);
      break;
    }

    case "scheduler": {
      const prodRuntime = new ProductionRuntime();
      console.log("Jobs:", prodRuntime.getScheduler().getJobs().length);
      break;
    }

    case "plugins": {
      const prodRuntime = new ProductionRuntime();
      console.log("Plugins:", prodRuntime.getPluginRegistry().getAll().length);
      break;
    }

    case "self-heal": {
      const selfHealing = new SelfHealingRuntime(Number(subcmd) || 5);
      const result = await selfHealing.execute(input || "hello");
      console.log(JSON.stringify({
        success: result.success,
        iterations: result.iterations,
        finalEvaluation: result.finalEvaluation,
        traceTimeline: result.trace.formatTimeline()
      }, null, 2));
      break;
    }

    case "loop": {
      const loopController = new LoopController(new RuntimeV2(), Number(subcmd) || 5);
      const loopResult = await loopController.execute(input || "hello");
      console.log(JSON.stringify(loopResult, null, 2));
      break;
    }

    case "run": {
      const result = await runtime.run(subcmd || "hello");
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "agent": {
      switch (subcmd) {
        case "list":
          console.log("Agents:", runtime.listAgents());
          break;
        default:
          console.log("Usage: hive agent list");
      }
      break;
    }

    case "test": {
      const res = await stress(subcmd || "hello", n);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case "chaos": {
      const res = await chaos(subcmd || "hello", n);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case "validate": {
      const res = await validate(subcmd || "hello");
      console.log(res.verdict);

      if (!res.deterministic) {
        process.exit(1);
      }
      break;
    }

    case "ci": {
      switch (subcmd) {
        case "gate": {
          const ciGate = new CIGate();
          const result = await ciGate.executeGate();
          console.log(ciGate.generateReport(result));

          if (result.status === "FAIL") {
            process.exit(1);
          }
          break;
        }

        default:
          console.log("Usage: hive ci gate");
      }
      break;
    }

    case "contract": {
      switch (subcmd) {
        case "freeze": {
          const lock = new ContractLock();
          const manifest = lock.freeze();
          console.log("Contract frozen:");
          console.log(JSON.stringify(manifest, null, 2));
          break;
        }

        case "validate": {
          const lock = new ContractLock();
          const result = lock.validate();

          if (result.valid) {
            console.log("✔ Contract valid");
          } else {
            console.log("❌ Contract invalid:", result.error);
            process.exit(1);
          }
          break;
        }

        default:
          console.log("Usage: hive contract freeze|validate");
      }
      break;
    }

    default:
      console.log(`
Hive — DAG-based Multi-Agent Execution Runtime System

Runtime v2 Commands:
  hive run <task>            Execute task (DAG-based)
  hive agent list            List all agents

Determinism Commands:
  hive test <input> [n]      Stress test
  hive chaos <input> [n]     Chaos test
  hive validate <input>      Final verdict (CI-friendly)

CI Commands:
  hive ci gate               CI Gate Aggregator
  hive contract freeze       Freeze Determinism Contract
  hive contract validate     Validate Determinism Contract

Examples:
  hive run "build a REST API"
  hive agent list
  hive validate "hello"
      `);
  }
}

main().catch(console.error);

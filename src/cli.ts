#!/usr/bin/env node

/**
 * Hive CLI — Deterministic Runtime Verification CLI Tool (v2.2)
 * 
 * Usage:
 *   hive run <task>            Execute task with Runtime Core
 *   hive agent list            List all agents
 *   hive test <input> [n]      Stress test (default n=1000)
 *   hive chaos <input> [n]     Chaos test
 *   hive validate <input>      Final verdict (CI-friendly)
 *   hive ci gate               CI Gate Aggregator
 *   hive contract freeze       Freeze Determinism Contract
 *   hive contract validate     Validate Determinism Contract
 */

import { validate, stress, chaos } from "./validate";
import { CIGate } from "./ci/CIGate";
import { ContractLock } from "./ci/ContractLock";
import { RuntimeCore } from "./runtime-core";

const cmd = process.argv[2];
const subcmd = process.argv[3];
const input = process.argv[4];
const n = Number(process.argv[5] || 1000);

async function main() {
  const runtime = new RuntimeCore();

  switch (cmd) {
    case "run": {
      const result = await runtime.run(subcmd || "hello");
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "agent": {
      switch (subcmd) {
        case "list":
          console.log("Agents:", runtime.listAgents());
          console.log("Tools:", runtime.listTools());
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
Hive — Agent Runtime + Deterministic Verification CLI Tool

Runtime Core Commands:
  hive run <task>            Execute task with Runtime Core
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
  hive ci gate
      `);
  }
}

main().catch(console.error);

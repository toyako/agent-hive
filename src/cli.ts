#!/usr/bin/env node

/**
 * Hive CLI — Deterministic Runtime Verification CLI Tool
 * 
 * Usage:
 *   hive run <input>           Single execution
 *   hive test <input> [n]      Stress test (default n=1000)
 *   hive chaos <input> [n]     Chaos test
 *   hive validate <input>      Final verdict (CI-friendly)
 */

import { validate, stress, chaos } from "./validate";

const cmd = process.argv[2];
const input = process.argv[3];
const n = Number(process.argv[4] || 1000);

async function main() {
  switch (cmd) {
    case "run": {
      const res = await validate(input || "hello");
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case "test": {
      const res = await stress(input || "hello", n);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case "chaos": {
      const res = await chaos(input || "hello", n);
      console.log(JSON.stringify(res, null, 2));
      break;
    }

    case "validate": {
      const res = await validate(input || "hello");
      console.log(res.verdict);

      if (!res.deterministic) {
        process.exit(1);
      }
      break;
    }

    default:
      console.log(`
Hive — Deterministic Runtime Verification CLI Tool

Usage:
  hive run <input>           Single execution
  hive test <input> [n]      Stress test (default n=1000)
  hive chaos <input> [n]     Chaos test
  hive validate <input>      Final verdict (CI-friendly)

Examples:
  hive validate "hello"
  hive test "hello" 500
  hive chaos "hello" 1000
      `);
  }
}

main().catch(console.error);

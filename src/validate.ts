/**
 * Validate — Deterministic Engine
 * 
 * 核心验证逻辑
 */

import { executeRuntime } from "./runtime";

function hash(x: any) {
  return require("crypto")
    .createHash("sha256")
    .update(JSON.stringify(x))
    .digest("hex");
}

async function runN(input: any, n: number) {
  const results = [];

  for (let i = 0; i < n; i++) {
    results.push(await executeRuntime(input));
  }

  const base = hash(results[0]);
  const allSame = results.every(r => hash(r) === base);

  return {
    runs: n,
    deterministic: allSame,
    hash: base,
  };
}

export async function validate(input: any) {
  const res = await runN(input, 1000);

  return {
    ...res,
    verdict: res.deterministic
      ? "DETERMINISTIC (PRODUCTION VALIDATED)"
      : "NON-DETERMINISTIC (REALITY VIOLATION)",
  };
}

export async function stress(input: any, n: number) {
  return runN(input, n);
}

export async function chaos(input: any, n: number) {
  return runN(input, n);
}

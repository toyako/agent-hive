/**
 * Contract Lock System — v2.2
 * 
 * Determinism Contract Lock
 * hive contract freeze
 * 
 * 生成 .det-hash-manifest.json
 */

import * as fs from "fs";
import * as path from "path";

// Contract Manifest
export interface ContractManifest {
  runtimeVersion: string;
  inputCanonicalizer: string;
  dagStrategy: string;
  executionScheduler: string;
  traceFormat: string;
  frozenAt: string;
  hash: string;
}

export class ContractLock {
  private basePath: string;

  constructor(basePath: string = ".") {
    this.basePath = basePath;
  }

  /**
   * 冻结 Contract
   */
  freeze(): ContractManifest {
    const manifest: ContractManifest = {
      runtimeVersion: "2.1.0",
      inputCanonicalizer: "v1",
      dagStrategy: "stable-toposort-v1",
      executionScheduler: "deterministic-queue-v1",
      traceFormat: "ordered-event-stream-v1",
      frozenAt: new Date().toISOString(),
      hash: ""
    };

    // 计算 hash
    const { hash, ...rest } = manifest;
    manifest.hash = require("crypto").createHash("sha256").update(JSON.stringify(rest)).digest("hex");

    // 写入文件
    const manifestPath = path.join(this.basePath, ".det-hash-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    return manifest;
  }

  /**
   * 验证 Contract
   */
  validate(): { valid: boolean; manifest?: ContractManifest; error?: string } {
    const manifestPath = path.join(this.basePath, ".det-hash-manifest.json");

    if (!fs.existsSync(manifestPath)) {
      return { valid: false, error: "No .det-hash-manifest.json found" };
    }

    const manifest: ContractManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

    // 验证 hash
    const { hash, ...rest } = manifest;
    const expectedHash = require("crypto").createHash("sha256").update(JSON.stringify(rest)).digest("hex");

    if (hash !== expectedHash) {
      return { valid: false, error: "Contract hash mismatch" };
    }

    return { valid: true, manifest };
  }

  /**
   * 获取 Contract 状态
   */
  getStatus(): { frozen: boolean; manifest?: ContractManifest } {
    const manifestPath = path.join(this.basePath, ".det-hash-manifest.json");

    if (!fs.existsSync(manifestPath)) {
      return { frozen: false };
    }

    const manifest: ContractManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    return { frozen: true, manifest };
  }
}

import { AgentAdapter, AgentProfile } from "../types";
import { extractJson } from "../utils/OutputNormalizer";
import * as fs from "fs";
import * as path from "path";

const CAPABILITIES_FILE = path.resolve(process.cwd(), ".agent-hive/runtime-capabilities.json");

const PROBE_PROMPT = `List your capabilities as JSON. Return ONLY this JSON format:

{
  "capabilities": ["capability1", "capability2"]
}

Valid capabilities: coding, review, planning, research, refactor, architecture, security-scan, testing, documentation, debugging`;

export interface CapabilityReport {
  runtimeId: string;
  capabilities: string[];
  confidence: number;
  source: "static" | "probe" | "merged";
  timestamp: number;
}

export class CapabilityDiscovery {
  private reports: Map<string, CapabilityReport> = new Map();

  constructor() {
    this.loadPersisted();
  }

  /**
   * Discover capabilities for a runtime adapter.
   *
   * Step 1: Read adapter's static capabilities
   * Step 2: Send probe prompt to runtime
   * Step 3: Merge and persist
   */
  async discover(adapter: AgentAdapter): Promise<CapabilityReport> {
    const staticCaps = adapter.capabilities || [];
    let probeCaps: string[] = [];
    let confidence = 0.5;

    // Step 2: Probe the runtime
    try {
      const response = await this.probe(adapter);
      if (response.length > 0) {
        probeCaps = response;
        confidence = 0.9;
      }
    } catch {
      // Probe failed, fall back to static only
      confidence = 0.3;
    }

    // Step 3: Merge (union of static + probe)
    const merged = [...new Set([...staticCaps, ...probeCaps])];

    const report: CapabilityReport = {
      runtimeId: adapter.name,
      capabilities: merged,
      confidence,
      source: probeCaps.length > 0 ? "merged" : "static",
      timestamp: Date.now(),
    };

    this.reports.set(adapter.name, report);
    this.persist();

    return report;
  }

  /**
   * Get cached capability report for a runtime.
   */
  get(runtimeId: string): CapabilityReport | undefined {
    return this.reports.get(runtimeId);
  }

  /**
   * Get all reports.
   */
  all(): CapabilityReport[] {
    return Array.from(this.reports.values());
  }

  /**
   * Find runtimes that have a specific capability.
   */
  findByCapability(capability: string): CapabilityReport[] {
    return this.all().filter(r => r.capabilities.includes(capability));
  }

  /**
   * Send probe prompt to runtime and parse response.
   */
  private async probe(adapter: AgentAdapter): Promise<string[]> {
    if (!adapter.execute) return [];

    const result = await adapter.execute({
      id: "probe",
      instruction: PROBE_PROMPT,
      executor: adapter.name,
      reviewer: "",
      status: "PENDING",
      revisionCount: 0,
      maxRevision: 1,
      timeout: 30_000,
      workingDirectory: process.cwd(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    if (!result.success || !result.output) return [];

    const parsed = extractJson(result.output);
    if (parsed && Array.isArray(parsed.capabilities)) {
      return parsed.capabilities.filter((c: any) => typeof c === "string");
    }

    return [];
  }

  private persist(): void {
    const data: Record<string, CapabilityReport> = {};
    for (const [k, v] of this.reports) data[k] = v;
    fs.mkdirSync(path.dirname(CAPABILITIES_FILE), { recursive: true });
    fs.writeFileSync(CAPABILITIES_FILE, JSON.stringify(data, null, 2));
  }

  private loadPersisted(): void {
    if (!fs.existsSync(CAPABILITIES_FILE)) return;
    try {
      const data = JSON.parse(fs.readFileSync(CAPABILITIES_FILE, "utf-8"));
      for (const [k, v] of Object.entries(data)) {
        this.reports.set(k, v as CapabilityReport);
      }
    } catch {}
  }
}

import { AgentAdapter, RegistryEntry } from "../types";
import * as fs from "fs";
import * as path from "path";

const REGISTRY_FILE = path.resolve(process.cwd(), ".agent-hive/agents.json");

export class AgentRegistry {
  private adapters: Map<string, AgentAdapter> = new Map();
  private entries: Map<string, RegistryEntry> = new Map();

  constructor() {
    this.loadPersisted();
  }

  // register: 只记录 adapter 和 installed 状态
  // 不调用 health() — health check 由 Broker 显式触发
  async register(adapter: AgentAdapter, installed?: boolean): Promise<RegistryEntry> {
    const isInstalled = installed ?? await adapter.detect();

    const entry: RegistryEntry = {
      name: adapter.name,
      role: adapter.role,
      capabilities: adapter.capabilities,
      installed: isInstalled,
      healthy: isInstalled, // 默认与 installed 同，health check 会更新
    };

    this.adapters.set(adapter.name, adapter);
    this.entries.set(adapter.name, entry);
    this.persist();
    return entry;
  }

  getAdapter(name: string): AgentAdapter | undefined {
    return this.adapters.get(name);
  }

  getEntry(name: string): RegistryEntry | undefined {
    return this.entries.get(name);
  }

  all(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  healthy(): RegistryEntry[] {
    return this.all().filter(e => e.healthy);
  }

  link(from: string, to: string): void {
    const entry = this.entries.get(from);
    if (entry) {
      entry.reportsTo = to;
      this.persist();
    }
  }

  private persist(): void {
    const data: Record<string, RegistryEntry> = {};
    for (const [k, v] of this.entries) data[k] = v;
    fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2));
  }

  private loadPersisted(): void {
    if (!fs.existsSync(REGISTRY_FILE)) return;
    try {
      const data = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"));
      for (const [k, v] of Object.entries(data)) {
        this.entries.set(k, v as RegistryEntry);
      }
    } catch {}
  }
}

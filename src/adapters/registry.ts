/**
 * Adapter Registry — auto-discovery of all available adapters.
 *
 * To add a new adapter:
 * 1. Create the adapter file in adapters/
 * 2. Add the import and entry below
 * 3. cli.ts automatically picks it up
 */
import { AgentAdapter } from "../types";
import { CodexAdapter } from "./CodexAdapter";
import { ClaudeAdapter } from "./ClaudeAdapter";
import { HermesAdapter } from "./HermesAdapter";
import { OpenClawAdapter } from "./OpenClawAdapter";
import { MockCodexAdapter } from "./MockCodexAdapter";
import { MockClaudeAdapter } from "./MockClaudeAdapter";

export interface AdapterEntry {
  name: string;
  factory: () => AgentAdapter;
  mock?: () => AgentAdapter;
}

/**
 * All registered adapters. Add new adapters here.
 */
export const ADAPTER_REGISTRY: AdapterEntry[] = [
  { name: "codex", factory: () => new CodexAdapter(), mock: () => new MockCodexAdapter() },
  { name: "claude", factory: () => new ClaudeAdapter(), mock: () => new MockClaudeAdapter() },
  { name: "hermes", factory: () => new HermesAdapter() },
  { name: "openclaw", factory: () => new OpenClawAdapter() },
];

/**
 * Get all real adapter factories.
 */
export function getAllAdapters(): AgentAdapter[] {
  return ADAPTER_REGISTRY.map(e => e.factory());
}

/**
 * Get all mock adapter factories (for dry-run).
 */
export function getMockAdapters(): AgentAdapter[] {
  return ADAPTER_REGISTRY
    .filter(e => e.mock)
    .map(e => e.mock!());
}

/**
 * Get adapter names.
 */
export function getAdapterNames(): string[] {
  return ADAPTER_REGISTRY.map(e => e.name);
}

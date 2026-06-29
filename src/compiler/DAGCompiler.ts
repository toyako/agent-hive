/**
 * DAG Compiler — Intent Compiler Layer 6
 */

import { ModulePlan } from "./ModulePlanner";

export interface ExecutionDAG {
  nodes: string[];
  edges: [string, string][];
}

export class DAGCompiler {
  compile(plan: ModulePlan): ExecutionDAG {
    const nodes = [...plan.modules];
    const edges: [string, string][] = [];

    for (const [module, deps] of Object.entries(plan.dependencies)) {
      for (const dep of deps) {
        edges.push([dep, module]);
      }
    }

    return { nodes, edges };
  }
}

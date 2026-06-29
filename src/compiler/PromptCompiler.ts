/**
 * Prompt Compiler — Intent Compiler Layer 7
 */

import { ExecutionDAG } from "./DAGCompiler";

export interface NodePrompt {
  nodeId: string;
  role: "planner" | "developer" | "reviewer";
  promptTemplate: string;
  constraints: {
    outputFormat: "code" | "json" | "text";
    validationRules: string[];
  };
}

export class PromptCompiler {
  compile(dag: ExecutionDAG): NodePrompt[] {
    return dag.nodes.map(nodeId => ({
      nodeId,
      role: this.assignRole(nodeId),
      promptTemplate: this.generateTemplate(nodeId),
      constraints: {
        outputFormat: "code" as const,
        validationRules: ["must be valid", "must be complete"]
      }
    }));
  }

  private assignRole(nodeId: string): NodePrompt["role"] {
    if (nodeId.includes("Auth") || nodeId.includes("API")) return "developer";
    if (nodeId.includes("Review")) return "reviewer";
    return "planner";
  }

  private generateTemplate(nodeId: string): string {
    return `Implement ${nodeId} following best practices.`;
  }
}

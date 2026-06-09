import { AgentAdapter, AgentResult, Task } from "../types";

/**
 * Mock Codex Adapter
 * Simulates code execution with a small delay.
 * Returns deterministic output for testing.
 */
export class MockCodexAdapter implements AgentAdapter {
  name = "codex";
  role = "developer" as const;
  capabilities = ["coding", "refactor"];

  async detect(): Promise<boolean> {
    return true;
  }

  async health(): Promise<boolean> {
    return true;
  }

  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    // Simulate work
    await this.sleep(500);

    const instr = instruction || task.instruction;
    return {
      success: true,
      output: `[MockCodex] Completed: "${instr}"\nFiles modified: src/Component.vue, src/styles.css`,
      files: ["src/Component.vue", "src/styles.css"],
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}

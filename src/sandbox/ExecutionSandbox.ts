/**
 * ExecutionSandbox — validates AST before execution.
 * Rejects unsafe constructs, string commands, shell injection patterns.
 */
import { CommandAST } from "../command/CommandAST";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class ExecutionSandbox {
  /** Validate an AST for safety */
  validate(ast: CommandAST): ValidationResult {
    const errors: string[] = [];

    this.validateNode(ast, errors);

    return { valid: errors.length === 0, errors };
  }

  private validateNode(ast: CommandAST, errors: string[]): void {
    switch (ast.type) {
      case "exec":
        this.validateExec(ast, errors);
        break;
      case "sequence":
        for (const step of ast.steps) {
          this.validateNode(step, errors);
        }
        break;
      case "pipe":
        this.validateNode(ast.left, errors);
        this.validateNode(ast.right, errors);
        break;
      default:
        errors.push(`Unknown AST node type: ${(ast as any).type}`);
    }
  }

  private validateExec(ast: any, errors: string[]): void {
    // Reject if cmd is not a string
    if (typeof ast.cmd !== "string") {
      errors.push("cmd must be a string");
      return;
    }

    // Reject shell injection patterns in cmd
    if (ast.cmd.includes(";") || ast.cmd.includes("&&") || ast.cmd.includes("||")) {
      errors.push(`Unsafe shell injection pattern in cmd: ${ast.cmd}`);
    }

    // Reject shell injection patterns in args
    for (const arg of (ast.args || [])) {
      if (typeof arg !== "string") {
        errors.push("All args must be strings");
        continue;
      }
      if (arg.includes(";") || arg.includes("&&") || arg.includes("||")) {
        errors.push(`Unsafe shell injection pattern in arg: ${arg}`);
      }
    }

    // Reject empty cmd
    if (!ast.cmd.trim()) {
      errors.push("cmd cannot be empty");
    }
  }
}

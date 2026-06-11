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
    const dangerous = [";", "&&", "||", "|", ">", ">>", "<", "`", "$("];
    for (const pattern of dangerous) {
      if (ast.cmd.includes(pattern)) {
        errors.push(`Unsafe shell injection pattern in cmd: ${ast.cmd}`);
        break;
      }
    }

    // Args are safe — they're passed as literal strings, not interpreted by shell
    // No need to check args for injection patterns

    // Reject empty cmd
    if (!ast.cmd.trim()) {
      errors.push("cmd cannot be empty");
    }
  }
}

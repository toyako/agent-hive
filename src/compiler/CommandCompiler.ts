/**
 * CommandCompiler — compiles AST → platform executable descriptor.
 * No shell string concatenation. Pure descriptor output.
 */
import { CommandAST, ExecCommand, PipeCommand } from "../command/CommandAST";
import { PlatformCapabilities } from "../platform/PlatformCapabilities";

export interface CompiledCommand {
  platform: "windows" | "linux";
  executable: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
  shell: boolean;
}

export class CommandCompiler {
  private capabilities: PlatformCapabilities;

  constructor(capabilities: PlatformCapabilities) {
    this.capabilities = capabilities;
  }

  /** Compile an AST to a platform-specific descriptor */
  compile(ast: CommandAST): CompiledCommand[] {
    switch (ast.type) {
      case "exec":
        return [this.compileExec(ast)];
      case "sequence":
        return ast.steps.flatMap(s => this.compile(s));
      case "pipe":
        return [this.compilePipe(ast)];
    }
  }

  private compileExec(cmd: ExecCommand): CompiledCommand {
    const env = { ...process.env, ...cmd.env } as Record<string, string>;

    if (this.capabilities.pathStyle === "windows") {
      return {
        platform: "windows",
        executable: cmd.cmd,
        args: cmd.args,
        env,
        cwd: cmd.cwd,
        shell: this.capabilities.shell === "cmd",
      };
    }

    return {
      platform: "linux",
      executable: cmd.cmd,
      args: cmd.args,
      env,
      cwd: cmd.cwd,
      shell: false,
    };
  }

  private compilePipe(ast: PipeCommand): CompiledCommand {
    // Pipe is handled at execution level, not shell level
    // Return left side; execution engine handles piping
    const left = this.compileExec(ast.left as ExecCommand);
    return { ...left, shell: false };
  }
}

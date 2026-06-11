/**
 * ExecutionEngine v1.1 — AST-driven deterministic execution kernel.
 * No raw shell strings. All commands are compiled AST nodes.
 */
import { spawn } from "child_process";
import { CommandAST, ExecCommand } from "../command/CommandAST";
import { CommandCompiler, CompiledCommand } from "../compiler/CommandCompiler";
import { detectCapabilities, PlatformCapabilities } from "../platform/PlatformCapabilities";
import { ExecutionSandbox } from "../sandbox/ExecutionSandbox";
import { StructuredLogger } from "./StructuredLogger";
import { ResultNormalizer } from "./ResultNormalizer";

export interface ExecutionContext {
  traceId: string;
  timeout: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  platform: string;
  compiledCommand: CompiledCommand;
  traceId: string;
}

export class ExecutionEngine {
  private capabilities: PlatformCapabilities;
  private compiler: CommandCompiler;
  private sandbox: ExecutionSandbox;
  private logger: StructuredLogger;

  constructor(logger?: StructuredLogger) {
    this.capabilities = detectCapabilities();
    this.compiler = new CommandCompiler(this.capabilities);
    this.sandbox = new ExecutionSandbox();
    this.logger = logger || new StructuredLogger();
  }

  /** Execute an AST node */
  async run(ast: CommandAST, ctx: Partial<ExecutionContext> = {}): Promise<ExecutionResult> {
    const traceId = ctx.traceId || `trace-${Date.now().toString(36)}`;
    const timeout = ctx.timeout || 600_000;
    const startTime = Date.now();

    // Step 1: Validate AST
    const validation = this.sandbox.validate(ast);
    if (!validation.valid) {
      const err = `AST validation failed: ${validation.errors.join(", ")}`;
      this.logger.log({ timestamp: startTime, platform: this.capabilities.pathStyle === "windows" ? "windows" : "linux", command: "INVALID", stage: "error", error: err, traceId });
      return { stdout: "", stderr: err, exitCode: 1, durationMs: 0, platform: this.capabilities.pathStyle, compiledCommand: { platform: "linux", executable: "", args: [], env: {}, shell: false }, traceId };
    }

    // Step 2: Compile AST → CompiledCommand
    const compiled = this.compiler.compile(ast);
    const primary = compiled[0];

    this.logger.log({
      timestamp: startTime,
      platform: primary.platform,
      command: `${primary.executable} ${primary.args.join(" ")}`,
      stage: "compiled",
      compiledCommand: primary,
      traceId,
    });

    // Step 3: Execute
    try {
      const raw = await this.execCompiled(primary, timeout);
      const durationMs = Date.now() - startTime;

      // Step 4: Normalize BEFORE logging
      const normalized = ResultNormalizer.normalize(raw.stdout, raw.stderr, primary.platform as "windows" | "linux");

      // Step 5: Log normalized result
      this.logger.log({
        timestamp: Date.now(),
        platform: primary.platform,
        command: `${primary.executable} ${primary.args.join(" ")}`,
        stage: "complete",
        exitCode: raw.exitCode,
        durationMs,
        traceId,
      });

      return {
        stdout: normalized.stdout,
        stderr: normalized.stderr,
        exitCode: raw.exitCode,
        durationMs,
        platform: primary.platform,
        compiledCommand: primary,
        traceId,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.logger.log({ timestamp: Date.now(), platform: primary.platform, command: `${primary.executable} ${primary.args.join(" ")}`, stage: "error", error: err.message, durationMs, traceId });
      return { stdout: "", stderr: err.message, exitCode: 1, durationMs, platform: primary.platform, compiledCommand: primary, traceId };
    }
  }

  /** Legacy: run a simple command (convenience wrapper) */
  async runCommand(cmd: string, args: string[], ctx: Partial<ExecutionContext> = {}): Promise<ExecutionResult> {
    const { exec } = await import("../command/CommandAST");
    return this.run(exec(cmd, args), ctx);
  }

  private execCompiled(cmd: CompiledCommand, timeout: number): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd.executable, cmd.args, {
        cwd: cmd.cwd,
        env: cmd.env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: cmd.shell,
      });

      let stdout = "", stderr = "";
      proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
      proc.stderr.on("data", (d: Buffer) => stderr += d.toString());

      const timer = setTimeout(() => { proc.kill("SIGTERM"); reject(new Error(`TIMEOUT after ${timeout}ms`)); }, timeout);

      proc.on("close", (code: number | null) => {
        clearTimeout(timer);
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 1 });
      });

      proc.on("error", (err: Error) => { clearTimeout(timer); reject(err); });
    });
  }
}

/**
 * ExecutionEngine — unified command execution for all platforms.
 * All CLI commands go through this engine.
 */
import { spawn } from "child_process";
import { PlatformAdapter } from "./PlatformAdapter";
import { StructuredLogger } from "./StructuredLogger";
import { ResultNormalizer } from "./ResultNormalizer";

export interface ExecutionContext {
  platform: "windows" | "linux";
  cwd: string;
  env: Record<string, string>;
  timeout: number;
  traceId: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  platform: string;
  normalizedCommand: string;
  traceId: string;
}

export class ExecutionEngine {
  private platform: PlatformAdapter;
  private logger: StructuredLogger;

  constructor(logger?: StructuredLogger) {
    this.platform = new PlatformAdapter();
    this.logger = logger || new StructuredLogger();
  }

  /** Execute a command with full context tracking */
  async runCommand(cmd: string, args: string[], ctx: Partial<ExecutionContext> = {}): Promise<ExecutionResult> {
    const traceId = ctx.traceId || `trace-${Date.now().toString(36)}`;
    const startTime = Date.now();

    const fullCtx: ExecutionContext = {
      platform: this.platform.detect(),
      cwd: ctx.cwd || process.cwd(),
      env: ctx.env || { ...process.env } as Record<string, string>,
      timeout: ctx.timeout || 600_000,
      traceId,
    };

    const normalizedCmd = this.platform.normalizeCommand(cmd);

    this.logger.log({
      timestamp: startTime,
      platform: fullCtx.platform,
      command: `${cmd} ${args.join(" ")}`,
      stage: "start",
      traceId,
    });

    try {
      const result = await this.exec(normalizedCmd, args, fullCtx);
      const durationMs = Date.now() - startTime;

      const normalized = ResultNormalizer.normalize(result.stdout, result.stderr, fullCtx.platform);

      const execResult: ExecutionResult = {
        stdout: normalized.stdout,
        stderr: normalized.stderr,
        exitCode: result.exitCode,
        durationMs,
        platform: fullCtx.platform,
        normalizedCommand: `${cmd} ${args.join(" ")}`,
        traceId,
      };

      this.logger.log({
        timestamp: Date.now(),
        platform: fullCtx.platform,
        command: execResult.normalizedCommand,
        stage: "complete",
        exitCode: execResult.exitCode,
        durationMs: execResult.durationMs,
        traceId,
      });

      return execResult;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;

      this.logger.log({
        timestamp: Date.now(),
        platform: fullCtx.platform,
        command: `${cmd} ${args.join(" ")}`,
        stage: "error",
        error: err.message,
        durationMs,
        traceId,
      });

      return {
        stdout: "",
        stderr: err.message,
        exitCode: 1,
        durationMs,
        platform: fullCtx.platform,
        normalizedCommand: `${cmd} ${args.join(" ")}`,
        traceId,
      };
    }
  }

  private exec(cmd: string, args: string[], ctx: ExecutionContext): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        cwd: ctx.cwd,
        env: ctx.env,
        stdio: ["pipe", "pipe", "pipe"],
        shell: ctx.platform === "windows",
      });

      let stdout = "", stderr = "";
      proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
      proc.stderr.on("data", (d: Buffer) => stderr += d.toString());

      const timer = setTimeout(() => {
        proc.kill("SIGTERM");
        reject(new Error(`TIMEOUT after ${ctx.timeout}ms`));
      }, ctx.timeout);

      proc.on("close", (code: number | null) => {
        clearTimeout(timer);
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 1 });
      });

      proc.on("error", (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}

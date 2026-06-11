/**
 * PlatformAdapter — isolates all OS-specific differences.
 * CLI Core must never directly build shell commands.
 */
import * as path from "path";
import * as os from "os";

export class PlatformAdapter {
  /** Detect current platform */
  detect(): "windows" | "linux" {
    return os.platform() === "win32" ? "windows" : "linux";
  }

  /** Normalize a command for the current platform */
  normalizeCommand(cmd: string): string {
    if (this.detect() === "windows") {
      // Windows: handle .cmd/.exe extensions
      if (cmd.endsWith(".cmd") || cmd.endsWith(".exe")) return cmd;
      return cmd;
    }
    return cmd;
  }

  /** Build a command with proper platform handling */
  buildCommand(cmd: string, args: string[]): { cmd: string; args: string[]; shell: boolean } {
    if (this.detect() === "windows") {
      return { cmd: "cmd", args: ["/c", cmd, ...args], shell: true };
    }
    return { cmd, args, shell: false };
  }

  /** Normalize path separators */
  normalizePath(p: string): string {
    if (this.detect() === "windows") {
      return p.replace(/\//g, "\\");
    }
    return p.replace(/\\/g, "/");
  }

  /** Normalize line endings */
  normalizeLineEndings(text: string): string {
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  /** Get platform-specific env separator */
  envSeparator(): string {
    return this.detect() === "windows" ? ";" : ":";
  }
}

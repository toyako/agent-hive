/**
 * PlatformCapabilities — declarative platform capability description.
 * No if (platform === ...) checks. All behavior driven by capabilities.
 */
import * as os from "os";

export interface PlatformCapabilities {
  shell: "cmd" | "bash" | "pwsh";
  supportsPipe: boolean;
  supportsSequence: boolean;
  pathStyle: "windows" | "unix";
  encoding: "utf-8";
  lineEnding: "\r\n" | "\n";
  envSeparator: ";" | ":";
}

/** Detect current platform capabilities */
export function detectCapabilities(): PlatformCapabilities {
  const isWindows = os.platform() === "win32";

  if (isWindows) {
    return {
      shell: "cmd",
      supportsPipe: true,
      supportsSequence: true,
      pathStyle: "windows",
      encoding: "utf-8",
      lineEnding: "\r\n",
      envSeparator: ";",
    };
  }

  return {
    shell: "bash",
    supportsPipe: true,
    supportsSequence: true,
    pathStyle: "unix",
    encoding: "utf-8",
    lineEnding: "\n",
    envSeparator: ":",
  };
}

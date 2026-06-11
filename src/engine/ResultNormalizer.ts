/**
 * ResultNormalizer — normalize output across platforms.
 * Solves: Windows vs Linux output differences causing agent misjudgment.
 */

export interface NormalizedOutput {
  stdout: string;
  stderr: string;
}

export class ResultNormalizer {
  /** Normalize stdout and stderr for cross-platform consistency */
  static normalize(stdout: string, stderr: string, platform: "windows" | "linux"): NormalizedOutput {
    return {
      stdout: this.normalizeText(stdout, platform),
      stderr: this.normalizeText(stderr, platform),
    };
  }

  /** Normalize a single text block */
  static normalizeText(text: string, platform: "windows" | "linux"): string {
    let result = text;

    // 1. Line ending normalization: CRLF → LF
    result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // 2. Path normalization: Windows paths → forward slashes
    result = result.replace(/([A-Z]):\\([\w\\]+)/g, (_, drive, rest) => {
      return `/${drive.toLowerCase()}/${rest.replace(/\\/g, "/")}`;
    });

    // 3. Remove trailing whitespace per line
    result = result.split("\n").map(l => l.trimEnd()).join("\n");

    // 4. Remove excessive blank lines (more than 2)
    result = result.replace(/\n{3,}/g, "\n\n");

    // 5. Trim
    result = result.trim();

    return result;
  }

  /** Compare two normalized outputs for equality */
  static compare(a: NormalizedOutput, b: NormalizedOutput): { match: boolean; diffs: string[] } {
    const diffs: string[] = [];

    if (a.stdout !== b.stdout) {
      diffs.push(`stdout: ${this.countDiffLines(a.stdout, b.stdout)} lines differ`);
    }

    if (a.stderr !== b.stderr) {
      diffs.push(`stderr: ${this.countDiffLines(a.stderr, b.stderr)} lines differ`);
    }

    return { match: diffs.length === 0, diffs };
  }

  private static countDiffLines(a: string, b: string): number {
    const aLines = a.split("\n");
    const bLines = b.split("\n");
    const maxLen = Math.max(aLines.length, bLines.length);
    let diffs = 0;
    for (let i = 0; i < maxLen; i++) {
      if (aLines[i] !== bLines[i]) diffs++;
    }
    return diffs;
  }
}

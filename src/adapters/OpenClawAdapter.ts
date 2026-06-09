import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { AgentAdapter, AgentResult, ReviewResult, Task, MessageEnvelope } from "../types";
import { extractJson, normalizeText } from "../utils/OutputNormalizer";

const OPENCLAW_BIN = findBinary("openclaw");

const REVIEWER_PROMPT = fs.readFileSync(path.join(__dirname, "../prompts/reviewer.txt"), "utf-8");

function findBinary(name: string): string {
  // Check WSL paths first
  const hermesPath = path.join(process.env.HOME || "/home/liu", ".hermes/node/bin", name);
  if (fs.existsSync(hermesPath)) return hermesPath;

  // Check common Windows paths via /mnt/c
  const winPaths = [
    "/mnt/c/Program Files/nodejs/" + name,
    "/mnt/c/Program Files/nodejs/" + name + ".cmd",
  ];
  for (const wp of winPaths) {
    if (fs.existsSync(wp)) return wp;
  }

  return name;
}

export class OpenClawAdapter implements AgentAdapter {
  name = "openclaw";
  role = "reviewer" as const;
  capabilities = ["review", "code-analysis", "security-scan", "refactor"];
  version = "0.2.0";

  async detect(): Promise<boolean> {
    try {
      const result = await this.exec(OPENCLAW_BIN, ["--version"], {}, 5000);
      return result.exitCode === 0 && result.stdout.includes("OpenClaw");
    } catch {
      return false;
    }
  }

  async health(): Promise<boolean> {
    // Check if gateway is running via `openclaw health`
    // If gateway is down, return false (degraded, not crash)
    try {
      const result = await this.exec(OPENCLAW_BIN, ["health"], {}, 8000);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    const prompt = instruction || task.instruction;
    const cwd = task.workingDirectory || process.cwd();

    // `openclaw agent` runs one agent turn via the Gateway
    const args = ["agent", "-p", prompt];

    try {
      const result = await this.exec(OPENCLAW_BIN, args, { cwd }, task.timeout);
      if (result.exitCode === 0) {
        return { success: true, output: result.stdout || "[OpenClaw] Completed" };
      } else {
        return { success: false, output: result.stdout || "", error: result.stderr || `Exit code: ${result.exitCode}` };
      }
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  }

  async review(task: Task): Promise<ReviewResult> {
    const cwd = task.workingDirectory || process.cwd();
    const resultContext = task.result || "No execution result available";

    const prompt = `${REVIEWER_PROMPT}

---

执行结果：
${normalizeText(resultContext)}

---

请审核以上结果并返回 JSON。`;

    const args = ["agent", "-p", prompt];

    try {
      const result = await this.exec(OPENCLAW_BIN, args, { cwd }, task.timeout);

      if (result.exitCode !== 0) {
        return { decision: "FAIL", score: 0, issues: [`OpenClaw CLI error: ${result.stderr || "unknown"}`] };
      }

      const parsed = extractJson(result.stdout);
      if (parsed && parsed.decision) {
        return {
          decision: parsed.decision === "PASS" ? "PASS" : "FAIL",
          score: typeof parsed.score === "number" ? parsed.score : 0,
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        };
      }

      const text = result.stdout.toLowerCase();
      if (text.includes('"pass"')) return { decision: "PASS", score: 75, issues: [] };

      return { decision: "FAIL", score: 30, issues: ["Could not parse structured review output", result.stdout.slice(0, 200)] };
    } catch (err: any) {
      return { decision: "FAIL", score: 0, issues: [`Review execution failed: ${err.message}`] };
    }
  }

  async converse(messages: MessageEnvelope[]): Promise<MessageEnvelope> {
    const context = messages.map(m => `[${m.from}]: ${typeof m.payload === 'string' ? m.payload : JSON.stringify(m.payload)}`).join("\n\n");
    const lastMsg = messages[messages.length - 1];

    try {
      const result = await this.exec(OPENCLAW_BIN, ["agent", "-p", context], {}, 120_000);
      return {
        id: `conv-${Date.now()}`,
        taskId: lastMsg.taskId,
        conversationId: lastMsg.conversationId,
        from: "openclaw",
        to: lastMsg.from,
        type: "CONVERSATION_MESSAGE",
        payload: result.stdout || "[OpenClaw] No response",
        metadata: {
          hopCount: lastMsg.metadata.hopCount + 1,
          maxHops: lastMsg.metadata.maxHops,
          priority: lastMsg.metadata.priority,
          routingPath: [...lastMsg.metadata.routingPath, "openclaw"],
        },
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        id: `conv-err-${Date.now()}`,
        taskId: lastMsg.taskId,
        conversationId: lastMsg.conversationId,
        from: "openclaw",
        to: lastMsg.from,
        type: "ERROR",
        payload: `Converse failed: ${err.message}`,
        metadata: {
          hopCount: lastMsg.metadata.hopCount + 1,
          maxHops: lastMsg.metadata.maxHops,
          priority: lastMsg.metadata.priority,
          routingPath: [...lastMsg.metadata.routingPath, "openclaw"],
        },
        timestamp: Date.now(),
      };
    }
  }

  supportsFeature(feature: string): boolean {
    return this.capabilities.includes(feature);
  }

  private exec(cmd: string, args: string[], opts: { cwd?: string }, timeout: number = 600_000) {
    return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
      const proc = spawn(cmd, args, { cwd: opts.cwd, env: { ...process.env }, stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
      proc.stderr.on("data", (d: Buffer) => stderr += d.toString());
      const timer = setTimeout(() => { proc.kill("SIGTERM"); reject(new Error(`TIMEOUT after ${timeout}ms`)); }, timeout);
      proc.on("close", (code: number | null) => { clearTimeout(timer); resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 1 }); });
      proc.on("error", (err: Error) => { clearTimeout(timer); reject(err); });
    });
  }
}

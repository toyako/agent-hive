import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import OpenAI from "openai";
import { AgentAdapter, AgentResult, ReviewResult, Task, MessageEnvelope } from "../types";
import { extractJson, normalizeText } from "../utils/OutputNormalizer";
import { loadAdapterConfig } from "../runtime/RuntimeConfig";

const HERMES_BIN = findBinary("hermes");

const REVIEWER_PROMPT = fs.readFileSync(path.join(__dirname, "../prompts/reviewer.txt"), "utf-8");

function findBinary(name: string): string {
  const localPath = path.join(process.env.HOME || "/home/liu", ".local/bin", name);
  if (fs.existsSync(localPath)) return localPath;
  const hermesPath = path.join(process.env.HOME || "/home/liu", ".hermes/node/bin", name);
  if (fs.existsSync(hermesPath)) return hermesPath;
  return name;
}

function loadRuntimeConfig(): { model: string; apiKey: string; baseURL: string } {
  return loadAdapterConfig("hermes", "OPENAI");
}

function createClient(): OpenAI {
  const cfg = loadRuntimeConfig();
  return new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
}

export class HermesAdapter implements AgentAdapter {
  name = "hermes";
  role = "planner" as const;
  capabilities = ["planning", "coding", "review", "research"];
  version = "0.15.1";

  async detect(): Promise<boolean> {
    // Try CLI first
    try {
      const result = await this.exec(HERMES_BIN, ["--version"], {}, 5000);
      if (result.exitCode === 0 && result.stdout.includes("Hermes")) return true;
    } catch {}
    // Fallback: check API key
    const cfg = loadRuntimeConfig();
    return !!cfg.apiKey;
  }

  async health(): Promise<boolean> {
    try {
      const cfg = loadRuntimeConfig();
      if (!cfg.apiKey) return false;
      const client = createClient();
      const res = await client.chat.completions.create({
        model: cfg.model,
        messages: [
          { role: "system", content: "You are a health check probe." },
          { role: "user", content: 'Return this exact JSON: {"runtime":"working","number":17}' },
        ],
        max_tokens: 100,
      });
      const content = res.choices[0]?.message?.content || "";
      const parsed = extractJson(content);
      return !!(parsed && parsed.runtime === "working" && parsed.number === 17);
    } catch {
      return false;
    }
  }

  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    const prompt = instruction || task.instruction;
    const cfg = loadRuntimeConfig();

    try {
      const client = createClient();
      const res = await client.chat.completions.create({
        model: cfg.model,
        messages: [
          { role: "system", content: "You are a planning and execution assistant. Produce clear, actionable output." },
          { role: "user", content: prompt },
        ],
        max_tokens: 16000,
      });

      let content = res.choices[0]?.message?.content || "";
      if (!content && (res.choices[0]?.message as any)?.reasoning_content) {
        content = (res.choices[0]?.message as any).reasoning_content;
      }

      if (content) return { success: true, output: content };
      return { success: false, output: "", error: "Empty response from model" };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  }

  async review(task: Task): Promise<ReviewResult> {
    const resultContext = task.result || "No execution result available";
    const cfg = loadRuntimeConfig();

    const prompt = `${REVIEWER_PROMPT}

---

执行结果：
${normalizeText(resultContext)}

---

请审核以上结果并返回 JSON。`;

    try {
      const client = createClient();
      const res = await client.chat.completions.create({
        model: cfg.model,
        messages: [
          { role: "system", content: "You are a code reviewer. Return structured JSON reviews." },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
      });

      let content = res.choices[0]?.message?.content || "";
      if (!content && (res.choices[0]?.message as any)?.reasoning_content) {
        content = (res.choices[0]?.message as any).reasoning_content;
      }

      const parsed = extractJson(content);
      if (parsed && parsed.decision) {
        return {
          decision: parsed.decision === "PASS" ? "PASS" : "FAIL",
          score: typeof parsed.score === "number" ? parsed.score : 0,
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        };
      }

      const text = content.toLowerCase();
      if (text.includes('"pass"')) return { decision: "PASS", score: 75, issues: [] };

      return { decision: "FAIL", score: 30, issues: ["Could not parse structured review output", content.slice(0, 200)] };
    } catch (err: any) {
      return { decision: "FAIL", score: 0, issues: [`Review execution failed: ${err.message}`] };
    }
  }

  async converse(messages: MessageEnvelope[]): Promise<MessageEnvelope> {
    const cfg = loadRuntimeConfig();
    const lastMsg = messages[messages.length - 1];
    const chatMessages = messages.map(m => ({
      role: (m.from === "hermes" ? "assistant" : "user") as "assistant" | "user",
      content: typeof m.payload === "string" ? m.payload : JSON.stringify(m.payload),
    }));

    try {
      const client = createClient();
      const res = await client.chat.completions.create({ model: cfg.model, messages: chatMessages, max_tokens: 8000 });
      let content = res.choices[0]?.message?.content || "";
      if (!content && (res.choices[0]?.message as any)?.reasoning_content) {
        content = (res.choices[0]?.message as any).reasoning_content;
      }

      return {
        id: `conv-${Date.now()}`, taskId: lastMsg.taskId, conversationId: lastMsg.conversationId,
        from: "hermes", to: lastMsg.from, type: "CONVERSATION_MESSAGE",
        payload: content || "[Hermes] No response",
        metadata: { hopCount: lastMsg.metadata.hopCount + 1, maxHops: lastMsg.metadata.maxHops, priority: lastMsg.metadata.priority, routingPath: [...lastMsg.metadata.routingPath, "hermes"] },
        timestamp: Date.now(),
      };
    } catch (err: any) {
      return {
        id: `conv-err-${Date.now()}`, taskId: lastMsg.taskId, conversationId: lastMsg.conversationId,
        from: "hermes", to: lastMsg.from, type: "ERROR", payload: `Converse failed: ${err.message}`,
        metadata: { hopCount: lastMsg.metadata.hopCount + 1, maxHops: lastMsg.metadata.maxHops, priority: lastMsg.metadata.priority, routingPath: [...lastMsg.metadata.routingPath, "hermes"] },
        timestamp: Date.now(),
      };
    }
  }

  supportsFeature?(feature: string): boolean {
    return this.capabilities.includes(feature);
  }

  private exec(cmd: string, args: string[], opts: { cwd?: string }, timeout: number = 600_000) {
    return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
      const env = { ...process.env, HERMES_QUIET: "1", HERMES_MAX_ITERATIONS: "1" };
      const proc = spawn(cmd, args, { cwd: opts.cwd, env, stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      proc.stdout.on("data", (d: Buffer) => stdout += d.toString());
      proc.stderr.on("data", (d: Buffer) => stderr += d.toString());
      const timer = setTimeout(() => { proc.kill("SIGTERM"); reject(new Error(`TIMEOUT after ${timeout}ms`)); }, timeout);
      proc.on("close", (code: number | null) => { clearTimeout(timer); resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 1 }); });
      proc.on("error", (err: Error) => { clearTimeout(timer); reject(err); });
    });
  }
}

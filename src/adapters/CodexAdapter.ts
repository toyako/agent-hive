import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { AgentAdapter, AgentResult, ReviewResult, Task } from "../types";
import { extractJson, normalizeText } from "../utils/OutputNormalizer";
import { loadAdapterConfig } from "../runtime/RuntimeConfig";

const REVIEWER_PROMPT = fs.readFileSync(path.join(__dirname, "../prompts/reviewer.txt"), "utf-8");

const HEALTH_PROMPT = `Create JSON:

{"runtime":"working","number":17}

Return JSON only.`;

function loadConfig(): { apiKey: string; baseURL: string; model: string } {
  return loadAdapterConfig("codex", "OPENAI");
}

export class CodexAdapter implements AgentAdapter {
  name = "codex";
  role = "developer" as const;
  capabilities = ["coding", "refactor"];
  version = "2.1.0";

  private client: OpenAI | null = null;
  private config = loadConfig();

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
      });
    }
    return this.client;
  }

  async detect(): Promise<boolean> {
    // Only check if API key exists — don't make API calls
    // API verification is done by health()
    return !!this.config.apiKey;
  }

  async health(): Promise<boolean> {
    try {
      const result = await this.chat(HEALTH_PROMPT);
      const parsed = extractJson(result);
      return !!(parsed && parsed.runtime === "working" && parsed.number === 17);
    } catch {
      return false;
    }
  }

  async execute(task: Task, instruction?: string): Promise<AgentResult> {
    const prompt = instruction || task.instruction;
    try {
      const output = await this.chat(prompt);
      return { success: true, output: output || "[Codex] Completed" };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };
    }
  }

  async review(task: Task): Promise<ReviewResult> {
    const resultContext = task.result || "No execution result available";
    const prompt = `${REVIEWER_PROMPT}

---

执行结果：
${normalizeText(resultContext)}

---

请审核以上结果并返回 JSON。`;

    try {
      const output = await this.chat(prompt);
      const parsed = extractJson(output);
      if (parsed && parsed.decision) {
        return {
          decision: parsed.decision === "PASS" ? "PASS" : "FAIL",
          score: typeof parsed.score === "number" ? parsed.score : 0,
          issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        };
      }
      const text = output.toLowerCase();
      if (text.includes('"pass"')) return { decision: "PASS", score: 75, issues: [] };
      return { decision: "FAIL", score: 30, issues: ["Could not parse structured review output", output.slice(0, 200)] };
    } catch (err: any) {
      return { decision: "FAIL", score: 0, issues: [`Review execution failed: ${err.message}`] };
    }
  }

  private async chat(prompt: string): Promise<string> {
    const client = this.getClient();
    const res = await client.chat.completions.create({
      model: this.config.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    });
    const msg = res.choices?.[0]?.message;
    // Mimo API returns response in reasoning_content for reasoning models
    // Check both content and reasoning_content
    return msg?.content || (msg as any)?.reasoning_content || "";
  }
}

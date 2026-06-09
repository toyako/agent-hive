import * as fs from "fs";
import * as path from "path";

const TRACES_DIR = path.resolve(process.cwd(), ".agent-hive/traces");

export interface TraceMessage {
  from: string;
  to: string;
  type: string;
  payload: string;
  timestamp: number;
}

export interface ConversationTraceRecord {
  conversationId: string;
  taskId: string;
  messages: TraceMessage[];
  startedAt: number;
}

export class ConversationTrace {
  private traces: Map<string, ConversationTraceRecord> = new Map();

  constructor() {
    fs.mkdirSync(TRACES_DIR, { recursive: true });
    this.loadPersisted();
  }

  start(conversationId: string, taskId: string): void {
    this.traces.set(conversationId, {
      conversationId,
      taskId,
      messages: [],
      startedAt: Date.now(),
    });
  }

  record(conversationId: string, msg: TraceMessage): void {
    const trace = this.traces.get(conversationId);
    if (!trace) return;
    trace.messages.push(msg);
    this.persist(trace);
  }

  get(conversationId: string): ConversationTraceRecord | undefined {
    return this.traces.get(conversationId);
  }

  getByTaskId(taskId: string): ConversationTraceRecord | undefined {
    return Array.from(this.traces.values()).find(t => t.taskId === taskId);
  }

  format(conversationId: string): string {
    const trace = this.traces.get(conversationId);
    if (!trace) return `No trace found for ${conversationId}`;

    const lines: string[] = [];
    lines.push(`Conversation: ${trace.conversationId}`);
    lines.push(`Task: ${trace.taskId}`);
    lines.push(`Messages: ${trace.messages.length}`);
    lines.push("");

    for (const msg of trace.messages) {
      const relTime = msg.timestamp - trace.startedAt;
      lines.push(`  +${relTime}ms  ${msg.from} → ${msg.to} [${msg.type}]`);
      lines.push(`           ${msg.payload.slice(0, 100)}`);
    }

    return lines.join("\n");
  }

  private persist(trace: ConversationTraceRecord): void {
    const fp = path.join(TRACES_DIR, `conversation-${trace.conversationId}.json`);
    fs.writeFileSync(fp, JSON.stringify(trace, null, 2));
  }

  private loadPersisted(): void {
    if (!fs.existsSync(TRACES_DIR)) return;
    for (const f of fs.readdirSync(TRACES_DIR)) {
      if (!f.startsWith("conversation-") || !f.endsWith(".json")) continue;
      try {
        const trace = JSON.parse(fs.readFileSync(path.join(TRACES_DIR, f), "utf-8"));
        this.traces.set(trace.conversationId, trace);
      } catch {}
    }
  }
}

import { EventEmitter } from "events";
import { AgentMessage, MessageEnvelope, MessageType } from "../types";

/**
 * MessageBus v2.0
 *
 * Enhanced message bus supporting both v1.1 AgentMessage and v2.0 MessageEnvelope.
 * All messages are persisted to disk.
 */
export class MessageBus extends EventEmitter {
  private messages: AgentMessage[] = [];
  private envelopes: MessageEnvelope[] = [];
  private messagesDir: string;

  constructor() {
    super();
    const fs = require("fs");
    const path = require("path");
    this.messagesDir = path.resolve(process.cwd(), ".agent-hive/messages");
    fs.mkdirSync(this.messagesDir, { recursive: true });
  }

  // ─── v1.1 API (backward compatible) ───────────────

  send(from: string, to: string, taskId: string, type: MessageType, payload: any): AgentMessage {
    const msg: AgentMessage = {
      id: `msg-${Date.now().toString(36)}`,
      taskId,
      from,
      to,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.messages.push(msg);
    this.persist(msg);
    this.emit("message", msg);
    this.emit(type, msg);
    return msg;
  }

  // ─── v2.0 API (envelope-based) ────────────────────

  sendEnvelope(envelope: MessageEnvelope): void {
    this.envelopes.push(envelope);
    this.persistEnvelope(envelope);
    this.emit("envelope", envelope);
    this.emit(envelope.type, envelope);
    // Also emit as v1.1 message for compatibility
    this.emit("message", {
      id: envelope.id,
      taskId: envelope.taskId,
      from: envelope.from,
      to: envelope.to,
      type: envelope.type,
      payload: envelope.payload,
      timestamp: envelope.timestamp,
    });
  }

  // ─── Query ────────────────────────────────────────

  history(taskId?: string): AgentMessage[] {
    if (!taskId) return [...this.messages];
    return this.messages.filter(m => m.taskId === taskId);
  }

  envelopeHistory(taskId?: string): MessageEnvelope[] {
    if (!taskId) return [...this.envelopes];
    return this.envelopes.filter(m => m.taskId === taskId);
  }

  conversationHistory(conversationId: string): MessageEnvelope[] {
    return this.envelopes.filter(m => m.conversationId === conversationId);
  }

  // ─── Persistence ──────────────────────────────────

  private persist(msg: AgentMessage): void {
    const fs = require("fs");
    const path = require("path");
    const fp = path.join(this.messagesDir, `${msg.id}.json`);
    fs.writeFileSync(fp, JSON.stringify(msg, null, 2));
  }

  private persistEnvelope(envelope: MessageEnvelope): void {
    const fs = require("fs");
    const path = require("path");
    const fp = path.join(this.messagesDir, `${envelope.id}.json`);
    fs.writeFileSync(fp, JSON.stringify(envelope, null, 2));
  }
}

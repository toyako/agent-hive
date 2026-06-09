import { Conversation, MessageEnvelope, MessageType } from "../types";
import { uuid } from "../utils/uuid";
import * as fs from "fs";
import * as path from "path";

const CONVERSATIONS_DIR = path.resolve(process.cwd(), ".agent-hive/conversations");

/**
 * ConversationManager
 *
 * Manages multi-turn conversations between agents.
 * Each conversation is a sequence of messages between participants.
 */
export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private conversationsDir: string;

  constructor(baseDir?: string) {
    this.conversationsDir = baseDir || CONVERSATIONS_DIR;
    fs.mkdirSync(this.conversationsDir, { recursive: true });
    this.loadPersisted();
  }

  /**
   * Create a new conversation.
   */
  create(taskId: string, participants: string[]): Conversation {
    const conv: Conversation = {
      id: `conv-${uuid()}`,
      taskId,
      participants,
      messages: [],
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.conversations.set(conv.id, conv);
    this.persist(conv);
    return conv;
  }

  /**
   * Add a message to a conversation.
   */
  addMessage(conversationId: string, msg: MessageEnvelope): void {
    const conv = this.conversations.get(conversationId);
    if (!conv) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    if (conv.status !== "active") {
      throw new Error(`Conversation is not active: ${conversationId} (status: ${conv.status})`);
    }

    conv.messages.push(msg);
    conv.updatedAt = Date.now();

    // Ensure participant is tracked
    if (!conv.participants.includes(msg.from)) {
      conv.participants.push(msg.from);
    }

    this.persist(conv);
  }

  /**
   * Get a conversation by id.
   */
  get(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get all conversations for a task.
   */
  getByTask(taskId: string): Conversation[] {
    return Array.from(this.conversations.values()).filter(c => c.taskId === taskId);
  }

  /**
   * Get message history for a conversation.
   */
  getMessages(conversationId: string): MessageEnvelope[] {
    const conv = this.conversations.get(conversationId);
    return conv ? [...conv.messages] : [];
  }

  /**
   * Complete a conversation.
   */
  complete(conversationId: string): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.status = "completed";
      conv.updatedAt = Date.now();
      this.persist(conv);
    }
  }

  /**
   * Fail a conversation.
   */
  fail(conversationId: string, reason?: string): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.status = "failed";
      conv.updatedAt = Date.now();
      this.persist(conv);
    }
  }

  /**
   * Timeout a conversation.
   */
  timeout(conversationId: string): void {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.status = "timeout";
      conv.updatedAt = Date.now();
      this.persist(conv);
    }
  }

  /**
   * Get all active conversations.
   */
  active(): Conversation[] {
    return Array.from(this.conversations.values()).filter(c => c.status === "active");
  }

  /**
   * Get all conversations.
   */
  all(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  // ─── Persistence ──────────────────────────────────

  private persist(conv: Conversation): void {
    const fp = path.join(this.conversationsDir, `${conv.id}.json`);
    fs.writeFileSync(fp, JSON.stringify(conv, null, 2));
  }

  private loadPersisted(): void {
    if (!fs.existsSync(this.conversationsDir)) return;
    try {
      const files = fs.readdirSync(this.conversationsDir).filter(f => f.endsWith(".json"));
      for (const f of files) {
        const conv: Conversation = JSON.parse(
          fs.readFileSync(path.join(this.conversationsDir, f), "utf-8")
        );
        this.conversations.set(conv.id, conv);
      }
    } catch {
      // Corrupted files, start fresh
    }
  }
}

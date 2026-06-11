/**
 * ChannelPlugin — interface for communication channel plugins.
 * Channels: CLI, Telegram, Discord, Feishu, WeChat, etc.
 */

export interface ChannelPlugin {
  name: string;
  status: "active" | "disabled" | "coming-soon";

  /** Connect to the channel */
  connect(config: ChannelConfig): Promise<boolean>;

  /** Send a message */
  sendMessage(target: string, message: string): Promise<boolean>;

  /** Receive a message (callback) */
  onMessage(handler: (message: ChannelMessage) => void): void;

  /** Disconnect */
  disconnect(): Promise<void>;
}

export interface ChannelConfig {
  token?: string;
  webhookUrl?: string;
  channelId?: string;
}

export interface ChannelMessage {
  from: string;
  channel: string;
  text: string;
  timestamp: number;
}

/**
 * Security Hardening & Secret Boundary Layer — v5.5
 * 
 * Upgrade from Verifiable Execution System to Secure Verifiable Execution System
 * 
 * Core Principle:
 * Anything that can be traced must NOT leak secrets.
 * Anything that contains secrets must NOT be traced.
 * 
 * Secrets ∩ TraceArtifacts = ∅
 * Secrets ∩ Logs = ∅
 * Secrets ∩ ExportPackage = ∅
 * Secrets ∩ Events = ∅
 * 
 * Violation = SYSTEM FAILURE.
 */

import * as crypto from "crypto";

// Secret Item
export interface SecretItem {
  type: "API_KEY" | "TOKEN" | "URL" | "CREDENTIAL" | "ENV_VAR";
  value: string;
  location: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// Secret Scan Result
export interface SecretScanResult {
  hasSecrets: boolean;
  detected: SecretItem[];
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// Security Event
export interface SecurityEvent {
  type: "SECRET_DETECTED" | "LEAK_BLOCKED" | "EXPORT_BLOCKED";
  location: string;
  severity: string;
  actionTaken: string;
  timestamp: number;
}

export class SecretDetectionEngine {
  private patterns: RegExp[] = [
    /sk-[a-zA-Z0-9]{48}/,  // OpenAI API key
    /ghp_[a-zA-Z0-9]{36}/,  // GitHub token
    /xoxb-[a-zA-Z0-9-]+/,  // Slack token
    /AKIA[A-Z0-9]{16}/,  // AWS access key
    /Bearer\s+[a-zA-Z0-9._-]+/,  // Bearer token
    /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+/,  // JWT
    /https?:\/\/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+/,  // URL with credentials
  ];

  private envPatterns: RegExp[] = [
    /^[A-Z_]+=.+$/  // Environment variables
  ];

  /**
   * 扫描文本中的密钥
   */
  scan(text: string, location: string): SecretScanResult {
    const detected: SecretItem[] = [];

    // 检查 API keys
    for (const pattern of this.patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          detected.push({
            type: this.classifySecret(match),
            value: match,
            location,
            severity: "CRITICAL"
          });
        }
      }
    }

    // 检查环境变量
    for (const pattern of this.envPatterns) {
      if (pattern.test(text)) {
        detected.push({
          type: "ENV_VAR",
          value: text,
          location,
          severity: "HIGH"
        });
      }
    }

    const maxSeverity = this.getMaxSeverity(detected);

    return {
      hasSecrets: detected.length > 0,
      detected,
      severity: maxSeverity
    };
  }

  /**
   * 清理文本中的密钥
   */
  redact(text: string): string {
    let redacted = text;

    for (const pattern of this.patterns) {
      redacted = redacted.replace(pattern, "[REDACTED_SECRET]");
    }

    return redacted;
  }

  /**
   * 分类密钥类型
   */
  private classifySecret(value: string): SecretItem["type"] {
    if (value.startsWith("sk-")) return "API_KEY";
    if (value.startsWith("ghp_")) return "TOKEN";
    if (value.startsWith("xoxb-")) return "TOKEN";
    if (value.startsWith("AKIA")) return "API_KEY";
    if (value.startsWith("Bearer")) return "TOKEN";
    if (value.startsWith("eyJ")) return "TOKEN";
    if (value.includes("@")) return "URL";
    return "CREDENTIAL";
  }

  /**
   * 获取最高严重性
   */
  private getMaxSeverity(items: SecretItem[]): SecretScanResult["severity"] {
    if (items.length === 0) return "LOW";
    
    const severityOrder = { "LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3 };
    let max = "LOW" as SecretScanResult["severity"];
    
    for (const item of items) {
      if (severityOrder[item.severity] > severityOrder[max]) {
        max = item.severity;
      }
    }
    
    return max;
  }
}

export class SecretRedactionEngine {
  private detector: SecretDetectionEngine;

  constructor() {
    this.detector = new SecretDetectionEngine();
  }

  /**
   * 清理日志
   */
  sanitizeLog(log: string): string {
    return this.detector.redact(log);
  }

  /**
   * 清理追踪
   */
  sanitizeTrace(trace: any): any {
    const traceStr = JSON.stringify(trace);
    const redacted = this.detector.redact(traceStr);
    return JSON.parse(redacted);
  }

  /**
   * 清理导出包
   */
  sanitizeExport(data: any): any {
    const dataStr = JSON.stringify(data);
    const redacted = this.detector.redact(dataStr);
    return JSON.parse(redacted);
  }
}

export class RuntimeSecretVault {
  private secrets: Map<string, string> = new Map();

  /**
   * 设置密钥
   */
  setSecret(key: string, value: string): void {
    this.secrets.set(key, value);
  }

  /**
   * 获取密钥
   */
  getSecret(key: string): string | undefined {
    return this.secrets.get(key);
  }

  /**
   * 解析密钥引用
   */
  resolveSecret(ref: string): string | undefined {
    // 从环境变量或vault中解析
    return this.secrets.get(ref) || process.env[ref];
  }

  /**
   * 检查是否有密钥
   */
  hasSecret(key: string): boolean {
    return this.secrets.has(key);
  }

  /**
   * 删除密钥
   */
  deleteSecret(key: string): boolean {
    return this.secrets.delete(key);
  }

  /**
   * 清空所有密钥
   */
  clear(): void {
    this.secrets.clear();
  }
}

export class SecurityEventSystem {
  private events: SecurityEvent[] = [];

  /**
   * 记录安全事件
   */
  record(event: Omit<SecurityEvent, "timestamp">): void {
    this.events.push({
      ...event,
      timestamp: Date.now()
    });
  }

  /**
   * 获取所有事件
   */
  getEvents(): SecurityEvent[] {
    return [...this.events];
  }

  /**
   * 获取事件统计
   */
  stats(): { total: number; byType: Record<string, number>; bySeverity: Record<string, number> } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const event of this.events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;
    }

    return {
      total: this.events.length,
      byType,
      bySeverity
    };
  }

  /**
   * 清空事件
   */
  clear(): void {
    this.events = [];
  }
}

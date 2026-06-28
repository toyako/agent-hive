/**
 * Dashboard Server — Phase 4
 * 
 * HTTP 服务器，暴露 Dashboard API
 * 
 * 端点：
 * - GET /api/runtime/tasks
 * - GET /api/runtime/checkpoint/:taskId
 * - POST /api/runtime/checkpoint/:taskId/decide
 * - GET /api/runtime/audit/:taskId
 * - GET /api/runtime/stats
 */

import * as http from "http";
import { DashboardApi, DecisionRequest } from "./DashboardApi";

export interface DashboardServerConfig {
  port: number;
  host: string;
  cors: boolean;
}

export class DashboardServer {
  private server: http.Server | null = null;
  private api: DashboardApi;
  private config: DashboardServerConfig;

  constructor(api: DashboardApi, config: Partial<DashboardServerConfig> = {}) {
    this.api = api;
    this.config = {
      port: 3100,
      host: "0.0.0.0",
      cors: true,
      ...config
    };
  }

  /**
   * 启动服务器
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // CORS 头
        if (this.config.cors) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        }

        // 预检请求
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        // 解析 URL
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const path = url.pathname;
        const method = req.method;

        try {
          let response: any;

          // 路由
          if (method === "GET" && path === "/api/runtime/tasks") {
            response = await this.api.getTasks();
          } else if (method === "GET" && path.startsWith("/api/runtime/checkpoint/") && !path.endsWith("/decide")) {
            const taskId = this.extractTaskId(path, "/api/runtime/checkpoint/");
            response = await this.api.getCheckpoint(taskId);
          } else if (method === "POST" && path.startsWith("/api/runtime/checkpoint/") && path.endsWith("/decide")) {
            const taskId = this.extractTaskId(path.replace("/decide", ""), "/api/runtime/checkpoint/");
            const body = await this.readBody(req);
            const decision: DecisionRequest = JSON.parse(body);
            response = await this.api.decideCheckpoint(taskId, decision);
          } else if (method === "GET" && path.startsWith("/api/runtime/audit/")) {
            const taskId = this.extractTaskId(path, "/api/runtime/audit/");
            response = await this.api.getAudit(taskId);
          } else if (method === "GET" && path === "/api/runtime/stats") {
            response = await this.api.getStats();
          } else if (method === "GET" && path === "/api/runtime/health") {
            response = { success: true, data: { status: "healthy" }, timestamp: Date.now() };
          } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: "Not found", timestamp: Date.now() }));
            return;
          }

          // 返回响应
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response, null, 2));
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: String(error), timestamp: Date.now() }));
        }
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`[Dashboard] Server started at http://${this.config.host}:${this.config.port}`);
        console.log(`[Dashboard] Endpoints:`);
        console.log(`  GET  /api/runtime/tasks`);
        console.log(`  GET  /api/runtime/checkpoint/:taskId`);
        console.log(`  POST /api/runtime/checkpoint/:taskId/decide`);
        console.log(`  GET  /api/runtime/audit/:taskId`);
        console.log(`  GET  /api/runtime/stats`);
        console.log(`  GET  /api/runtime/health`);
        resolve();
      });

      this.server.on("error", reject);
    });
  }

  /**
   * 停止服务器
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("[Dashboard] Server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 提取 taskId
   */
  private extractTaskId(path: string, prefix: string): string {
    return path.replace(prefix, "").replace(/\/$/, "");
  }

  /**
   * 读取请求体
   */
  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        resolve(body);
      });
      req.on("error", reject);
    });
  }

  /**
   * 获取端口
   */
  getPort(): number {
    return this.config.port;
  }
}

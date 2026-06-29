/**
 * ApiServer — Platform Phase 1
 * 
 * REST API Server
 * 
 * 默认: http://localhost:3000
 * 
 * API:
 * - Projects: GET/POST/DELETE
 * - Executions: POST/GET/DELETE
 * - Workflow: POST run/self-heal/resume/replay
 * - Runtime: GET status/events/metrics
 */

import * as http from "http";
import { ProductionRuntime } from "../../production/ProductionRuntime";

// Route Handler
type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse, params?: any) => Promise<void>;

// Route
interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

export class ApiServer {
  private server: http.Server | null = null;
  private routes: Route[] = [];
  private runtime: ProductionRuntime;
  private port: number;
  private host: string;

  constructor(runtime: ProductionRuntime, port: number = 3000, host: string = "0.0.0.0") {
    this.runtime = runtime;
    this.port = port;
    this.host = host;
    this.registerRoutes();
  }

  /**
   * 注册路由
   */
  private registerRoutes(): void {
    // Runtime Status
    this.addRoute("GET", "/runtime/status", async (req, res) => {
      this.json(res, { status: "running", uptime: process.uptime() });
    });

    // Runtime Events
    this.addRoute("GET", "/runtime/events", async (req, res) => {
      this.json(res, { events: this.runtime.getEventStore().getAllEvents() });
    });

    // Runtime Metrics
    this.addRoute("GET", "/runtime/metrics", async (req, res) => {
      this.json(res, {
        running: 0,
        completed: 0,
        failed: 0,
        queueLength: 0
      });
    });

    // Execute Task
    this.addRoute("POST", "/executions", async (req, res) => {
      const body = await this.readBody(req);
      const result = await this.runtime.execute(body.task || "hello");
      this.json(res, result);
    });

    // Get Executions
    this.addRoute("GET", "/executions", async (req, res) => {
      this.json(res, { executions: [] });
    });

    // Workflow Run
    this.addRoute("POST", "/workflow/run", async (req, res) => {
      const body = await this.readBody(req);
      const result = await this.runtime.execute(body.task || "hello");
      this.json(res, result);
    });

    // Health Check
    this.addRoute("GET", "/health", async (req, res) => {
      this.json(res, { status: "ok" });
    });

    // OpenAPI
    this.addRoute("GET", "/openapi.json", async (req, res) => {
      this.json(res, this.getOpenApiSpec());
    });
  }

  /**
   * 添加路由
   */
  addRoute(method: string, path: string, handler: RouteHandler): void {
    this.routes.push({ method, path, handler });
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        // CORS
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }

        // 路由匹配
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const route = this.routes.find(r => 
          r.method === req.method && this.matchPath(r.path, url.pathname)
        );

        if (route) {
          try {
            await route.handler(req, res);
          } catch (error) {
            this.json(res, { error: String(error) }, 500);
          }
        } else {
          this.json(res, { error: "Not found" }, 404);
        }
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`[ApiServer] Started at http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * 路径匹配
   */
  private matchPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length !== pathParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) continue;
      if (patternParts[i] !== pathParts[i]) return false;
    }

    return true;
  }

  /**
   * JSON 响应
   */
  private json(res: http.ServerResponse, data: any, status: number = 200): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
  }

  /**
   * 读取请求体
   */
  private async readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let body = "";
      req.on("data", (chunk) => body += chunk);
      req.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({});
        }
      });
    });
  }

  /**
   * 获取 OpenAPI 规范
   */
  private getOpenApiSpec(): any {
    return {
      openapi: "3.1.0",
      info: {
        title: "Agent Hive API",
        version: "3.0.0"
      },
      paths: {
        "/runtime/status": { get: { summary: "Get runtime status" } },
        "/runtime/events": { get: { summary: "Get runtime events" } },
        "/runtime/metrics": { get: { summary: "Get runtime metrics" } },
        "/executions": { post: { summary: "Execute task" } },
        "/workflow/run": { post: { summary: "Run workflow" } },
        "/health": { get: { summary: "Health check" } }
      }
    };
  }

  /**
   * 获取端口
   */
  getPort(): number {
    return this.port;
  }
}

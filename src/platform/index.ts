/**
 * Platform — Platform Phase 1
 * 
 * Runtime 不再是产品，Platform 才是产品
 */

import { ApiServer } from "./server/ApiServer";
import { AuthService } from "./auth/AuthService";
import { AgentHive } from "./sdk";
import { MetricsService } from "./services/MetricsService";
import { ProductionRuntime } from "../production/ProductionRuntime";

export class Platform {
  private apiServer: ApiServer;
  private authService: AuthService;
  private metricsService: MetricsService;
  private runtime: ProductionRuntime;

  constructor(port: number = 3000) {
    this.runtime = new ProductionRuntime();
    this.apiServer = new ApiServer(this.runtime, port);
    this.authService = new AuthService();
    this.metricsService = new MetricsService();
  }

  /**
   * 启动平台
   */
  async start(): Promise<void> {
    await this.apiServer.start();
    console.log("[Platform] Started");
  }

  /**
   * 停止平台
   */
  async stop(): Promise<void> {
    await this.apiServer.stop();
    console.log("[Platform] Stopped");
  }

  /**
   * 获取 API Server
   */
  getApiServer(): ApiServer {
    return this.apiServer;
  }

  /**
   * 获取 Auth Service
   */
  getAuthService(): AuthService {
    return this.authService;
  }

  /**
   * 获取 Metrics Service
   */
  getMetricsService(): MetricsService {
    return this.metricsService;
  }

  /**
   * 获取 Runtime
   */
  getRuntime(): ProductionRuntime {
    return this.runtime;
  }
}

// 导出 SDK
export { AgentHive } from "./sdk";
export type { AgentHiveConfig, ExecutionResult } from "./sdk";

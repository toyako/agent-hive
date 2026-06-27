/**
 * RuntimeConfig — 统一配置加载器
 * 
 * 按优先级查找 runtime.json：
 * 1. 当前工作目录 ./runtime.json
 * 2. 用户主目录 ~/.agent-hive/runtime.json
 * 3. npm安装目录 __dirname/../../runtime.json
 * 4. 环境变量
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface RuntimeConfig {
  model: string;
  apiKey: string;
  baseURL: string;
}

/**
 * 查找 runtime.json 文件
 * 按优先级返回第一个找到的路径
 */
function findRuntimeJson(): string | null {
  const candidates = [
    // 1. 当前工作目录
    path.resolve(process.cwd(), "runtime.json"),
    // 2. 用户主目录
    path.join(os.homedir(), ".agent-hive", "runtime.json"),
    // 3. npm安装目录（向后兼容）
    path.join(__dirname, "../../runtime.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * 加载指定 adapter 的配置
 * 
 * @param adapterName adapter 名称 (codex, claude, hermes, openclaw)
 * @param envKeyPrefix 环境变量前缀 (OPENAI, ANTHROPIC, etc.)
 * @returns RuntimeConfig
 */
export function loadAdapterConfig(
  adapterName: string,
  envKeyPrefix: string = "OPENAI"
): RuntimeConfig {
  const defaultModel = "mimo-v2.5-pro";
  const defaultBaseURL = "https://api.openai.com/v1";

  // 默认值从环境变量读取
  let apiKey = process.env[`${envKeyPrefix}_API_KEY`] || process.env.OPENAI_API_KEY || "";
  let baseURL = process.env[`${envKeyPrefix}_BASE_URL`] || process.env.OPENAI_BASE_URL || defaultBaseURL;
  let model = process.env[`${adapterName.toUpperCase()}_MODEL`] || defaultModel;

  // 尝试从 runtime.json 读取
  const runtimePath = findRuntimeJson();
  if (runtimePath) {
    try {
      const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf-8"));
      const cfg = runtime?.[adapterName] || {};

      // 读取 API Key
      if (cfg.env?.[`${envKeyPrefix}_API_KEY`]) {
        apiKey = cfg.env[`${envKeyPrefix}_API_KEY`];
      } else if (cfg.env?.OPENAI_API_KEY) {
        apiKey = cfg.env.OPENAI_API_KEY;
      }

      // 读取 Base URL
      if (cfg.env?.[`${envKeyPrefix}_BASE_URL`]) {
        baseURL = cfg.env[`${envKeyPrefix}_BASE_URL`];
      } else if (cfg.env?.OPENAI_BASE_URL) {
        baseURL = cfg.env.OPENAI_BASE_URL;
      }

      // 读取 Model
      if (cfg.model) {
        model = cfg.model;
      }
    } catch {}
  }

  return { model, apiKey, baseURL };
}

/**
 * 获取 runtime.json 的实际路径（用于日志）
 */
export function getRuntimeJsonPath(): string | null {
  return findRuntimeJson();
}

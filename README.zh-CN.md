# Agent Hive

**一个任务。多个 AI 大脑。**

Claude 写代码。Codex 审查。Hermes 规划。

Agent Hive 让多个 AI 运行时像一个团队一样协作。

```
$ hive

🐝 Agent Hive

你想构建什么？
> 构建一个 SaaS 落地页

[select] codex → claude
✓ 完成 — 评分: 95
```

---

## 安装

```bash
npm install -g agenthive
```

## 配置

```bash
hive setup
```

选择供应商，输入 API Key，选择模型。完成。

## 开始

```bash
hive
```

描述你想构建什么，Agent Hive 处理剩下的。

## 工作原理

```
你描述任务
    ↓
Agent Hive 选择最佳执行者和审查者
    ↓
执行者编写代码
    ↓
审查者独立评估
    ↓
发现问题 → 自动修订循环
    ↓
✓ 完成
```

## 有什么不同？

| 单个 AI | Agent Hive |
|---|---|
| 写代码 + 自我审查 | 写代码 + 独立审查 |
| 容易遗漏自己的错误 | 第二双眼睛 |
| 单一模型视角 | 多模型协作 |

## 命令

```bash
hive                          # 交互模式
hive "构建一个 REST API"       # 直接运行
hive setup                    # 配置供应商
hive doctor                   # 健康检查
hive memory list              # 查看记忆
hive project list             # 查看项目
hive cost                     # Token 用量
hive status                   # 当前状态
```

## 支持的供应商

OpenAI · Claude · Gemini · DeepSeek · OpenRouter · Mimo · 任何 OpenAI 兼容 API

## 记忆

Agent Hive 跨会话记住你的项目。

```bash
hive project init my-app typescript react
hive "添加认证功能"
# ... 关闭终端 ...
hive resume
# 从上次中断处继续
```

## FAQ

**需要多个 API Key 吗？**
不需要。一个 Key 搞定一切。

**只有一个供应商可以吗？**
可以。所有运行时使用同一个供应商。

**收费吗？**
Agent Hive 免费 (MIT)。API 使用需付费。

## 链接

- [GitHub](https://github.com/toyako/agent-hive)
- [Issues](https://github.com/toyako/agent-hive/issues)
- [Discussions](https://github.com/toyako/agent-hive/discussions)

## 许可证

MIT

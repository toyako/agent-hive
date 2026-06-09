# Agent Hive

[English](README.md) | **中文**

### 让 Claude、Codex、Gemini 等 AI 代理像一个团队一样协作。

```bash
npm install -g agent-hive
hive setup
hive
```

```
🐝 Agent Hive

你想构建什么？
> 构建一个 SaaS 落地页

✓ codex → claude (simpleChain)
✓ 完成 — 评分: 95, 修订次数: 0
```

一条命令，全自动。

---

## 快速开始

```bash
# 安装
npm install -g agent-hive

# 配置（交互式 — 选择供应商，自动发现模型）
hive setup

# 运行
hive "构建一个用户 CRUD API"
```

## 为什么选择 Agent Hive？

| 单代理 | Agent Hive |
|---|---|
| 写代码 + 自我审查 | 写代码 + 独立审查 |
| 容易遗漏自己的错误 | 第二双眼睛 |
| 单一模型视角 | 多运行时协作 |

## 工作原理

1. **分类** — 理解任务意图
2. **选择** — 挑选最佳执行者 + 审查者
3. **执行** — 执行者编写代码
4. **审查** — 审查者独立评估
5. **修订** — 发现问题则循环直到通过

## 支持的供应商

OpenAI · Claude · Gemini · DeepSeek · OpenRouter · Mimo · 自定义

## 命令

| 命令 | 说明 |
|---|---|
| `hive` | 交互模式 |
| `hive "任务"` | 直接运行任务 |
| `hive setup` | 配置供应商和模型 |
| `hive doctor` | 检查系统健康 |
| `hive dashboard` | 生成可视化面板 |

## 许可证

MIT

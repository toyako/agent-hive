# User Feedback v1

## 反馈收集

### 渠道
- GitHub Issues: https://github.com/toyako/agent-hive/issues
- GitHub Discussions: https://github.com/toyako/agent-hive/discussions

### 反馈模板

```markdown
## 反馈类型
- [ ] Bug 报告
- [ ] 功能建议
- [ ] 安装问题
- [ ] 使用体验

## 环境
- OS: 
- Node.js: 
- Agent Hive 版本: 

## 描述


## 期望行为

```

## 关键指标

| 指标 | 目标 | 当前 |
|------|------|------|
| 用户数 | 10+ | 0 |
| 实际任务数 | 50+ | 0 |
| 有效反馈 | 20+ | 0 |
| 安装成功率 | ≥90% | - |
| 任务成功率 | ≥80% | 100% (内部) |

## 用户旅程

```
npm install -g agenthive
  ↓
hive setup
  ↓
hive "build something"
  ↓
✓ Done
```

## 常见问题预案

| 问题 | 解决方案 |
|------|----------|
| npm 全局安装后找不到 hive | 检查 PATH 是否包含 npm 全局 bin |
| API Key 无效 | hive setup 重新配置 |
| 模型不可用 | hive doctor 检查 |
| 超时 | 检查网络，尝试换 provider |

# Install Validation

## 测试环境

### Linux (WSL Ubuntu)
- Node.js: v22.22.2
- npm: 11.x
- 状态: ✓ 通过

```bash
npm install -g ./agenthive-1.2.0.tgz
hive --version  # ✓ Agent Hive v1.0.0
hive doctor      # ✓ 检测到 4 个 runtime
```

### 已知问题

| 问题 | 严重度 | 状态 |
|------|--------|------|
| xstate 在 devDependencies | 🔴 CRITICAL | ✓ 已修复 |
| --version 被当成任务 | 🟡 HIGH | ✓ 已修复 |
| npm 全局 bin 不在 PATH | 🟡 MEDIUM | 环境配置问题 |

## 发布前检查

- [x] xstate 移到 dependencies
- [x] openai 移到 dependencies
- [x] hive --version 正常工作
- [x] hive help 正常工作
- [x] hive doctor 正常工作
- [x] npm pack 成功 (150KB, 272 文件)
- [ ] npm publish（需要 npm 登录）
- [ ] Windows 测试
- [ ] macOS 测试

## 安装命令

```bash
npm install -g agenthive
hive setup
hive doctor
hive "build a hello world function"
```

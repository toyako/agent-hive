# AGENT-HIVE-CAPABILITY-MATRIX-AUDIT.md

**Audit Date**: 2026-06-24
**Auditor**: 小白🤖 (AI Agent)
**Audit Type**: Capability Matrix Audit (实执行验证，非代码审计)
**Package**: @toyako/agent-hive@1.3.0
**CLI Version Display**: v1.0.0 (已知Bug)

---

## Part 1: Agent Runtime Inventory

### Binary Detection

| Runtime | which | 可执行 | 版本 |
|---------|-------|--------|------|
| claude | ❌ 未找到 | ❌ command not found | N/A |
| codex | /mnt/c/Program Files/nodejs/codex | ❌ 缺少依赖 @openai/codex-linux-x64 | N/A |
| hermes | /home/liu/.local/bin/hermes | ✅ | v0.15.1 |
| openclaw | /mnt/c/Program Files/nodejs/openclaw | ✅ | 2026.3.31 |

### hive agents 检测结果

| Runtime | hive agents 状态 | 实际可执行 | 差异 |
|---------|------------------|------------|------|
| codex | ✗ (not installed) | ❌ | 一致 |
| claude | ✓ (installed) | ❌ | **不一致** |
| hermes | ✓ (installed) | ✅ | 一致 |
| openclaw | ✓ (installed) | ✅ | 一致 |

**发现**: claude 在 hive agents 中显示 ✓ (installed)，但 `which claude` 返回空，`claude --version` 返回 "command not found"。ClaudeAdapter.detect() 可能回退到检查 API key。

---

## Part 2: Topology Inventory

### 源码中定义的 Topology

| Topology | 入口 | 执行顺序 | 参与Agent |
|----------|------|----------|-----------|
| simpleChain | AutoTopologySelector (coding/refactor) | Executor → Reviewer | 2 |
| planExecuteReview | AutoTopologySelector (planning/architecture/research) | Planner → Executor → Reviewer | 3 |
| fanOutReview | graph-template 命令 | Executor → [N Reviewers] | N+1 |
| pipeline | graph-template 命令 | Stage1 → Stage2 → ... → StageN | N |
| peerReview | AutoTopologySelector (review) | AgentA ↔ AgentB | 2 |

### 默认选择逻辑 (AutoTopologySelector)

| Intent | 默认Topology | Executor Caps | Reviewer Caps |
|--------|--------------|---------------|---------------|
| coding | simpleChain | coding | review |
| review | peerReview | review | review, security-scan |
| planning | planExecuteReview | planning | review |
| refactor | simpleChain | refactor, coding | review |
| architecture | planExecuteReview | architecture, coding | review, architecture |
| research | planExecuteReview | research, planning | review |

### dry-run 验证

```
[classify] Intent: coding (confidence: 0)
[select]   Intent="coding" → executor=codex(1) reviewer=claude(1) topology=simpleChain
[select]   Topology: simpleChain
```

**结论**: Topology 选择逻辑正常工作

---

## Part 3: Planner Audit

### 证据链

**证据1**: TaskProcessor.processWithGraph() 第98行
```typescript
const participants = [task.executor, task.reviewer];
```
只使用 executor 和 reviewer，无 planner。

**证据2**: TaskProcessor 全文搜索
```
grep -n "planner\|Planner\|planExecuteReview" TaskProcessor.ts
```
结果: **0 匹配**。TaskProcessor 中无 planner 相关代码。

**证据3**: cli.ts cmdRunWithTask() 第84-101行
```typescript
broker.addAgentProfile({ id: selection.executor, runtimeId: selection.executor, role: "executor" });
broker.addAgentProfile({ id: selection.reviewer, runtimeId: selection.reviewer, role: "reviewer" });
```
只添加 executor 和 reviewer 到 graph，无 planner。

**证据4**: 实际执行日志
```
[select]   Intent="coding" → executor=codex(1) reviewer=claude(1) topology=simpleChain
[→ codex] Executing...
[→ claude] Reviewing...
```
无 planner 阶段。

### 结论

| 问题 | 答案 | 证据 |
|------|------|------|
| Planner 是否会被调用 | ❌ 不会 | TaskProcessor 无 planner 代码 |
| 在什么条件下调用 | N/A | 无调用路径 |
| 默认拓扑是否调用 Planner | ❌ 不会 | simpleChain 无 planner |
| Hermes 是否实际承担 Planner 角色 | ❌ 不会 | 仅注册为 adapter，未被调用 |
| OpenClaw 是否实际承担 Planner 角色 | ❌ 不会 | 仅注册为 adapter，未被调用 |

---

## Part 4: Workflow Capability Matrix

### 测试条件

- API Key: 无效 (401 Invalid API Key)
- Mimo API: https://token-plan-sgp.xiaomimimo.com/v1
- 测试命令: `hive run --task "..." --max-revision 1`

### 结果

| Workflow | Runtime Detected | Real Execution | Real Output | Review Completed | Status |
|----------|------------------|----------------|-------------|------------------|--------|
| A: Hermes→Claude→Codex | ✅ hermes✓ claude✓ codex✗ | ❌ | ❌ | ❌ | BLOCKED |
| B: Hermes→Codex→Claude | ✅ hermes✓ codex✗ claude✓ | ❌ | ❌ | ❌ | BLOCKED |
| C: OpenClaw→Claude→Codex | ✅ openclaw✓ claude✓ codex✗ | ❌ | ❌ | ❌ | BLOCKED |
| D: OpenClaw→Codex→Claude | ✅ openclaw✓ codex✗ claude✓ | ❌ | ❌ | ❌ | BLOCKED |
| E: Claude→Codex | ✅ claude✓ codex✗ | ❌ | ❌ | ❌ | BLOCKED |
| F: Codex→Claude | ✅ codex✗ claude✓ | ❌ | ❌ | ❌ | BLOCKED |

**阻塞原因**: 所有 adapter 使用同一 Mimo API Key，该 Key 已失效 (401)。

### dry-run (Mock) 验证

| Workflow | Mock Execution | Mock Output | Mock Review | Status |
|----------|----------------|-------------|-------------|--------|
| Codex→Claude (simpleChain) | ✅ | [MockCodex] Completed | PASS (score: 85) | PASS (MOCK) |

---

## Part 5: Mock Runtime Audit

### 存在的 Mock Adapter

| Mock Adapter | 存在 | 文件 |
|--------------|------|------|
| MockCodexAdapter | ✅ | src/adapters/MockCodexAdapter.ts |
| MockClaudeAdapter | ✅ | src/adapters/MockClaudeAdapter.ts |
| MockHermesAdapter | ❌ | N/A |
| MockOpenClawAdapter | ❌ | N/A |

### Mock 行为

**MockCodexAdapter.execute()**:
```typescript
return {
  success: true,
  output: `[MockCodex] Completed: "${instr}"\nFiles modified: src/Component.vue, src/styles.css`,
};
```

**MockClaudeAdapter.review()**:
```typescript
return { decision: "PASS", score: 85, issues: [] };
```

### 风险评估

| 风险 | 严重性 | 描述 |
|------|--------|------|
| 默认测试使用 Mock | 高 | `--dry-run` 使用 mock，但 `hive demo` 也使用 mock |
| 用户可能误用 Mock | 高 | `hive demo` 输出看起来像真实执行 |
| 用户可能误认为真实 Agent | 高 | Mock 输出包含 "Files modified" 等虚假信息 |

**证据**: `hive demo` 命令使用 MockCodexAdapter 和 MockClaudeAdapter，输出:
```
[MockCodex] Completed: "Build a REST API"
Files modified: src/Component.vue, src/styles.css
```
这些文件并未真实创建。

---

## Part 6: Error Propagation Audit

### 测试: Executor 返回 success=false

**实际执行日志**:
```
[→ codex] Executing...
[✓ codex] Done:                              ← success=false，空输出，仍显示 "Done"
[→ claude] Reviewing...                      ← 继续执行 Reviewer
[✗ claude] FAIL (score: 0)                   ← Reviewer 也失败
```

**源码证据** (TaskProcessor.ts 第66-84行):
```typescript
try {
  execResult = await this.execWithTimeout(() => executor.execute(task), task.timeout);
} catch (err: any) {
  // 只捕获异常，不检查 execResult.success
  actor.send({ type: "ERROR", error: err.message });
  return;
}

// 不检查 execResult.success，直接打印 "Done"
console.log(`  [✓ ${task.executor}] Done: ${execResult.output.slice(0, 80)}`);

// 继续执行 Reviewer
await this.reviewLoop(task, actor, executor, reviewerName, log, execResult);
```

### 结论

| 行为 | 预期 | 实际 |
|------|------|------|
| Executor success=false 时停止流程 | 是 | ❌ 否，继续执行 Reviewer |
| Executor success=false 时记录失败 | 是 | ❌ 否，显示 "Done" |
| Executor success=false 时显示成功 | 否 | ❌ 是，显示 "[✓] Done" |
| Reviewer 在 Executor 失败后执行 | 否 | ❌ 是，继续执行 |

---

## Part 7: Marketing Claim Validation

### 宣传语审计

| 宣传语 | 状态 | 证据 |
|--------|------|------|
| "Claude 写代码，Codex 审查" | UNVERIFIED | API Key 无效，无法验证真实执行 |
| "Codex 写代码，Claude 审查" | UNVERIFIED | API Key 无效，无法验证真实执行 |
| "Hermes 规划，Claude 实现，Codex 审查" | UNSUPPORTED | Planner 未集成到 TaskProcessor，Hermes 不会被调用 |
| "OpenClaw 规划，Codex 实现，Claude 审查" | UNSUPPORTED | Planner 未集成到 TaskProcessor，OpenClaw 不会被调用 |

### 证据

**"Claude 写代码，Codex 审查"**:
- 代码支持: ClaudeAdapter 有 execute() 方法，CodexAdapter 有 review() 方法 ✅
- 实际验证: ❌ API Key 无效，无法验证
- 状态: UNVERIFIED

**"Hermes 规划，Claude 实现，Codex 审查"**:
- 代码支持: planExecuteReview topology 存在 ✅
- 实际集成: ❌ TaskProcessor 不调用 Planner
- 实际验证: ❌ 无 planner 阶段
- 状态: UNSUPPORTED

---

## 最终结论

### 状态: C. NOT_READY_FOR_MARKETING_CLAIMS

### 理由

1. **Planner 未集成**: planExecuteReview topology 存在于代码中，但 TaskProcessor 不调用 Planner。所有 "Hermes 规划" / "OpenClaw 规划" 的宣传均为 UNSUPPORTED。

2. **API Key 依赖**: 所有真实执行依赖单一 Mimo API Key，该 Key 已失效。无法验证任何真实 Agent 协作。

3. **Error Propagation 缺陷**: Executor 返回 success=false 时，系统显示 "Done" 并继续执行 Reviewer，掩盖真实错误。

4. **Mock 混淆风险**: MockCodex 输出包含虚假 "Files modified" 信息，用户可能误认为真实执行。

5. **版本号不一致**: CLI 显示 v1.0.0，npm 包为 1.3.0。

### 能力矩阵总结

| 能力 | 状态 |
|------|------|
| Runtime 检测 | ⚠️ 部分不一致 (claude) |
| Topology 选择 | ✅ 正常 |
| Planner 集成 | ❌ 未集成 |
| 真实执行 | ❌ BLOCKED (API Key) |
| Mock 执行 | ✅ 正常 |
| Error Propagation | ❌ 缺陷 |
| 宣传语支持 | ❌ NOT_READY |

---

**审计完成**

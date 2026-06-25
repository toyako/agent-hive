# AGENT-HIVE-PHASE-5.1-PLANNER-ERROR-AUDIT.md

**Audit Date**: 2026-06-24
**Auditor**: 小白🤖 (AI Agent)
**Audit Type**: Planner Integration & Error Propagation Audit
**Package**: @toyako/agent-hive@1.3.0

---

## Part A — Planner Integration Audit

### Step A1: Topology映射检查

**源码**: `src/product/AutoTopologySelector.ts`

```
planning    → topology: "planExecuteReview"
architecture → topology: "planExecuteReview"
research    → topology: "planExecuteReview"
```

**PLANNER_TOPOLOGY_MAPPING: PASS**

planning/architecture/research 三个意图均映射到 planExecuteReview topology。

---

### Step A2: Planner是否进入Runtime Graph

**源码**: `src/commands/cli.ts` 第99-101行

```typescript
broker.addAgentProfile({ id: selection.executor, runtimeId: selection.executor, role: "executor", maxConcurrency: 1, status: "idle" });
broker.addAgentProfile({ id: selection.reviewer, runtimeId: selection.reviewer, role: "reviewer", maxConcurrency: 1, status: "idle" });
broker.addGraphEdge(selection.executor, selection.reviewer, "reviews", 10);
```

**证据**: 只添加 executor 和 reviewer，无 planner。

**PLANNER_GRAPH_INTEGRATION: NO**

---

### Step A3: 调用链分析

**全文搜索结果**:

| 文件 | planner/Planner 出现次数 | 是否在执行链中 |
|------|--------------------------|----------------|
| cli.ts | 6次 | 仅定义角色/描述，不调用 |
| Broker.ts | 0次 | ❌ |
| TaskProcessor.ts | 0次 | ❌ |
| GraphOperations.ts | 0次 | ❌ |

**CALL_CHAIN**:
```
cli.ts (cmdRunWithTask)
  ↓
  AutoTopologySelector.select() → topology: "planExecuteReview"
  ↓
  broker.addAgentProfile(executor)     ← 只添加executor
  broker.addAgentProfile(reviewer)     ← 只添加reviewer
  ↓                                      无planner
  Broker.submit() → TaskProcessor.process()
  ↓
  TaskProcessor.processWithGraph()
    → executor.execute()
    → reviewer.review()
    ↓
    无planner步骤
```

---

### Step A4: 真实执行验证

**任务**: "Design architecture for scalable SaaS platform"
**意图分类**: planning (confidence: 0.48)
**选择的Topology**: planExecuteReview

**执行日志**:
```
[classify] Intent: planning (confidence: 0.48)
[classify] Keywords: design, architect
[select]   Intent="planning" → executor=claude(1) reviewer=hermes(1) topology=planExecuteReview
[select]   Topology: planExecuteReview

[→ claude] Executing...        ← Executor是Claude，不是Planner
[✓ claude] Done: ...
[→ hermes] Reviewing...        ← Reviewer是Hermes，不是Planner
[✓ hermes] PASS (score: 85)
```

**观察**:
- ❌ 无 `[→ planner]` 阶段
- ❌ 无 `Hermes Planning` 阶段
- ❌ 无 `OpenClaw Planning` 阶段
- executor=claude, reviewer=hermes（hermes作为reviewer，不是planner）

**PLANNER_RUNTIME_EXECUTION: NO**

---

### Step A5: Planner Output

**PLANNER_OUTPUT = NULL**

无任何Planner输出。

---

## Part B — Error Propagation Audit

### Step B1: 错误控制流图

**源码**: `src/broker/TaskProcessor.ts` 第66-84行

```
processSimple() / processWithGraph():
  │
  ├─ try {
  │    execResult = await executor.execute(task)
  │  } catch (err) {
  │    → 打印 [✗ executor] ERROR
  │    → 停止pipeline
  │    → return
  │  }
  │
  ├─ 打印 [✓ executor] Done    ← 不检查execResult.success
  │
  └─ reviewLoop()              ← 继续执行Reviewer
```

**ERROR_CONTROL_FLOW_MAP**:
- throw Error() → catch块 → 停止pipeline → return
- success=false → 无catch → 打印"Done" → 继续reviewLoop

---

### Step B2: Executor返回success=false的行为

**源码**: `src/adapters/CodexAdapter.ts` 第68-76行

```typescript
async execute(task: Task, instruction?: string): Promise<AgentResult> {
    try {
      const output = await this.chat(prompt);
      return { success: true, output: output || "[Codex] Completed" };
    } catch (err: any) {
      return { success: false, output: "", error: err.message };  // ← 捕获异常，返回success=false
    }
}
```

**关键发现**: CodexAdapter 捕获所有异常，返回 `{ success: false }`，**永远不抛出异常**。

---

### Step B3: 真实执行验证

**使用无效API key的执行日志**:
```
[→ codex] Executing...
[✓ codex] Done:                              ← success=false，空输出，仍显示"Done"
[→ claude] Reviewing...                      ← 继续执行Reviewer
[✗ claude] FAIL (score: 0)
  issues: Review execution failed: 401 Invalid API Key
[↻ codex] Revision #1...
[✓ codex] Revision done:                     ← 仍然显示"Done"
[→ claude] Reviewing...                      ← 继续执行Reviewer
[✗] Max revisions reached. FAILED.
```

**EXECUTOR_FAILURE_BEHAVIOR**:
- STOPPED_PIPELINE: **NO**
- REVIEWER_EXECUTED: **YES**
- FALSE_SUCCESS_MESSAGE: **YES**

---

### Step B4: 失败模式矩阵

| Failure Mode | Pipeline Stop | Reviewer Runs | Status |
|--------------|---------------|---------------|--------|
| throw Error() | ✅ YES | ❌ NO | CORRECT |
| success=false | ❌ NO | ✅ YES | **BROKEN** |

**源码证据**:

**throw Error()**:
```typescript
// TaskProcessor.ts 第66-75行
try {
  execResult = await this.execWithTimeout(() => executor.execute(task), task.timeout);
} catch (err: any) {
  // 捕获异常 → 停止pipeline
  console.log(`  [✗ ${task.executor}] ERROR: ${err.message}`);
  this.saveFinal(task, actor);
  actor.stop();
  return;  // ← 停止
}
```

**success=false**:
```typescript
// TaskProcessor.ts 第77-84行
// 不检查execResult.success
console.log(`  [✓ ${task.executor}] Done: ${execResult.output.slice(0, 80)}`);

// 继续执行Reviewer
await this.reviewLoop(task, actor, executor, reviewerName, log, execResult);
```

---

## Part C — Trust Risk Assessment

### Planner Risk

| Condition | Status |
|-----------|--------|
| Planner存在且执行 | - |
| Planner存在但不执行 | **SPEC_ONLY** |
| Planner不存在 | - |

**证据**: planExecuteReview topology存在于代码中，但TaskProcessor不调用Planner。

---

### Error Propagation Risk

| Condition | Status |
|-----------|--------|
| success=false正确中断 | - |
| success=false继续执行 | **BROKEN** |

**证据**: CodexAdapter返回success=false时，TaskProcessor打印"Done"并继续执行Reviewer。

---

## Part D — Marketing Claim Validation

### Claim A: "Hermes规划 → Claude实现 → Codex审查"

**状态: UNSUPPORTED**

**证据**:
- Hermes从未作为Planner被调用
- cli.ts只添加executor和reviewer到graph
- TaskProcessor中无planner代码
- 真实执行日志无planner阶段

---

### Claim B: "OpenClaw规划 → Codex实现 → Claude审查"

**状态: UNSUPPORTED**

**证据**: 同Claim A，Planner未集成到执行流程。

---

### Claim C: "Multi-Agent Workflow"

**状态: PARTIALLY_SUPPORTED**

**证据**:
- ✅ simpleChain (executor→reviewer) 真实工作
- ❌ planExecuteReview (planner→executor→reviewer) 未实现planner阶段
- ❌ Error propagation有缺陷

---

## Final Classification

### D. BOTH_PLANNER_AND_ERROR_CONTROL_BROKEN

**理由**:

1. **Planner未集成**: planExecuteReview topology存在但TaskProcessor不调用Planner。cli.ts只添加executor和reviewer到graph。

2. **Error Propagation缺陷**: CodexAdapter返回success=false时，TaskProcessor打印"[✓] Done"并继续执行Reviewer，不中断pipeline。

---

## 核心结论

### 1. Planner是否真实存在于执行链？

**NO**

- TopologyTemplates.ts定义了planExecuteReview topology
- AutoTopologySelector为planning/architecture/research选择此topology
- 但cli.ts只添加executor和reviewer到graph
- TaskProcessor中无planner代码（0次引用）
- 真实执行无planner阶段

### 2. Executor success=false是否会停止系统？

**NO**

- CodexAdapter捕获异常，返回success=false
- TaskProcessor只catch异常，不检查success字段
- 打印"[✓ executor] Done"即使success=false
- 继续执行reviewLoop

---

## 证据清单

| 证据 | 来源 | 结论 |
|------|------|------|
| Topology映射 | AutoTopologySelector.ts | planning→planExecuteReview |
| Graph添加 | cli.ts:99-100 | 只添加executor+reviewer |
| TaskProcessor引用 | TaskProcessor.ts | 0次引用planner |
| 真实执行日志 | hive run输出 | 无planner阶段 |
| CodexAdapter错误处理 | CodexAdapter.ts:73-74 | 返回success=false，不抛异常 |
| TaskProcessor错误处理 | TaskProcessor.ts:66-84 | 只catch异常，不检查success |
| 真实执行日志 | hive run输出(无效key) | 打印"Done"并继续Reviewer |

---

**审计完成**

# Agent Hive Observability

> v1.0.6 — 2026-06-07

---

## 概述

Observability 层让 Agent Hive 具备可追踪、可解释、可调试能力。

4个模块:

| 模块 | 文件 | 职责 |
|------|------|------|
| TaskTimeline | observability/TaskTimeline.ts | 任务生命周期事件序列 |
| ConversationTrace | observability/ConversationTrace.ts | Agent间消息流记录 |
| RuntimeMetrics | observability/RuntimeMetrics.ts | 按Runtime统计性能 |
| DecisionRecorder | observability/DecisionRecorder.ts | 关键决策原因记录 |

---

## 1. TaskTimeline

记录任务从创建到完成的每个阶段。

**事件类型:**
- `created` — 任务创建
- `routed` — 路由完成，确定executor
- `runtime-selected` — Runtime选择完成
- `execute-start` — 开始执行
- `execute-done` — 执行完成
- `review` — 审核完成
- `consensus` — 多审查者共识
- `escalation` — 升级触发
- `completed` — 任务完成

**输出:** `.agent-hive/traces/task-<id>.json`

**CLI:** `agent-hive trace <task-id>`

**示例输出:**
```
Task: task-001
Status: COMPLETED
Duration: 48ms
Events:
  +0ms    created
  +5ms    routed {"executor":"codex"}
  +10ms   runtime-selected {"runtime":"codex"}
  +15ms   execute-start
  +20ms   execute-done {"success":true}
  +25ms   review {"score":88,"decision":"PASS"}
  +30ms   completed {"status":"COMPLETED"}
```

---

## 2. ConversationTrace

记录Agent间完整消息流，可重建协作过程。

**输出:** `.agent-hive/traces/conversation-<id>.json`

**示例输出:**
```
Conversation: conv-001
Task: task-002
Messages: 4

  +0ms    broker → planner [TASK]
          Design API
  +5ms    planner → executor [DELEGATE]
          Build /users endpoint
  +10ms   executor → reviewer [RESULT]
          Code done
  +15ms   reviewer → executor [REVIEW]
          PASS score=90
```

---

## 3. RuntimeMetrics

按Runtime聚合统计。

**统计项:**
- taskCount — 总任务数
- successCount / failureCount — 成功/失败数
- successRate — 成功率
- avgLatency — 平均延迟
- avgReviewScore — 平均审核分

**输出:** `.agent-hive/metrics/runtime.json`

**CLI:** `agent-hive metrics`

**示例输出:**
```
Runtime Metrics:
────────────────────────────────────────────────────────────
Runtime       Tasks  Success   Latency    Score
────────────────────────────────────────────────────────────
claude            5      80%    4200ms     85.0
codex             3     100%    2000ms     88.0
hermes            2     100%    1500ms     75.0
```

---

## 4. DecisionRecorder

记录关键决策原因，回答"为什么"。

**决策类型:**

**runtime-selection:**
```json
{
  "decision": "runtime-selection",
  "selected": "codex",
  "candidates": ["codex", "claude", "hermes"],
  "reason": "highest capability score for coding"
}
```

**escalation:**
```json
{
  "decision": "escalation",
  "reason": "maxRevisionReached",
  "data": { "from": "executor", "to": "senior-executor" }
}
```

**consensus:**
```json
{
  "decision": "consensus",
  "reason": "majority: 1 PASS, 2 FAIL → FAIL",
  "data": { "strategy": "majority", "pass": 1, "fail": 2, "result": "FAIL" }
}
```

**输出:** `.agent-hive/traces/decisions-<task-id>.jsonl`

**CLI:** `agent-hive explain <task-id>`

---

## 数据目录结构

```
.agent-hive/
├── traces/
│   ├── task-<id>.json              # TaskTimeline
│   ├── conversation-<id>.json      # ConversationTrace
│   └── decisions-<id>.jsonl        # DecisionRecorder
├── metrics/
│   └── runtime.json                # RuntimeMetrics
├── tasks/                          # TaskQueue
├── history/                        # RevisionHistory
├── conversations/                  # ConversationManager
├── agents.json                     # AgentRegistry
├── graph.json                      # AgentGraph
├── runtime-capabilities.json       # CapabilityDiscovery
└── runtime-stats.json              # RuntimeScoreManager
```

---

## CLI 命令

| 命令 | 功能 |
|------|------|
| `agent-hive trace <task-id>` | 查看任务完整执行轨迹 |
| `agent-hive metrics` | 查看Runtime统计信息 |
| `agent-hive explain <task-id>` | 查看任务所有关键决策原因 |

---

## 测试

25个测试全部通过:
- Test 1: TaskTimeline (7 assertions)
- Test 2: ConversationTrace (5 assertions)
- Test 3: RuntimeMetrics (7 assertions)
- Test 4: DecisionRecorder (6 assertions)

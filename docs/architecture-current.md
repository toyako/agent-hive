# Agent Hive — Architecture Current

> Generated: 2026-06-07
> Version: 2.1.5
> Status: STABLE

---

## 1. 当前模块图

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI (cli.ts)                             │
│  init | detect | agents | task | run | history | graph | ...    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      Broker (Broker.ts)                          │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ AgentRegistry│ │ MessageBus   │ │ TaskQueue                │ │
│  │ (registry)   │ │ (events)     │ │ (persistence)            │ │
│  └─────────────┘ └──────────────┘ └──────────────────────────┘ │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ MessageRouter│ │ TaskRouter   │ │ ConversationManager      │ │
│  │ (v2 routing) │ │ (v1 compat)  │ │ (multi-turn)             │ │
│  └─────────────┘ └──────────────┘ └──────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     Graph Layer (graph/)                         │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ AgentGraph   │ │ GraphValidator│ │ TopologyTemplates       │ │
│  │ (directed)   │ │ (cycles)      │ │ (5 presets)             │ │
│  └─────────────┘ └──────────────┘ └──────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Runtime Layer (runtime/)                       │
│  ┌───────────────────┐ ┌─────────────────┐ ┌────────────────┐  │
│  │ CapabilityDiscovery│ │ RuntimeScoreMgr │ │ RuntimeSelector│  │
│  │ (probe + static)   │ │ (stats)         │ │ (auto select)  │  │
│  └───────────────────┘ └─────────────────┘ └────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Safety Layer (safety/)                        │
│  ┌──────────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────┐│
│  │ CircuitBreaker│ │ HopCounter │ │ MsgDedup     │ │ TimeBudget││
│  └──────────────┘ └────────────┘ └──────────────┘ └──────────┘│
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Adapter Layer (adapters/)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Codex    │ │ Claude   │ │ Hermes   │ │ OpenClaw │          │
│  │ (OpenAI  │ │ (CLI)    │ │ (CLI)    │ │ (stub)   │          │
│  │  SDK)    │ │          │ │          │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐                                     │
│  │ MockCodex│ │ MockClaude│                                    │
│  └──────────┘ └──────────┘                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  Persistence (.agent-hive/)                      │
│  tasks/ | messages/ | logs/ | history/ | conversations/         │
│  agents.json | graph.json | runtime-capabilities.json           │
│  runtime-stats.json                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Runtime 生命周期

```
detect()          health()          execute()           review()
   │                 │                  │                  │
   ▼                 ▼                  ▼                  ▼
检查CLI是否      发送probe prompt    执行任务            审核结果
安装并可启动     验证Runtime可工作   返回AgentResult     返回ReviewResult
   │                 │                  │                  │
   ▼                 ▼                  ▼                  ▼
installed=true   healthy=true       success/output      decision/score
```

**Adapter接口 (AgentAdapter):**
```typescript
interface AgentAdapter {
  name: string;
  role: AgentRole;            // planner | executor | reviewer | coordinator
  capabilities: string[];     // static declaration

  detect(): Promise<boolean>;           // CLI installed?
  health(): Promise<boolean>;           // Can respond to prompt?
  execute(task): Promise<AgentResult>;  // Do the work
  review?(task): Promise<ReviewResult>; // Review the work
  converse?(msgs): Promise<MessageEnvelope>; // Multi-turn
}
```

**Runtime注册流程:**
1. `broker.registerAdapter(adapter)` → 调用 `detect()` → 写入 `agents.json`
2. `broker.healthCheck(name)` → 调用 `health()` → 更新 healthy 状态
3. `capabilityDiscovery.discover(adapter)` → probe prompt → 写入 `runtime-capabilities.json`

---

## 3. Graph 生命周期

```
创建                    添加Agent              添加Edge
   │                       │                      │
   ▼                       ▼                      ▼
new AgentGraph()    graph.addAgent()       graph.addEdge()
   │                       │                      │
   ▼                       ▼                      ▼
加载持久化            写入 graph.json        写入 graph.json
(如果存在)                 │                      │
                           ▼                      ▼
                    GraphValidator.validate()
                           │
                           ▼
                    环检测 + 孤立Agent检测
```

**Edge类型 (EdgeRelation):**
- `delegates` — A委派任务给B
- `reviews` — A审核B的输出
- `provides` — A向B提供上下文
- `escalates` — A升级问题给B
- `collaborates` — A与B协作
- `approves` — A审批B

**预置拓扑模板:**
- `simpleChain` — Executor → Reviewer
- `planExecuteReview` — Planner → Executor → Reviewer
- `pipeline` — Stage1 → Stage2 → Stage3
- `fanOutReview` — Executor → [R1, R2, R3]
- `peerReview` — AgentA ↔ AgentB

**v1.1迁移:**
- `reportsTo` 自动转换为 `reviews` + `escalates` 边

---

## 4. Task 生命周期

```
submit()        queue.nextPending()     processTask()
   │                    │                     │
   ▼                    ▼                     ▼
创建Task对象       从磁盘读取PENDING      XState状态机驱动
写入tasks/             │                     │
                       ▼                     ▼
               ┌───────────────────────────────────────┐
               │           XState Workflow              │
               │                                        │
               │  PENDING → EXECUTING → REVIEWING       │
               │                      │                 │
               │                    PASS → COMPLETED    │
               │                    FAIL →              │
               │                      │                 │
               │              revisionCount < max?      │
               │                YES → REVISION_REQUIRED │
               │                      → EXECUTING       │
               │                NO  → FAILED            │
               │                      (or ESCALATED)    │
               └───────────────────────────────────────┘
```

**Task数据结构:**
```typescript
interface Task {
  id: string;
  instruction: string;
  executor: string;          // Runtime name
  reviewer: string;          // Runtime name
  status: TaskStatus;        // PENDING|EXECUTING|REVIEWING|...
  revisionCount: number;
  maxRevision: number;       // default: 3
  timeout: number;           // default: 600000ms
  workingDirectory: string;
  result?: any;
  conversationId?: string;   // v1.0
  escalationPolicy?: ...;    // v1.0
}
```

**持久化:** 每个状态变更立即写入 `.agent-hive/tasks/<id>.json`

---

## 5. Runtime 选择流程

```
Task提交
   │
   ▼
指定 executor? ──是──→ 使用指定的 Runtime
   │
   否
   │
   ▼
RuntimeSelector.select({ taskType })
   │
   ▼
CapabilityDiscovery.findByCapability(taskType)
   │
   ▼
过滤: healthy + 未排除
   │
   ▼
评分:
  score = 0.4 × capabilityMatch × confidence
        + 0.25 × successRate
        + 0.15 × latencyScore
        + 0.2  × reviewScore
   │
   ▼
选择最高分
   │
   ▼
返回 SelectionResult { runtimeId, score, reason, alternatives }
```

**Capability Discovery 流程:**
1. 读取 Adapter 静态 capabilities
2. 发送 Probe Prompt: "List your capabilities as JSON"
3. 合并 (union of static + probe)
4. 写入 `runtime-capabilities.json`
5. confidence: merged=0.9, static-only=0.3

**Score 计算:**
- successRate: 历史成功次数 / 总任务数
- latencyScore: max(0, 1 - avgLatency/60000)
- reviewScore: avgReviewScore / 100

---

## 6. 安全层

| 组件 | 功能 | 默认值 |
|------|------|--------|
| HopCounter | 消息跳数限制 | maxHops=10 |
| MessageDeduplicator | 消息指纹去重 | window=30s |
| CircuitBreaker | 熔断器 | threshold=5, cooldown=60s |
| TimeBudget | 时间预算 | configurable |

---

## 7. 数据流示例

```
用户: agent-hive task --instruction "实现API" --executor codex --reviewer claude

  1. cli.ts → broker.submit() → TaskQueue.create() → tasks/<id>.json
  2. cli.ts → broker.run() → TaskQueue.nextPending()
  3. Broker → XState START → EXECUTING
  4. Broker → CodexAdapter.execute(task) → AgentResult
  5. Broker → XState EXEC_DONE → REVIEWING
  6. Broker → ClaudeAdapter.review(task) → ReviewResult
  7. Broker → RevisionHistory.add(record)
  8. Broker → XState REVIEW_PASS → COMPLETED
  9. Broker → TaskQueue.save(task) → tasks/<id>.json updated
```

---

## 8. 文件清单

| 模块 | 文件 | 行数 | 职责 |
|------|------|------|------|
| broker/ | Broker.ts | 737 | 核心编排 |
| broker/ | AgentRegistry.ts | 74 | Agent注册 |
| broker/ | MessageBus.ts | 92 | 事件总线 |
| broker/ | TaskRouter.ts | 32 | v1.1路由 |
| broker/ | MessageRouter.ts | 153 | v1.0路由 |
| graph/ | AgentGraph.ts | 276 | 有向图 |
| graph/ | GraphValidator.ts | 107 | 图验证 |
| graph/ | TopologyTemplates.ts | 152 | 拓扑模板 |
| conversation/ | ConversationManager.ts | 158 | 多轮对话 |
| runtime/ | CapabilityDiscovery.ts | 130 | 能力发现 |
| runtime/ | RuntimeScoreManager.ts | 125 | 性能统计 |
| runtime/ | RuntimeSelector.ts | 110 | 自动选择 |
| safety/ | CircuitBreaker.ts | 98 | 熔断器 |
| safety/ | HopCounter.ts | 57 | 跳数限制 |
| safety/ | MessageDeduplicator.ts | 69 | 消息去重 |
| safety/ | TimeBudget.ts | 129 | 时间预算 |
| review/ | ReviewConsensus.ts | 243 | 多审查者共识 |
| adapters/ | CodexAdapter.ts | 108 | OpenAI SDK |
| adapters/ | ClaudeAdapter.ts | 136 | CLI |
| adapters/ | HermesAdapter.ts | 175 | CLI |
| adapters/ | OpenClawAdapter.ts | 60 | STUB |
| api/ | MeshAPI.ts | 147 | 编程接口 |
| workflow/ | WorkflowMachine.ts | 246 | XState |
| types/ | index.ts | 286 | 类型定义 |
| commands/ | cli.ts | 463 | CLI入口 |
| utils/ | (5 files) | 213 | 工具函数 |

**总计:** 37个TypeScript文件, ~6100行

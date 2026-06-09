# Runtime Benchmark

> v1.0 — 2026-06-07

---

## 概述

Benchmark 系统让 Agent Hive 基于真实能力数据做 Runtime 选择，而不是依赖字符串声明。

---

## 数据结构

```typescript
interface RuntimeBenchmark {
  runtimeId: string;
  coding: number;      // 0-100
  review: number;      // 0-100
  planning: number;    // 0-100
  reasoning: number;   // 0-100
  latency: number;     // ms
  successRate: number; // 0-1
  updatedAt: number;
}
```

**存储:** `.agent-hive/benchmark/runtime-benchmark.json`

---

## Benchmark Categories (4类13题)

### Category A: Coding (4题)
| ID | 名称 | 评分维度 |
|----|------|---------|
| code-01 | Hello World | 函数定义 + return + Hello |
| code-02 | CRUD API | id + name + email + JSON |
| code-03 | Refactor | async + await + 无.then |
| code-04 | Bug Fix | 类型识别 + 修复 + 解释 |

### Category B: Review (3题)
| ID | 名称 | 评分维度 |
|----|------|---------|
| review-01 | Security Review | SQL注入识别 + 修复建议 |
| review-02 | Architecture Review | 扩展性 + 单点故障 + 建议 |
| review-03 | Code Review | 除零检查 + 输入验证 + 错误处理 |

### Category C: Planning (3题)
| ID | 名称 | 评分维度 |
|----|------|---------|
| plan-01 | System Design | 组件 + 数据流 + 存储 |
| plan-02 | Agent Design | 多Agent + 协作 + 角色 |
| plan-03 | Workflow Design | 测试 + 检查 + 部署 + 阶段 |

### Category D: Reasoning (3题)
| ID | 名称 | 评分维度 |
|----|------|---------|
| reason-01 | Escalation Decision | 升级 + 优先级 + 行动 |
| reason-02 | Multi-step Task | Schema + 数据 + 测试 + 回滚 |
| reason-03 | Conflict Resolution | 适配器 + 标准 + 事件驱动 |

---

## 评分方法

每个 Benchmark Case 有自定义 `evaluate(output)` 函数：
- 解析输出文本
- 检查关键要素是否存在
- 返回 0-100 分

---

## RuntimeSelector 升级

**旧权重:**
```
score = 0.4 capabilityMatch + 0.25 successRate + 0.15 latency + 0.2 reviewScore
```

**新权重 (v1.0):**
```
score = 0.35 benchmarkScore + 0.20 capabilityMatch + 0.20 successRate + 0.10 latency + 0.15 reviewScore
```

Benchmark Score 成为第一权重 (35%)。

---

## CLI

```
agent-hive benchmark                    # 运行所有Runtime的所有Benchmark
agent-hive benchmark --runtime codex    # 只测Codex
agent-hive benchmark --runtime claude   # 只测Claude
agent-hive benchmark report             # 查看报告
```

---

## 输出文件

```
.agent-hive/benchmark/runtime-benchmark.json  # Benchmark数据集
.agent-hive/reports/benchmark-report.json     # JSON报告
.agent-hive/reports/benchmark-report.md       # Markdown报告
```

---

## 测试

26个测试全部通过:
- Test 1: BenchmarkDataset (6 assertions)
- Test 2: BenchmarkRunner (6 assertions)
- Test 3: BenchmarkReport (8 assertions)
- Test 4: RuntimeSelector Integration (3 assertions)
- Test 5: Observability Integration (3 assertions)

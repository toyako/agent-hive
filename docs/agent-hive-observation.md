# Agent Hive — Observation Mode (Production Runtime)

## Core Goal
Continuously improve delivery capability on real tasks.
Faster. More stable. Less human intervention.

## Principles
1. Real task → Real failure → Real fix
2. Don't optimize metrics, optimize delivery
3. Small Fix > Medium Fix > Large Refactor
4. Hermes only executes, doesn't optimize
5. Human Override Rate is the ultimate metric
6. First 30 tasks: focus on log quality, not conclusions

## Task Record Format
```json
{
  "task_id": "...",
  "task_type": "...",
  "participating_agents": ["planner", "executor", "reviewer"],
  "execution_time_ms": 0,
  "token_usage": 0,
  "final_result": "...",
  "reviewer_result": "...",
  "human_result": "..."
}
```

## Agent Contribution Evidence
```json
{
  "agent": "Planner",
  "task_id": "12345",
  "contribution_type": "task_graph_creation",
  "impact_level": "high",
  "evidence": "Split into 3 subtasks with execution order"
}
```

## Human Override
Record when: human_result ≠ agent_result or reviewer_result
```json
{
  "task_id": "...",
  "agent_output": "...",
  "human_correction": "...",
  "impact_level": "high"
}
```

## Data Storage
Path: `logs/agent-hive-observation_YYYYMMDD_HHMM.json`

## Data Quality Rules
- No empty evidence
- No empty task results
- All records traceable to real output
- No fabricated contributions

## Failure Reproducibility
Every failure must include:
- Input
- Environment
- Agent chain
- Output

Non-reproducible: mark as "non-reproducible" (tracked separately)

## Agent Collapse Verification
- Ablation test: pause agent, compare success rate
- Need 2+ reproductions before attribution
- Otherwise: "uncertain attribution"

## Blind Evaluation
Each round: at least 5 new task types, different domains/complexity.

## Stop Conditions
| Stable Tasks | Action |
|:---:|--------|
| 30 | Light observation |
| 100 | Freeze architecture |
| 300 | System mature |

## Task Priority
P0: Real production > P1: User needs > P2: Internal test > P3: Benchmark

## Prohibited
- Optimize scoring rules
- Rewrite architecture
- Modify Hermes kernel
- Run on benchmarks long-term
- Fake records

## Status

| Metric | Value |
|--------|:---:|
| Consecutive Stable | 0/30 |
| Human Overrides | 0 |
| Blind Eval Types | 0/5 |

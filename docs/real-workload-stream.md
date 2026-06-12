# Agent Hive — Real Workload Stream v1

## Mode
REAL WORKLOAD STREAM MODE — Continuous Runtime

## Rules
- No fixed task list — dynamic generation
- No template tasks — random structure
- No repeated patterns
- Input noise required (incomplete/ambiguous/conflicting)
- Tasks must be sourced (user/log/requirement/exception/synthetic)

## Task Record Format
```json
{
  "task_id": "...",
  "timestamp": "ISO8601",
  "system_version": "v1.10.0",
  "task_source": "P0|P1|P2|P3",
  "participating_agents": [],
  "execution_trace": "...",
  "token_usage": 0,
  "final_result": "...",
  "reviewer_result": "...",
  "human_result": "...",
  "success_criteria": "..."
}
```

## Failure Classification
- `execution_failure` — agent failed to execute
- `reasoning_failure` — agent reasoning wrong
- `context_failure` — context lost/drifted
- `reviewer_failure` — reviewer missed error
- `silent_failure` — surface success, actual error
- `systemic_failure` — ≥2 repeated occurrences
- `isolated_failure` — single occurrence

## Monitoring
- Timestamp per task
- System version per task
- Resource usage (CPU/memory/token peak)

## Anomaly Handling
- oversized_input → truncate + mark
- malformed_input → normalize + mark
- No silent drop

## Log Integrity
- Hash/checksum per observation log
- Verify no tampering

## Contamination Detection
- Reviewer output must not affect executor input
- Human override must not pollute task definition
- Fixes must be scoped to task_id

## Stability Milestones
| Stable Tasks | Action |
|:---:|--------|
| 30 | Light observation |
| 100 | Architecture freeze |
| 300 | System maturity |

## Current Status
- Consecutive Stable: 10/30
- Human Overrides: 0
- Systemic Failures: 0
- Isolated Failures: 1 (T3 case sensitivity)

# Agent Hive — Task Injection Set v1

## Rules
- Every task must have `success_criteria` (or task is invalid)
- All results must be verifiable
- All failures must be classifiable
- No simulated tasks

## Failure Classification
- `execution_failure` — agent failed to execute
- `reasoning_failure` — agent reasoning was wrong
- `context_failure` — context lost or drifted
- `reviewer_failure` — reviewer missed an error
- `silent_failure` — surface success but actual error

## Task Set

### P0 — Production Tasks

**T1: Routing Performance Fix** ✅
- Result: No real routing bottleneck found (0.03ms per call)
- Agent contributions: Planner (high), Router (high)
- Failure type: N/A (no failure)
- Override: None

**T2: Execution Chain Recovery** ✅
- Result: DAG correctly handles partial failure, replay captures events
- Agent contributions: DAGExecutor (high), EventBus (high)
- Failure type: N/A (recovery works)
- Override: None

**T3: Hidden Error Detection** ✅ (with fix)
- Result: Reviewer detection rate 40% → improved with case-insensitive keyword matching
- Finding: Reviewer keyword detection was case-sensitive (bug)
- Fix: `outputLower.includes(keyword.toLowerCase())`
- Agent contributions: Reviewer (high)
- Failure type: `reviewer_failure` (case sensitivity bug)
- Override: None
- Tag: `Reviewer_case_sensitivity_medium`

### P1 — User-Level Tasks

**T4: API Service Implementation** (pending)
**T5: Token Optimization** (pending)

### P2 — System Stress Tests

**T6: Planner Ablation Test** (pending)
**T7: Reviewer Blind Spot Test** (pending)
**T8: Context Drift Test** (pending)

### P3 — Benchmark

**T9:** CRUD baseline (pending)
**T10:** Documentation generation baseline (pending)

## Observations

### T1 Finding
- Routing is already O(n*m) but with small n (4 tasks) and m (3 agents), it's effectively instant
- No optimization needed

### T2 Finding
- DAG executor correctly propagates failures
- Dependent tasks are blocked when dependency fails
- Replay captures full execution chain

### T3 Finding
- Reviewer keyword detection was case-sensitive (bug)
- "TODO" in output was not detected because `outputLower.includes("TODO")` is false
- Fix: case-insensitive comparison
- Detection rate: 2/5 → 3/5 (60%) after fix

## Metrics

| Task | Status | Failure Type | Override | Human Override |
|------|--------|-------------|:---:|:---:|
| T1 | ✅ | — | — | — |
| T2 | ✅ | — | — | — |
| T3 | ✅ | reviewer_failure | — | — |
| T4 | pending | — | — | — |
| T5 | pending | — | — | — |
| T6 | pending | — | — | — |
| T7 | pending | — | — | — |
| T8 | pending | — | — | — |
| T9 | pending | — | — | — |
| T10 | pending | — | — | — |

## Consecutive Stable Tasks: 3/30

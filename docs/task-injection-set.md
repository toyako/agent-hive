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

## Collapse/Override Tags
Format: `[agent + failure_type + severity]`
Examples: `Router_context_failure_high`, `Reviewer_logic_miss_critical`

## Task Set

### P0 — Production Tasks

**T1: Routing Performance Fix**
- Task: Fix task routing delay in Agent Hive
- Requirements: Find bottleneck, analyze Planner/Router/Executor, minimal fix, regression 5x
- success_criteria: routing latency reduced OR step count reduced OR completion time improved

**T2: Execution Chain Recovery**
- Task: Simulate execution interrupt (Planner done, Executor interrupted, Reviewer incomplete)
- Requirements: Recover task state, rebuild context, complete chain
- success_criteria: task completed, no context loss, output consistency correct

**T3: Hidden Error Detection**
- Task: Construct "surface correct but logic wrong" output
- Requirements: Reviewer must identify error, if not → Human Override
- success_criteria: Reviewer detection accuracy OR Human Override triggered

### P1 — User-Level Tasks

**T4: API Service Implementation**
- Task: Implement complete API endpoint (validation, error handling, logging, unit test, response standardization)
- success_criteria: API runnable, all tests pass, response structure matches spec

**T5: Token Optimization**
- Task: Optimize Agent Hive token usage efficiency
- Constraints: No architecture refactor, local optimization only
- success_criteria: token usage reduced OR steps reduced OR prompt length optimized

### P2 — System Stress Tests

**T6: Planner Ablation Test**
- Task: Temporarily disable Planner
- Observe: Router takeover? Executor fills logic? System still runs?
- success_criteria: system can still complete tasks OR failure mode identifiable

**T7: Reviewer Blind Spot Test**
- Task: Design subtle error tasks
- success_criteria: Reviewer must detect error OR Human Override triggered

**T8: Context Drift Test**
- Task: 8-step long chain + mid-chain semantic drift
- success_criteria: task goal not lost OR drift auto-corrected

### P3 — Benchmark

**T9:** CRUD baseline
**T10:** Documentation generation baseline

## Task Status

| ID | Status | Result | Override | Failure Type |
|----|--------|--------|:---:|-------------|
| T1 | pending | — | — | — |
| T2 | pending | — | — | — |
| T3 | pending | — | — | — |
| T4 | pending | — | — | — |
| T5 | pending | — | — | — |
| T6 | pending | — | — | — |
| T7 | pending | — | — | — |
| T8 | pending | — | — | — |
| T9 | pending | — | — | — |
| T10 | pending | — | — | — |

## Observations
(Record findings here as tasks complete)

# ADR-002: DAG Execution

## Context
Need parallel execution model for multi-agent workflows.

## Decision
DAG with topological sort for execution ordering.

## Consequences
- Positive: Parallel execution, clear dependencies
- Negative: More complex than linear execution

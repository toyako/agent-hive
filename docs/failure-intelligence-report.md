# Failure Intelligence Report — v1

## Executive Summary
System HEALTHY with 26% confidence. Low data volume limits analysis reliability.

## Early Failure Signals

| Signal | Severity | Strength | FP Risk | Confirmed |
|--------|:---:|:---:|:---:|:---:|
| High-frequency reset burst | MEDIUM | 0.60 | 0.10 | ✓ |
| Silent failure spike | LOW | 0.04 | 0.20 | UNCONFIRMED |

## Silent Failure Analysis
- Rate: 3.6%
- Clusters: None detected
- Reviewer correlation: Present

## Reviewer Bias
- Over-permissive: Low
- Over-restrictive: Low

## Drift Analysis
- Score: 0.43
- Direction: degrading
- Confidence: Low (insufficient data)

## Collapse Precursor
- Risk: LOW
- Triggers: reset_clustering (2 resets in recent tasks)

## Cross-layer Consistency
- Consistent: YES

## Causal Attribution
- Executor: 1 failure
- Reviewer: 2 failures
- Total attributed: 3/3

## System Health: HEALTHY

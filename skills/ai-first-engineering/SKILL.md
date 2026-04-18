---
name: ai-first-engineering
description: Engineering operating model for teams where AI agents generate a large share of implementation output.
origin: ECC
---

# AI-First Engineering

Use this skill when designing process, reviews, and architecture for teams shipping with AI-assisted code generation.

## Process Shifts

1. Planning quality matters more than typing speed
2. Eval coverage matters more than anecdotal confidence
3. Review focus shifts from syntax to system behavior

## Architecture Requirements

Prefer architectures that are agent-friendly:
- Explicit boundaries
- Stable contracts
- Typed interfaces
- Deterministic tests

Avoid implicit behavior spread across hidden conventions.

## Code Review in AI-First Teams

Review for:
- Behavior regressions
- Security assumptions
- Data integrity
- Failure handling
- Rollout safety

Minimize time spent on style issues already covered by automation.

## Hiring and Evaluation Signals

Strong AI-first engineers:
- Decompose ambiguous work cleanly
- Define measurable acceptance criteria
- Produce high-signal prompts and evals
- Enforce risk controls under delivery pressure

## Testing Standard

Raise testing bar for generated code:
- Required regression coverage for touched domains
- Explicit edge-case assertions
- Integration checks for interface boundaries

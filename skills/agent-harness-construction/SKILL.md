---
name: agent-harness-construction
description: Design and optimize AI agent action spaces, tool definitions, and observation formatting for higher completion rates.
origin: ECC
---

# Agent Harness Construction

Use this skill when improving how an agent plans, calls tools, recovers from errors, and converges on completion.

## Core Model

Agent output quality is constrained by:
1. Action space quality
2. Observation quality
3. Recovery quality
4. Context budget quality

## Action Space Design

1. Use stable, explicit tool names
2. Keep inputs schema-first and narrow
3. Return deterministic output shapes
4. Avoid catch-all tools unless isolation is impossible

## Granularity Rules

- Use micro-tools for high-risk operations (deploy, migration, permissions)
- Use medium tools for common edit/read/search loops
- Use macro-tools only when round-trip overhead is the dominant cost

## Observation Design

Every tool response should include:
- `status`: success | warning | error
- `summary`: one-line result
- `next_actions`: actionable follow-ups
- `artifacts`: file paths / IDs

## Error Recovery Contract

For every error path, include:
- Root cause hint
- Safe retry instruction
- Explicit stop condition

## Context Budgeting

1. Keep system prompt minimal and invariant
2. Move large guidance into skills loaded on demand
3. Prefer references to files over inlining long documents
4. Compact at phase boundaries, not arbitrary token thresholds

## Architecture Pattern Guidance

- **ReAct**: Best for exploratory tasks with uncertain path
- **Function-calling**: Best for structured deterministic flows
- **Hybrid (recommended)**: ReAct planning + typed tool execution

## Benchmarking

Track:
- Completion rate
- Retries per task
- pass@1 and pass@3
- Cost per successful task

## Anti-Patterns

- Too many tools with overlapping semantics
- Opaque tool output with no recovery hints
- Error-only output without next steps
- Context overloading with irrelevant references

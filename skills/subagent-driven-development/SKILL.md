---
name: subagent-driven-development
description: Execute implementation plans by dispatching a fresh subagent per task, with two-stage review (spec compliance then code quality) after each.
origin: ECC
---

# Subagent-Driven Development

Execute plans by dispatching fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration.

## When to Use

- Have an implementation plan with independent tasks
- Tasks are mostly independent (not tightly coupled)
- Want to stay in the same session (vs. parallel sessions)

## The Process

1. Read plan, extract all tasks with full text and context
2. For each task:
   a. Dispatch implementer subagent with full task text + context
   b. If implementer asks questions, answer and re-dispatch
   c. Implementer implements, tests, commits, self-reviews
   d. Dispatch spec reviewer subagent -- confirms code matches spec
   e. If spec issues found, implementer fixes, re-review
   f. Dispatch code quality reviewer subagent
   g. If quality issues found, implementer fixes, re-review
   h. Mark task complete
3. After all tasks: dispatch final code reviewer for entire implementation

## Model Selection

- **Mechanical implementation tasks** (1-2 files, clear spec): use a fast, cheap model
- **Integration and judgment tasks** (multi-file coordination): use a standard model
- **Architecture, design, and review tasks**: use the most capable model

## Handling Implementer Status

- **DONE**: Proceed to spec compliance review
- **DONE_WITH_CONCERNS**: Read concerns before proceeding
- **NEEDS_CONTEXT**: Provide missing context and re-dispatch
- **BLOCKED**: Assess blocker -- provide more context, use more capable model, break into smaller pieces, or escalate

Never ignore an escalation or force the same model to retry without changes.

## Advantages

**vs. Manual execution:**
- Subagents follow TDD naturally
- Fresh context per task (no confusion)
- Parallel-safe (subagents don't interfere)

**Quality gates:**
- Self-review catches issues before handoff
- Two-stage review: spec compliance, then code quality
- Review loops ensure fixes actually work

## Red Flags

- Never skip reviews (spec compliance OR code quality)
- Never proceed with unfixed issues
- Never dispatch multiple implementation subagents in parallel (conflicts)
- Never make subagent read plan file (provide full text instead)
- Never start code quality review before spec compliance passes
- Never move to next task while either review has open issues

**If reviewer finds issues:**
1. Implementer (same subagent) fixes them
2. Reviewer reviews again
3. Repeat until approved

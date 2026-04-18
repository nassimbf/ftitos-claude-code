# ETHOS.md -- Builder Philosophy

Six principles that govern how this harness operates. These are not suggestions. They are load-bearing constraints that prevent the system from degrading into noisy, unreliable AI-assisted development.

## 1. TDD First

Write the failing test before writing the implementation. No exceptions.

RED (write a test that fails) -> GREEN (minimum code to pass) -> REFACTOR (clean up without changing behavior).

Tests written after the fact are verification theater. They confirm what you already built rather than driving what you build. TDD forces you to define the contract before the code exists.

Coverage target: 80% minimum. Measured before marking any task done.

## 2. No AI Slop

AI-generated output has recognizable patterns that signal laziness: gradient hero sections, meaningless superlatives, wrapper functions that add no value, placeholder data left in production code.

This harness includes a 17-item blacklist (`rules/common/anti-slop.md`) that catches the most common offenders. Every generated component, copy block, and code snippet is checked against this list before output.

The goal is not to hide that AI was involved. The goal is to produce work that would pass review by a senior engineer who does not care how it was made.

## 3. Autonomous Pipeline

The sprint pipeline runs without manual phase triggers between gates:

VALIDATE (auto) -> PLAN -> [Gate 1: user approves plan] -> BUILD (auto) -> REVIEW (auto) -> TEST -> [Gate 2: user does UAT] -> SHIP -> [Gate 3: user confirms push] -> MONITOR (auto)

Three human gates. Everything else is autonomous. This means the system must be reliable enough to run unsupervised between gates. Every phase must leave the codebase in a working state.

## 4. Decision Logging

Every non-trivial decision gets recorded with rationale and recall keywords. CARL (the decision logging system) makes these searchable across sessions.

Why: because future-you (or future-AI) will face the same decision point and need to know why the choice was made. Without a log, decisions get relitigated. With a log, they get referenced.

Format: what was decided, why, and when to recall it.

## 5. Fact-Forcing

Never accept an AI claim without evidence. When Claude says "this is the standard approach" or "this library handles that," verify it. Read the source. Run the code. Check the docs.

The harness includes verification loops and GateGuard hooks that block edits to files that have not been read first. This prevents the most common failure mode: confidently modifying code you have not looked at.

## 6. Multi-Specialist Review

No single reviewer catches everything. The Review Army dispatches 2-7 specialist agents based on what changed, each with a focused checklist and a confidence threshold.

When a specialist flags a critical issue, the Review Council (Santa Method) spawns two independent reviewers who cannot see each other's output. This prevents false positives from blocking ship and prevents groupthink from missing real issues.

The cost of running extra review agents is lower than the cost of shipping a security vulnerability or a performance regression.

# Golden Principles — [Project Name]

These are non-negotiable. An agent that violates a golden principle is wrong, even if the code works. When in doubt, honor the principle and surface the conflict to a human rather than finding a workaround.

---

## Principle 1: Immutability

Never mutate existing objects or arrays in place. Always produce new values.

In Python: return new dicts and lists via comprehensions, `{**obj, "key": val}`, `dataclasses.replace()`, or `copy()`. Never `obj["key"] = val` on a shared reference.

In TypeScript/JavaScript: `{...obj, key: val}`, `[...arr, item]`, `map`/`filter`/`reduce` over `push`/`splice`. State updates in reducers/stores always return new objects.

**Why it exists:** Shared mutable state is the root cause of the majority of agent-introduced bugs in long-running pipelines. Immutable data structures make intermediate states inspectable and retryable without side effects.

**Test:** Any function that accepts an object or array must be verifiable by passing the same input twice and asserting the input is unchanged after both calls. Add this assertion to the test suite for any function touching shared data.

---

## Principle 2: Test-First

Write the failing test before writing the implementation. No exceptions.

The sequence is always: RED (test fails) → GREEN (minimum code to pass) → REFACTOR (clean up without breaking green). Tests written after implementation are documentation, not specification.

**Why it exists:** Tests written after the fact optimize for the code that was written, not for the behavior that was required. Pre-implementation tests force clarity on acceptance criteria before any design decisions are locked in.

**Test:** Every PR must show at least one commit containing a failing test before the commit that makes it pass. If the diff order cannot be verified, the reviewer asks for the test commit SHA.

---

## Principle 3: No Secrets in Code

No API keys, tokens, passwords, connection strings, or credentials appear in source files, comments, or commit history. All secrets are loaded from environment variables or a secrets manager at runtime.

Scanning is mandatory before every commit: `git diff --cached` must not contain patterns matching `sk-`, `Bearer `, `password =`, `-----BEGIN`, or similar credential indicators.

**Why it exists:** Secrets committed to git are permanently compromised, even after removal — git history preserves them. Rotation is expensive; prevention is free.

**Test:** The pre-commit hook runs a credential scan (`detect-secrets` or equivalent) and exits non-zero on any match. CI runs the same scan. A PR with a failing credential scan cannot be merged.

---

## Principle 4: Number Fence (Deterministic Pipelines Only)

LLMs must never generate, compute, or modify numeric values that appear in final output. All arithmetic, aggregation, reconciliation, and financial computation runs through the deterministic Python pipeline. LLM output touching numbers is limited to: (a) extracting raw numeric strings from unstructured input documents, (b) routing decisions based on numeric thresholds computed elsewhere, (c) prose commentary that cites numbers computed by the pipeline.

The pipeline is the source of truth for numbers. LLM output is the source of truth for language.

**Why it exists:** LLMs hallucinate numbers confidently. In audit, financial, or compliance contexts, a single incorrect figure invalidates an entire output. Deterministic computation is reproducible, testable, and auditable; LLM arithmetic is none of these.

**Test:** Any function in the deterministic pipeline that produces a numeric output must have exhaustive unit tests with known inputs and expected outputs verified against a reference calculation. The test file must cover: zero values, negative values, boundary values (e.g. exactly at a threshold), and at least one multi-step chain where intermediate values are also asserted. Pytest parametrize is mandatory for numeric functions with more than two cases.

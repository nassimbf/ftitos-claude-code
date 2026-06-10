---
name: openspec
description: Delta-specs against a living source-of-truth — brownfield-native, EARS acceptance criteria, blind-judge verifiable. Use when adding or changing a feature in an existing codebase that already has documented behavior. Produces ~1/3 the markdown of a full spec-kit spec by expressing only what changes.
origin: Fission-AI/OpenSpec adapted for brownfield
---

# OpenSpec — Delta Specs for Brownfield Projects

## Overview

OpenSpec works *against* a living source-of-truth rather than creating standalone specifications from scratch. The result is approximately one-third the markdown of a traditional spec, with stronger verifiability because every requirement is anchored to an existing canonical document.

**When to use OpenSpec instead of spec-driven-development:**
- The codebase already has documented behavior (a module CLAUDE.md, an existing product spec, an ADR)
- You are changing or extending existing behavior, not building from scratch
- The feature scope is bounded to one or two modules

**When to use spec-driven-development instead:**
- Greenfield project or module with no prior specification
- The change crosses 4+ modules with no canonical reference file

---

## Core Concepts

### 1. Source-of-Truth Document

Every OpenSpec delta targets exactly one canonical reference file per module. This is the document that describes current behavior authoritatively.

Valid source-of-truth files (in priority order):
1. `docs/product-specs/[feature].md` — the feature's existing spec file
2. The module's `CLAUDE.md` or `AGENTS.md` — if it contains behavioral descriptions
3. An ADR in `docs/design-docs/` that defines the component's contract
4. The module's public interface docstring if no doc file exists

**Rule:** If no source-of-truth file exists, write one before writing a delta. A delta with no source is not a delta — it is a new spec, and should use spec-driven-development instead.

### 2. Delta Format

A delta-spec describes what changes relative to the source-of-truth. It does not repeat what stays the same.

```markdown
# Delta: [Feature Name]

source_of_truth: docs/product-specs/[feature].md
source_version: [sha256 first 8 chars of source file at time of writing]
date: YYYY-MM-DD
author: [agent or human]

## Context
[1-2 sentences: why this change is happening]

## Changes

### ADD: [Name of new behavior]
WHEN [trigger] THE SYSTEM SHALL [response]
WHEN [trigger] THE SYSTEM SHALL [response]

### CHANGE: [Name of modified behavior]
WAS: [quote or paraphrase of the old EARS statement from source]
NOW: [new EARS statement]
BECAUSE: [one sentence reason]

### REMOVE: [Name of removed behavior]
WAS: [what was specified]
BECAUSE: [one sentence reason]

## Out of Scope
[Explicit list of related things this delta does NOT touch]

## Open Questions
[Anything that must be resolved before implementation begins]
```

### 3. EARS Syntax

All acceptance criteria in delta-specs use EARS (Easy Approach to Requirements Syntax). EARS statements are the contract the blind judge verifies against — they must be testable by observation, not by reading code.

**Five templates:**

| Template | Pattern | Use When |
|----------|---------|----------|
| Ubiquitous | `THE SYSTEM SHALL [response]` | Always-true constraints |
| Event-driven | `WHEN [trigger] THE SYSTEM SHALL [response]` | User actions, external events |
| State-driven | `WHILE [state] THE SYSTEM SHALL [behavior]` | Ongoing conditions |
| Option | `WHERE [feature] IS ENABLED THE SYSTEM SHALL [response]` | Conditional / feature-flagged behavior |
| Conditional | `IF [condition] THEN THE SYSTEM SHALL [action]` | Pre-conditions before an action |

**Writing rules:**
1. One requirement per EARS statement — no "and" connectors splitting two obligations
2. The response must be testable: it describes an observable output, state change, or measurable property
3. Use "shall" for mandatory, "may" for optional — never "should"
4. Numeric tolerances are explicit: "within 0.01 EUR" not "approximately equal"

**A3 examples:**
- `WHEN the Anlagenspiegel is generated THE SYSTEM SHALL reconcile to the balance sheet within 0.01 EUR tolerance`
- `WHILE the FA agent is running THE SYSTEM SHALL NOT generate any numeric values via LLM`
- `IF the rollforward closing balance does not equal opening + additions - disposals - depreciation THEN THE SYSTEM SHALL emit an adverse conclusion and halt`
- `WHERE HGB_MODE IS ENABLED THE SYSTEM SHALL apply §253 Abs.3 straight-line depreciation rules`
- `WHEN a subledger reconciliation gap exceeds 0.00 EUR THE SYSTEM SHALL classify the finding as a control deficiency`

### 4. Contract Verification — The Blind Judge

The blind judge is a reviewer agent whose tool manifest **excludes Edit and Write**. It receives:
1. The delta-spec file
2. The source-of-truth document at `source_version`
3. The diff of the implementation

The blind judge verifies each EARS statement independently: "Is there evidence in the diff that this criterion is met?" It returns PASS, FAIL, or UNVERIFIABLE for each criterion. UNVERIFIABLE means the criterion is not observable from the diff alone — the agent must add an observable signal (log line, metric, return value) before the judge can assess it.

**The judge never reads the builder's implementation context.** It sees only the spec and the diff. This eliminates the shared-blind-spot problem where the same model that wrote the code also verifies it.

**Acceptance threshold:** All EARS criteria must be PASS or UNVERIFIABLE-resolved before the delta is closed.

### 5. Staleness Detection

A delta-spec includes a `source_version` field containing the first 8 characters of the SHA-256 hash of the source-of-truth file at the time the delta was written.

Before implementing a delta, verify the source-of-truth has not changed:

```bash
# Compute current hash of the source-of-truth
python3 -c "
import hashlib, sys
content = open(sys.argv[1], 'rb').read()
print(hashlib.sha256(content).hexdigest()[:8])
" docs/product-specs/[feature].md
```

If the current hash differs from `source_version` in the delta, the source-of-truth has changed since the delta was written. The delta is **invalidated** — it must be re-reviewed against the updated source before implementation proceeds. Do not silently proceed with a stale delta.

---

## Workflow

```
IDENTIFY source-of-truth
       │
       ▼
WRITE delta-spec (EARS criteria, source_version hash)
       │
       ▼ Human reviews delta — "approve"
       │
       ▼
IMPLEMENT (builder agent, fresh context: delta + source-of-truth only)
       │
       ▼
BLIND JUDGE verifies each EARS criterion against the diff
       │
       ▼ All criteria PASS → merge
```

---

## Delta-Spec File Naming

```
docs/product-specs/deltas/[feature-slug]-[YYYY-MM-DD].md
```

Completed deltas move to `docs/exec-plans/completed/` alongside their implementation plan when the branch is merged.

---

## When a Delta Grows Beyond Scope

If a delta-spec accumulates more than 8 EARS criteria or touches more than 2 source-of-truth documents, it has become a full spec. Convert it to a `docs/product-specs/[feature].md` file and process it through the spec-driven-development workflow instead.

---

## Integration with the Verification Stack

OpenSpec sits at L7 of the factory architecture. The EARS criteria it produces are the input to:
- **L3 Gate 3 (blind judge):** direct verification of each criterion against the diff
- **L3 Gate 2 (property-based testing):** EARS invariants (`WHILE` and ubiquitous statements) translate directly to Hypothesis invariants
- **Review Army API Contract Specialist:** `CHANGE:` entries in the delta flag potential breaking changes for the specialist checklist

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Delta with no `source_version` | Cannot detect staleness | Always hash the source at delta-creation time |
| EARS criterion with "and" | Two obligations in one statement, partially verifiable | Split into two EARS statements |
| `CHANGE:` entry with no `BECAUSE:` | Removes the audit trail for the decision | Always explain the reason for a behavioral change |
| Delta targeting a file that doesn't exist | Not a delta — it's a new spec | Use spec-driven-development workflow |
| Blind judge given access to Edit/Write tools | Destroys independence | Strip tools from judge's tool manifest before dispatch |

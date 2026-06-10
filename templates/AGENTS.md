# [Project Name] — Agent Handbook

## What This Is

[2-3 sentences max: what the project does and what problem it solves. Be specific — name the user, the output, and the constraint that makes this hard.]

---

## Architecture Map

```
docs/design-docs/           — system design, ADRs, component diagrams
docs/exec-plans/active/     — current sprint plans (PLAN.md pattern)
docs/exec-plans/completed/  — shipped plans, reference only
docs/product-specs/         — feature specs, EARS acceptance criteria
docs/generated-schemas/     — auto-generated API/DB schemas (never hand-edit)
docs/golden-principles.md   — the non-negotiables every agent must honor
docs/core-beliefs.md        — tech bets and architectural philosophy
```

> **Doc-freshness rule:** If any `docs/` file was last updated more than 30 days before the current task's date, flag it as potentially stale before acting on it. Do not silently rely on outdated design decisions.

---

## Entrypoints

```bash
# [Install / setup]

# [Run dev server — must be inside a named tmux session]

# [Run tests]

# [Run linter / type checker]
```

---

## Human Gates

```
Gate 1: Plan approval    — review PLAN.md + CONTEXT.md, type "approve"
Gate 2: UAT             — test the product yourself, type "approved"
Gate 3: Ship            — final push confirmation, type "ship"
```

Everything between gates runs autonomously. Do not pause to ask for confirmation on individual implementation steps unless a constraint below is at risk.

---

## Key Constraints

- [Constraint 1 — the thing that causes bugs if ignored, e.g. "All numeric output must come from the deterministic pipeline — never LLM-generated"]
- [Constraint 2 — e.g. "Every DB query must use parameterized statements — never string concatenation"]
- [Constraint 3 — e.g. "Tests are written before implementation — no code without a red test first"]
- [Constraint 4 — e.g. "No secrets in source — all credentials via env vars"]
- [Constraint 5 — e.g. "Dev servers only inside named tmux sessions"]

---

## What NOT to Do

- Do not implement features not covered by an open spec or task in `docs/product-specs/` or an active PLAN.md — ask first.
- Do not make architectural decisions (new dependencies, schema changes, changed interfaces) without updating `docs/design-docs/` first.
- Do not advance to implementation if the spec's acceptance criteria are not written in EARS syntax and testable.

# docs/ Directory Layout

This directory is the single source of truth for everything an agent or engineer needs to work on this project. `AGENTS.md` / `CLAUDE.md` is a table of contents pointing here — the detail lives in these subdirectories.

---

## Directory Structure

```
docs/
├── design-docs/           — System design, ADRs, component diagrams
├── exec-plans/
│   ├── active/            — Live sprint plans (PLAN.md format)
│   └── completed/         — Archived shipped plans (read-only reference)
├── product-specs/         — Feature specs in EARS syntax
├── generated-schemas/     — Auto-generated API/DB schemas
├── golden-principles.md   — Non-negotiable constraints every agent must honor
└── core-beliefs.md        — Tech philosophy and architectural bets
```

---

## `design-docs/`

System design documents and Architecture Decision Records (ADRs).

**ADR naming:** `ADR-NNNN-short-title.md` (e.g. `ADR-0012-use-pgvector-for-rag.md`).

Each ADR covers: Status · Context · Decision · Consequences. Once an ADR is `Accepted`, it is immutable — create a new ADR to supersede it.

Component diagrams live here as Mermaid source (`.md`) or exported images. Diagrams are versioned alongside code — update the diagram in the same PR as the code change.

---

## `exec-plans/active/`

Live sprint plans in PLAN.md format. Each plan file covers one sprint or feature branch. Plans are first-class versioned artifacts — an agent that cannot find a plan in `active/` has no authorization to build anything.

Plan files move to `completed/` when all tasks are shipped and the branch is merged.

**Rule:** Never keep more than 3 plan files in `active/` simultaneously. If a fourth is needed, the oldest must be completed, cancelled, or promoted to a new ADR first.

---

## `exec-plans/completed/`

Archived plans for shipped features. Read-only reference — do not modify. Useful for understanding why a decision was made or what a feature originally specified.

---

## `product-specs/`

Feature specifications written in EARS syntax (see `docs/golden-principles.md`). One file per feature or user story set.

**Naming:** `[feature-slug].md` (e.g. `fixed-assets-rollforward.md`).

Each spec file must include:
- Objective and user story
- EARS acceptance criteria (machine-checkable, one requirement per statement)
- Out-of-scope section (explicit about what this spec does NOT cover)
- Open questions (resolved before implementation begins)

A spec file in `product-specs/` is the contract the blind judge verifies against. If a criterion cannot be expressed in EARS syntax, it is not yet specific enough to implement.

---

## `generated-schemas/`

Auto-generated files — API schemas (OpenAPI), database schemas, type exports. **Never hand-edit these files.** Changes to the source (migration, type definition, route handler) regenerate them automatically.

If a generated file is out of sync with source, fix the source and re-run generation. Do not patch the generated file directly.

---

## `golden-principles.md`

The non-negotiables. Principles that every agent must honor regardless of task context. Violating a golden principle is always wrong, even if the code works.

See the template at `templates/docs-layout/golden-principles.md`.

---

## `core-beliefs.md`

The project's architectural bets and technical philosophy — the "why we chose this" document. This is the place to explain decisions that are not obvious from the code (e.g. "we chose X over Y because of constraint Z that won't appear in the codebase").

Agents should read `core-beliefs.md` before making technology choices or proposing new dependencies.

---

## Maintenance Rules

- **Staleness threshold:** Any file last updated more than 30 days before the current task's date should be flagged before being relied upon.
- **Ownership:** Every file in `docs/` has one canonical owner (a person or an agent role). Disputes about content go to the owner.
- **Co-evolution:** Docs and code change in the same PR. A PR that changes behavior without updating the relevant `docs/` file is incomplete.
- **No orphans:** A doc file with no corresponding code or active plan should be deleted or moved to `completed/`.

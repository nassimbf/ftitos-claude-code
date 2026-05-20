---
name: project:constitution
description: Constitution governance — create, amend, or check project constitution
argument-hint: "create | amend <article> | check <artifact>"
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion]
---

<objective>
Manage a versioned constitution for the current project. The constitution consolidates
workspace-level rules (~/.claude/rules/) with project-specific constraints into a single
governance document that gates all plans and implementations.

Usage:
  /project:constitution create          → Generate constitution.md for current project
  /project:constitution amend <article> → Add or modify a constitution article
  /project:constitution check           → Validate current plan/spec against constitution
</objective>

<process>

## Step 1: Parse Subcommand

Extract from $ARGUMENTS:
- `create` — generate a new constitution
- `amend` — modify an existing article or add a new one
- `check` — validate artifacts against constitution

If no argument: show current constitution status (exists? version? article count?).

## Step 2: Determine Project Context

Read `.project/manifest.json` to get project name and description.
If no manifest: error — run `/project:init` first.

Set `CONSTITUTION_PATH` to `.project/constitution.md`.

---

## Subcommand: CREATE

### 2a. Read Workspace Rules

Read all files from `~/.claude/rules/`:
- `coding-style.md` — immutability, file size, function size, naming
- `testing.md` — 80% coverage, TDD, pytest, test pyramid
- `security.md` — no secrets, parameterized SQL, XSS, CSRF, rate limiting
- `performance.md` — model selection, context window, profiling
- `git-workflow.md` — conventional commits, atomic commits, PR workflow
- `anti-slop.md` — banned patterns in UI, copy, and code
- `development-workflow.md` — research-plan-TDD-implement-review-commit
- `agents.md` — parallel dispatch, fresh context, right agent
- `review-army.md` — 7 specialist checklist
- `review-council.md` — adversarial validation for CRITICAL findings

### 2b. Read Project-Specific Context

Read from project directory:
- `CLAUDE.md` — project rules
- `.paul/PROJECT.md` — project brief (if exists)
- `PRODUCT-BRIEF.md` — product definition (if exists)
- `.project/manifest.json` — framework state

### 2c. Generate Constitution

Create `.project/constitution.md` with this structure:

```markdown
# Constitution — [Project Name]

**Version:** 1.0.0
**Created:** [ISO timestamp]
**Last amended:** [ISO timestamp]

---

## Preamble

This constitution governs all planning, implementation, and review decisions
for [project-name]. It is the supreme authority — no plan, task, or code change
may contradict these articles. The constitution is checked at Gate 1 (Plan Approval)
and during /project:analyze consistency checks.

---

## Article 1: Code Standards

[Extracted from coding-style.md — immutability, file size limits, function size,
nesting depth, naming conventions, no dead code]

## Article 2: Testing Requirements

[Extracted from testing.md — 80% coverage, TDD mandatory, test pyramid,
no mocking internals, deterministic tests, pytest]

## Article 3: Security Requirements

[Extracted from security.md — no secrets, parameterized SQL, XSS prevention,
CSRF, rate limiting, input validation, dependency scanning]

## Article 4: Development Process

[Extracted from development-workflow.md — research first, plan, TDD, implement,
review, commit, tmux for servers, no half-finished work]

## Article 5: Git & Versioning

[Extracted from git-workflow.md — conventional commits, atomic commits,
no secrets, PR workflow, branch naming]

## Article 6: Quality Gates

[Extracted from review-army.md + review-council.md — 7 specialists,
adversarial council for CRITICALs, confidence thresholds]

## Article 7: Performance & Resources

[Extracted from performance.md — model selection rules, context management,
profiling before optimizing]

## Article 8: Design & Copy Standards

[Extracted from anti-slop.md — banned visual patterns, banned copy phrases,
banned code patterns]

## Article 9: Agent Governance

[Extracted from agents.md — parallel dispatch, fresh context, right agent,
multi-perspective analysis]

## Article 10: Project-Specific Constraints

[Extracted from project CLAUDE.md, PRODUCT-BRIEF.md — domain-specific rules,
tech stack constraints, business logic invariants]

---

## Amendment Log

| Version | Date | Article | Change | Rationale |
|---------|------|---------|--------|-----------|
| 1.0.0 | [date] | All | Initial constitution | Project initialization |
```

### 2d. Update Manifest

Update `.project/manifest.json`:
```json
{
  "constitution": {
    "version": "1.0.0",
    "articles": 10,
    "created": "[ISO timestamp]",
    "last_amended": "[ISO timestamp]"
  }
}
```

### 2e. Display Summary

```
════════════════════════════════════════
CONSTITUTION CREATED: [project-name]
════════════════════════════════════════

Version: 1.0.0
Articles: 10
Location: .project/constitution.md

Sources consolidated:
  ~/.claude/rules/coding-style.md
  ~/.claude/rules/testing.md
  ~/.claude/rules/security.md
  ~/.claude/rules/performance.md
  ~/.claude/rules/git-workflow.md
  ~/.claude/rules/anti-slop.md
  ~/.claude/rules/development-workflow.md
  ~/.claude/rules/agents.md
  ~/.claude/rules/review-army.md
  ~/.claude/rules/review-council.md
  + project CLAUDE.md

The constitution will be checked at:
  - Gate 1 (Plan Approval) via Constitution Check
  - /project:analyze consistency gate

════════════════════════════════════════
```

---

## Subcommand: AMEND

### Input

`$ARGUMENTS` after "amend": article number or "new" + description of change.

### Process

1. Read current `.project/constitution.md`
2. Parse version (e.g., 1.0.0)
3. If modifying existing article: bump PATCH (1.0.0 → 1.0.1)
4. If adding new article: bump MINOR (1.0.0 → 1.1.0)
5. Apply the change to the relevant article
6. Append to Amendment Log table
7. Update manifest constitution.version and constitution.last_amended
8. Display the change with before/after

---

## Subcommand: CHECK

### Purpose

Validate that a plan or spec does not violate any constitution article.

### Process

1. Read `.project/constitution.md`
2. Read the target artifacts:
   - `.paul/PLAN.md` — implementation plan
   - `spec.md` — user stories (if exists)
   - `CONTEXT.md` — architectural decisions (if exists)
3. For each constitution article, spawn a validation check:
   - Does the plan violate this article?
   - Evidence: specific plan section + constitution article
   - Severity: VIOLATION (blocks) or WARNING (flag but don't block)
4. Output results:

```
════════════════════════════════════════
CONSTITUTION CHECK: [project-name]
════════════════════════════════════════

Constitution: v1.0.0 (10 articles)
Artifacts checked: PLAN.md, spec.md, CONTEXT.md

Results:
  [PASS]      Article 1: Code Standards
  [PASS]      Article 2: Testing Requirements
  [VIOLATION] Article 3: Security Requirements
              → PLAN.md line 45: "Store API key in config.py"
              → Constitution: "No hardcoded secrets"
  [PASS]      Article 4: Development Process
  ...

Violations: 1 CRITICAL
Warnings: 0

Status: BLOCKED — resolve violations before Gate 1 approval.

════════════════════════════════════════
```

If zero violations: output `Status: CLEAR — constitution check passed.`

</process>

<success_criteria>
- [ ] create: Constitution generated from all workspace rules + project context
- [ ] create: Manifest updated with constitution metadata
- [ ] amend: Version bumped correctly (PATCH for edit, MINOR for new article)
- [ ] amend: Amendment log updated
- [ ] check: All articles validated against target artifacts
- [ ] check: Violations block Gate 1 progression
</success_criteria>

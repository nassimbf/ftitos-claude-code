---
name: project:analyze
description: Cross-artifact consistency gate — validates spec, plan, tasks, and constitution alignment
argument-hint: "[--fix]"
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, Agent, AskUserQuestion]
---

<objective>
Run a cross-artifact consistency check before Gate 1 (Plan Approval). Reads spec.md
user stories, PLAN.md technical decisions, tasks.md/task-graph.json task list, and
constitution.md governance rules. Flags gaps, orphans, and violations.

This command runs automatically in the sprint pipeline between PLAN and Gate 1.
It can also be invoked standalone at any time.

Usage:
  /project:analyze          → Run full consistency check
  /project:analyze --fix    → Run check and auto-fix where possible
</objective>

<process>

## Step 1: Locate Artifacts

Read the following files (if they exist):

| Artifact | Primary path | Fallback |
|----------|-------------|----------|
| Spec | `spec.md` | `SPEC.md`, `.project/spec.md` |
| Plan | `.paul/PLAN.md` | `PLAN.md` |
| Tasks | `.project/task-graph.json` | `tasks.md`, `.paul/PHASES/*/tasks.md` |
| Constitution | `.project/constitution.md` | — |
| Context | `CONTEXT.md` | `.project/CONTEXT.md` |
| Product Brief | `PRODUCT-BRIEF.md` | — |

Log which artifacts were found and which are missing.

## Step 2: Extract Entities

### From spec.md:
- Extract all user stories tagged `[US1]`, `[US2]`, etc.
- Extract acceptance criteria for each story
- Build set: `SPEC_STORIES = {US1, US2, ...}`

### From PLAN.md:
- Extract all planned tasks/phases
- Extract technical decisions
- Extract file ownership assignments
- Build set: `PLAN_TASKS = {task IDs}`

### From task-graph.json or tasks.md:
- Extract all task entries
- Extract dependency relationships
- Extract `[P]` parallelism markers
- Build set: `TASK_IDS = {T-001, T-002, ...}`

### From constitution.md:
- Extract all articles and their key constraints
- Build set: `ARTICLES = {Article 1, Article 2, ...}`

## Step 3: Run Consistency Checks

### Check 1: Uncovered User Stories (CRITICAL)
For each story in SPEC_STORIES:
- Does at least one task in TASK_IDS reference this story?
- If not: flag as `UNCOVERED_STORY`

### Check 2: Orphan Tasks (HIGH)
For each task in TASK_IDS:
- Does it trace back to a user story in SPEC_STORIES?
- If not: flag as `ORPHAN_TASK` (task exists with no spec justification)

### Check 3: Constitution Violations (CRITICAL)
For each article in ARTICLES:
- Does any task or plan decision contradict this article?
- Spawn a validation subagent per article for parallel checking
- If violation found: flag as `CONSTITUTION_VIOLATION`

### Check 4: Missing Test Requirements (HIGH)
For each task in TASK_IDS:
- Does the task specify a test requirement or acceptance criteria?
- If not: flag as `MISSING_TEST_REQ`

### Check 5: Dependency Cycle Detection (CRITICAL)
- Build directed graph from task dependencies
- Run cycle detection (topological sort)
- If cycle found: flag as `DEPENDENCY_CYCLE`

### Check 6: File Ownership Conflicts (HIGH)
- For each file referenced in PLAN_TASKS:
  - Is it owned by exactly one task?
  - If multiple tasks claim the same file: flag as `OWNERSHIP_CONFLICT`

### Check 7: Parallelism Feasibility (MEDIUM)
- For tasks marked `[P]` (parallel):
  - Do they share file ownership? If yes: flag as `PARALLEL_CONFLICT`
  - Do they have unresolved dependencies? If yes: flag as `FALSE_PARALLEL`

### Check 8: Plan-Context Alignment (HIGH)
- For each decision in CONTEXT.md:
  - Is it reflected in the plan?
  - Does any task contradict it?

## Step 4: Severity Classification

| Severity | Meaning | Gate Impact |
|----------|---------|-------------|
| CRITICAL | Blocks Gate 1 | Must be resolved before "approve" |
| HIGH | Should be resolved | Warning at Gate 1 |
| MEDIUM | Informational | Logged but does not block |
| LOW | Minor inconsistency | Logged only |

## Step 5: Generate Report

Write `ANALYSIS-REPORT.md` in the project root:

```markdown
# Analysis Report — [Project Name]

**Generated:** [ISO timestamp]
**Artifacts analyzed:** [list]
**Missing artifacts:** [list]

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | N |
| HIGH | N |
| MEDIUM | N |
| LOW | N |

## Findings

### [CRITICAL] Uncovered User Story: [US3]
**Evidence:** spec.md line 42 defines US3 "As a user, I can reset my password"
**Impact:** No task in the plan implements this story — it will not be built
**Fix:** Add a task to wave 2 covering password reset flow

### [HIGH] Orphan Task: T-007
**Evidence:** task-graph.json T-007 "Add analytics dashboard"
**Impact:** No user story justifies this task — scope creep risk
**Fix:** Either add a user story or remove the task

### [CRITICAL] Constitution Violation: Article 3 (Security)
**Evidence:** PLAN.md line 45: "Store API key in config.py"
**Article:** "No hardcoded secrets — use env vars or secret managers"
**Fix:** Replace with environment variable reference

...

## Traceability Matrix

| User Story | Task(s) | Status |
|------------|---------|--------|
| US1 | T-001, T-002 | Covered |
| US2 | T-003 | Covered |
| US3 | — | UNCOVERED |

## Constitution Compliance

| Article | Status |
|---------|--------|
| 1. Code Standards | PASS |
| 2. Testing | PASS |
| 3. Security | VIOLATION |
| ... | ... |
```

## Step 6: Auto-Fix (if --fix flag)

For findings with clear fixes:
- `MISSING_TEST_REQ`: Add test requirement stub to task
- `ORPHAN_TASK`: Add traceability tag pointing to nearest user story
- `PARALLEL_CONFLICT`: Remove `[P]` marker from conflicting tasks

Do NOT auto-fix:
- Constitution violations (require human judgment)
- Uncovered user stories (require new task creation)
- Dependency cycles (require architectural decisions)

## Step 7: Display Summary

```
════════════════════════════════════════
ANALYSIS COMPLETE — [project-name]
════════════════════════════════════════

Artifacts: spec.md, PLAN.md, task-graph.json, constitution.md
Findings:  2 CRITICAL, 3 HIGH, 1 MEDIUM

CRITICAL (blocks Gate 1):
  1. Uncovered story US3 — no task implements password reset
  2. Constitution Article 3 violation — hardcoded API key

HIGH (resolve before BUILD):
  3. Orphan task T-007 — no user story justification
  4. Missing test requirement on T-004
  5. File ownership conflict: src/auth.py claimed by T-001 and T-003

Report: ANALYSIS-REPORT.md

Status: BLOCKED — resolve 2 CRITICAL findings before Gate 1.

════════════════════════════════════════
```

</process>

<success_criteria>
- [ ] All available artifacts located and parsed
- [ ] Traceability matrix built (stories → tasks)
- [ ] Constitution compliance checked per article
- [ ] Dependency graph validated (no cycles)
- [ ] ANALYSIS-REPORT.md generated with severity-ranked findings
- [ ] CRITICAL findings block Gate 1 progression
- [ ] Auto-fix applies only to safe, mechanical fixes
</success_criteria>

# PLAN Phase

Second phase of the sprint pipeline. Creates and validates the implementation plan, then locks architecture decisions before autonomous building begins.

## Purpose

Produce a reviewed, validated plan with locked architecture decisions, decomposed tasks, and team assignments. Ends at Human Gate 1 -- the last point where the user shapes the direction before autonomous execution.

## Entry Criteria

- VALIDATE phase complete (warning if skipped, not a hard block)
- `PRODUCT-BRIEF.md` and `RESEARCH.md` available as input

## What Happens

### Step 1: Generate Plan

Runs `/paul:plan` with PRODUCT-BRIEF.md and RESEARCH.md as input context. Produces a phased plan where each task:
- Takes 2 hours or less
- Has clear acceptance criteria
- Specifies file ownership
- Includes a test requirement

### Step 2: Plan Validation

A Plan Validator agent audits the plan for:
- Vague tasks (missing exit criteria, unclear scope)
- Oversized tasks (over 2 hours -- needs splitting)
- Missing coverage (auth, error handling, edge cases, security, data validation)
- Incorrect dependency ordering
- Missing test requirements

Output: `PLAN-REVIEW.md` listing issues and suggested fixes. Obvious issues (renaming vague tasks, splitting oversized ones) are auto-applied. Complex issues are flagged for human review.

### Step 3: Architecture Lock

Creates `CONTEXT.md` -- a read-only document that captures every architectural decision:
- Technology choices
- Data models
- API contracts
- Auth approach
- Database schema
- Key patterns

Format: explicit decisions with rationale. Example:
```
Decision: Use PostgreSQL. Reason: relational data with joins. NOT revisable during BUILD.
```

No Builder agent may contradict CONTEXT.md during the BUILD phase.

### Step 4: Task Decomposition and Assignment

If `team.json` exists:
1. `/ccg:task-decomposition` generates `.project/task-graph.json`
2. `/base:team-matrix` analyzes member skills and availability
3. Tasks are assigned to team members based on fit
4. Duration predictions are generated from historical performance data

### Step 5: Human Gate 1 -- Plan Approval

The pipeline stops and presents:
- `.paul/PLAN.md` -- the full phased plan
- `CONTEXT.md` -- locked architecture decisions
- `PLAN-REVIEW.md` -- validator findings
- `.project/task-graph.json` -- parallelization breakdown
- Team assignments with duration predictions

**User options:**
- Type `approve` -- starts autonomous BUILD immediately
- Describe changes -- plan is revised, re-validated, and re-presented
- `reassign T-004 to alice` -- override specific task assignments
- `apply calibration` -- accept weight adjustments from historical data

## Exit Criteria

- PAUL plan exists in `.paul/PLAN.md`
- `PLAN-REVIEW.md` generated
- `CONTEXT.md` created and locked
- User typed `approve`

## What Happens Next

Auto-advances to BUILD after Gate 1 approval.

## Manifest State

```json
{
  "sprint": {
    "validate": "done",
    "plan": "done"
  }
}
```

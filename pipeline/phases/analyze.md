# Phase: ANALYZE

Position: After Constitution Check, before Gate 1

## Purpose
Cross-artifact consistency gate — validates that spec, plan, task graph, and constitution are aligned before asking for human approval.

## Inputs
- spec.md (user stories)
- .paul/PLAN.md (tasks, technical decisions)
- .project/task-graph.json (dependencies)
- .project/constitution.md (governance rules)
- CONTEXT.md (architectural decisions)
- PRODUCT-BRIEF.md (product definition)

## 8 Consistency Checks

| # | Check | Severity |
|---|-------|----------|
| 1 | Uncovered user stories — story not in task list | CRITICAL |
| 2 | Orphan tasks — task not traced to spec story | HIGH |
| 3 | Constitution violations — task contradicts governance | CRITICAL |
| 4 | Missing test requirements — task lacks test spec | HIGH |
| 5 | Dependency cycles — graph has circular deps | CRITICAL |
| 6 | File ownership conflicts — multiple tasks claim same file | HIGH |
| 7 | Parallelism feasibility — [P] tasks have unresolved deps | MEDIUM |
| 8 | Plan-context alignment — decisions not reflected in plan | HIGH |

## Output
- `ANALYSIS-REPORT.md` — Severity-ranked findings + traceability matrix

## Auto-Fix Scope
- MISSING_TEST_REQ: Add test requirement stub
- ORPHAN_TASK: Add traceability tag
- PARALLEL_CONFLICT: Remove [P] marker

## Does NOT Auto-Fix
- Constitution violations
- Uncovered user stories
- Dependency cycles

## Gates
- Zero CRITICAL findings required to proceed to Gate 1
- HIGH findings are flagged but do not block

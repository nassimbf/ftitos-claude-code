# Phase: SPECIFY

Position: After VALIDATE, before PLAN

## Purpose
Decompose the validated feature brief into user stories with acceptance criteria.

## Inputs
- PRODUCT-BRIEF.md (from VALIDATE phase)
- RESEARCH.md (from VALIDATE phase)

## Process
1. Extract user stories from the brief: [US1], [US2], [US3]...
2. Each story gets: As a [role], I want [action], so that [outcome]
3. Define acceptance criteria per story (Given/When/Then)
4. Identify non-functional requirements (performance, security, accessibility)
5. Flag stories that need design mockups vs. code-only

## Output
- `spec.md` — User stories with acceptance criteria, ordered by priority
- Each story tagged [US1], [US2] for traceability through PLAN and BUILD

## Gates
- Every story must have at least 1 acceptance criterion
- Stories must be independently implementable (no implicit dependencies without explicit linking)

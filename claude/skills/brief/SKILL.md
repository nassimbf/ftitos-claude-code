---
name: brief
description: Research the task deeply, then question the user in rounds until no open question is left, then write the branch brief (goal, scope, worked examples, decisions, done-check) before any code edit. The scope-guard hook blocks A3 edits while the brief is missing or still has an open "- [ ]" question. Use at the start of every A3 task, when a3new starts a session, or when an edit is blocked with "No brief" or "open questions".
---

# Brief

Goal: when coding starts, nothing about the task is a guess. Every line of the brief is either
proven from the code (with `file:line`) or decided by the user. The `scope-guard` hook enforces
the end state: no brief, an open `- [ ]` question, or a file outside `## Scope` blocks every edit.

Research answers what the code can answer. Questions are only for what the code cannot answer.
Never ask the user something you could have read.

## 1. Get the task

If the user has not said what the task is, ask for it in one sentence. Restate it in one sentence
and continue.

## 2. Research (before any question)

Do all of this before you ask anything. For broad searches, send `Explore` subagents in parallel
so the main context stays small; read the files that matter yourself, in full.

- **Code:** find every file and function the task touches. Grep every caller of each function
  you may change (a fix belongs in the shared function, not in one caller). Read them in full.
- **History:** `git log --oneline -15 -- <file>` and `git log -S'<symbol>'` for each hot file.
  Many recent `fix` commits on a file = a hotspot: find out why before you add another patch.
- **Tests and fixtures:** the existing tests for these files, and the corpus / `fixtures/` cases
  that cover the area. Note what is NOT covered.
- **Decisions already made:** memory (`MEMORY.md` index, then the relevant files), open PRs and
  issues (`gh pr list`, `gh issue list --search`), `docs/planning/v1/` (DEV-PLAN, CODING-GUIDELINES,
  GR-CL rules), `~/.claude/rules/a3-lessons.md`.
- **Libraries:** current docs through Context7 for any library API you will use. Never from memory.

Write down each finding with its `file:line` or command. A finding without a source is an
assumption, and an assumption becomes a question.

## 3. Find every unknown

Go through this checklist. For each item, the answer is either proven (source) or a question.

1. **Outcome:** what is true when this is done, seen by whom (auditor, co-founder, API caller)?
2. **Worked examples:** at least 2 concrete cases: exact input → exact expected output. For
   numbers: real figures, unit, sign, rounding. One normal case, one edge case.
3. **Edge cases:** empty, missing, duplicate, negative, zero, wrong unit (EUR vs TEUR), wrong
   period, unreadable cell, very large file. For each: expected behaviour.
4. **Errors:** what happens on failure. Never a silent 0, None or default: say how it surfaces.
5. **Number fence:** does any value come from an LLM? It must not become a figure.
6. **What must not change:** behaviour, files, contracts, JSON/Excel shapes that stay as they are.
7. **Scope:** the exact files that change. More than ~800 changed lines = split the task.
8. **Acceptance:** the named tests that prove it (new failing test first), and the done-check.
9. **Risk:** anything hard to undo (data, migrations, client output). Say it.

## 4. Ask in rounds until nothing is open

- Use the AskUserQuestion tool. At most 4 questions per round, the most important first.
- Each question: plain words, one decision, 2–4 options, your recommended option first with
  "(Recommended)" and the evidence for it. Prefer yes/no.
- After each round, update the open list. An answer often opens new questions: ask them in
  the next round. Do research again when an answer points to code you have not read.
- Skip a question if its answer would not change the code or the tests.
- Keep going until the open list is empty. There is no round limit. Do not start coding to
  "find out": find out by reading or by asking.

## 5. Write the brief

Path: `/usr/bin/python3 -I ~/.claude/hooks/a3hooks.py brief-path </dev/null`. Write it with the
Write tool in exactly this shape:

```
# Brief: <branch>
Goal: <one sentence: what is true when this is done>
## Scope
- <path or glob, relative to the repo root, one per line>
## Out of scope
- <what you will not touch>
## Worked examples
- <input> -> <expected output>   (source: owner YYYY-MM-DD | file:line)
## Edge cases
- <case> -> <expected behaviour>
## Decisions
- <decision>  (owner YYYY-MM-DD)
## Evidence
- <fact the plan relies on>  (file:line or command)
## Open questions
- [x] <question> -> <answer> (owner | file:line)
## Acceptance
- <test name / file that must fail first, then pass>
Done-check: Stop gate green (ruff, touched tests, fast set)<; plus any extra command>
Do not: <things not to start without asking>
Review: one fresh /review after the gate is green, at most 2 rounds
```

Every question stays in `## Open questions`. Open = `- [ ]`, resolved = `- [x]` with the answer.
The hook blocks edits while any `- [ ]` is left.

## 6. Confirm and wait

Show the brief to the user (paste it). For a large or hard-to-undo task, offer
`/council plan <brief path>` first. Then wait for an explicit go. A question from the user is
not a go. Never write `allow-test-weakening` yourself; only the user may ask for it.

If the scope must grow later: ask the user, add the path under `## Scope`, and record the
decision under `## Decisions`.

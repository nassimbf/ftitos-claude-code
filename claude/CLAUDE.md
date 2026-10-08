# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

# Style

Reply style is the `ftitos` output style (`~/.claude/output-styles/ftitos.md`):
ponytail ladder + caveman compression + ASD-STE100 clarity, tie-break STE.
Do not restate those rules here — one source only.

# Test budget — HARD RULE (owner, 2026-10-03)

Never start a test run that does not meet these criteria. Kill any run that does not, by its PID, at once.
- Per change: only the tests of the touched files, plus the project's fixed fast set (A3: `fixtures/corpus/test_measure_fast.py`, `test_measure_traps.py`, `apps/backend/tests/test_dev_plan_citations.py`). About 2 minutes.
- Full suites: only once per batch of several merged shas, never for one sha, never "to be safe", never as a background gate.
- Before starting any run longer than 2 minutes, name the criterion it meets. No criterion, no run.

# Push often — standing rule (owner, 2026-10-06)

The `autopush` Stop hook (`~/.claude/hooks/a3hooks.py`) does this for A3: it pushes the working branch when it has unpushed commits and the last push is 30+ minutes old. Never main/master/main-ftt, never force, never mid-merge; it skips when the head commit lacks `[skip ci]` and the branch's PR targets main. Put `[skip ci]` in commit messages on PR branches. Report the pushes it announces (branch and sha).

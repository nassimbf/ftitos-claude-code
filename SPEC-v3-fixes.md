# Spec: ftitos-claude-code v3 Fix Pass

## Objective

Implement all findings from `REVIEW-EXECUTION-PLAN.md` (the 3-specialist parallel review of the v3 execution). The deliverable is a fully wired, bypass-proof, honestly-documented harness — no inert scripts, no safety regressions, no fabricated CLI claims.

**Users:** Ftitos (primary), intern (implements this spec).
**Success:** Every checkbox in the "Definition of done" section of `REVIEW-EXECUTION-PLAN.md` passes.

---

## Tech Stack

- Node.js (built-ins only — `fs`, `path`, `child_process`, `crypto`). Zero npm dependencies.
- Python 3 — for `tests/eval-harness/tasks/*/checks.py` files only
- Shell — `tests/eval-harness/tasks/*/repo-state/setup.sh` fixtures
- JSON — `hooks/hooks.json`, `tests/eval-harness/baseline.json`

---

## Commands

```bash
# Run all tests
node tests/run-all.js

# Run individual CI validators
node scripts/ci/validate-agents.js
node scripts/ci/validate-skills.js
node scripts/ci/validate-hooks.js

# Run eval harness (once Task 10 is done)
node tests/eval-harness/run-evals.js --task task-001-stop-verify
node tests/eval-harness/run-evals.js --update-baseline

# Check for unreferenced hook scripts
node -e "
const fs = require('fs');
const hooks = JSON.parse(fs.readFileSync('hooks/hooks.json','utf8'));
const cmds = JSON.stringify(hooks);
const scripts = fs.readdirSync('hooks/scripts').filter(f => f.endsWith('.js'));
scripts.forEach(s => { if (!cmds.includes(s)) console.log('UNREGISTERED:', s); });
"

# Check for execSync injection
grep -rn 'execSync(\`' .
```

---

## Project Structure

```
hooks/
  hooks.json              ← Hook registration (Tasks 1, 4)
  scripts/
    cc-safety-net.js      ← Tasks 5, 6, 7
    stop-verify.js        ← Task 8
    ralph-loop.js         ← Tasks 2
    brain-merge-router.js ← Task 4
    loop-runner.js        ← Task 3 (new file or redirect)
    veto-rate-logger.js   ← Task 15
    pending/              ← Quarantine dir for unready scripts (Task 4)
    lib/
      utils.js            ← commandExists, getGitModifiedFiles (used by Task 8)

skills/
  loop-engine/SKILL.md    ← Task 3 (path reference fix)
  blind-judge/SKILL.md    ← Task 12 (gate numbering)
  beads-workflow/SKILL.md ← P3 audit
  harness-evals/SKILL.md  ← P3 audit
  mutation-testing/SKILL.md ← P3 audit
  TIER.md                 ← Task 14

agents/
  deacon.md               ← Task 13
  witness.md              ← Task 13

brain/
  engram-v2-upgrades.md   ← Task 9 (injection fix) + P3 audit

scripts/
  brain-merge.sql         ← Task 16 (bi-temporal decision)

tests/
  run-all.js              ← Must keep passing after every task
  hooks-payload.test.js   ← NEW: payload-verified hook tests (Tasks 5-8, P5)
  eval-harness/
    run-evals.js          ← NEW: Task 10
    baseline.json         ← NEW: Task 10
    archive/
      ARCHIVE-LOG.md      ← NEW: Task 10
    tasks/
      task-001-stop-verify/   ← Already complete — model for others
      task-002-* ... task-020-* ← Task 11

CHANGELOG.md              ← Task 11 (honest interim fix) + each task's entry
DEFERRED.md               ← NEW: P5 items
```

---

## Code Style

Hook scripts follow this pattern — no classes, no external deps, guard-clause structure:

```js
// hooks/scripts/example.js
'use strict';

const CONSTANTS = { MAX: 5 };

function parseInput() {
  let raw = '';
  process.stdin.resume();
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => run(raw));
}

function run(raw) {
  let input;
  try { input = JSON.parse(raw); } catch { process.stdout.write(raw); return; }
  if (!isRelevant(input)) { process.stdout.write(raw); return; }
  // do work
  process.stdout.write(raw); // pass-through on allow
}

parseInput();
```

Rules:
- Functions < 50 lines, files < 800 lines
- No mutation — return new objects
- Hard block = `process.stderr.write(message)` + `process.exit(2)`
- Pass-through = `process.stdout.write(raw)` + `process.exit(0)`
- No `execSync(\`...\`)` string interpolation — use `execFileSync(cmd, [args])`

---

## Testing Strategy

**Framework:** Node.js built-in test runner (`node:test`) — already used by existing tests in `tests/`.

**New test file:** `tests/hooks-payload.test.js` — black-box payload tests. Spawn each hook as a child process, feed it a JSON payload via stdin, assert exit code and stderr content. No mocking of internal functions — only the external hook contract matters.

```
tests/
  hooks-payload.test.js     ← black-box hook tests (P1 fixes verification)
```

**Eval harness `checks.py`** (Tasks 10–11):
- Python `assert` statements only
- No network, no LLM, no `random`, no `time.sleep`
- Assert file existence, exit codes, specific string content in output files

**Coverage:** Not tracked for hook scripts (they're black-boxed via subprocess testing). Coverage applies to any pure utility functions if extracted.

---

## Boundaries

**Always:**
- `node tests/run-all.js` must pass after every task commit
- One conventional commit per task: `fix(hooks): ...`, `docs(skills): ...`, `test(hooks): ...`, `feat(evals): ...`
- Update CHANGELOG.md in every commit that touches shipped artifacts

**Ask Ftitos first (blocked tasks):**
- Task 3: implement `loop-runner.js` vs. redirect SKILL.md to `ralph-loop.js` — do not guess
- Task 16: add `valid_at`/`invalid_at` columns vs. remove the bi-temporal claim — schema work needs sign-off

**Never:**
- Add npm dependencies (`package.json` has zero runtime deps — keep it that way)
- Edit `tests/eval-harness/tasks/task-001-stop-verify/` — it is the golden reference, read-only
- Remove or weaken existing hook behavior — only add or fix
- Use `execSync(\`...\`)` string interpolation anywhere in the repo

---

## Success Criteria

1. `node tests/run-all.js` — green (4 test files when `hooks-payload.test.js` is added)
2. All three CI validators — green, 0 failures
3. `node tests/hooks-payload.test.js` — all payload tests pass:
   - `rm /home -rf` → exit 2
   - `git clean -fdx` → exit 2
   - `bash -c "python3 -c 'import os; os.system(\"rm -rf /\")'"` → exit 2
   - `rm -rf ./build` → exit 0 (allowed — non-dangerous path)
   - ruff absent from PATH → stop-verify exits 0 (warning, not block)
   - ralph-loop: 2 empty-note iterations → continues (no breaker)
   - ralph-loop: 3 identical non-empty notes → breaker trips
4. No unreferenced scripts in `hooks/scripts/` (audit command above)
5. `grep -rn 'execSync(\`' .` → 0 results
6. `node tests/eval-harness/run-evals.js --task task-001-stop-verify` → PASS
7. CHANGELOG.md accurately describes actual state (no overstated claims)
8. `DEFERRED.md` exists listing all P5 items
9. All 6 new v3 skills appear in `skills/TIER.md`

---

## Task Order (dependency-aware)

```
Phase A — Register & wire (unblocks everything else):
  Task 1  → register ralph-loop.js in hooks.json
  Task 4  → register or quarantine brain-merge-router.js

Phase B — Fix hook logic (can run in parallel after A):
  Task 2  → ralph-loop circuit breaker
  Task 5  → cc-safety-net rm bypass
  Task 6  → cc-safety-net git clean bypass
  Task 7  → cc-safety-net interpreter unwrap + quote loop
  Task 8  → stop-verify tool-existence check

Phase C — Write payload tests (validates Phase B):
  hooks-payload.test.js covering Tasks 2, 5, 6, 7, 8

Phase D — Docs (no code deps, can go any time):
  Task 9  → engram injection fix
  Task 11 → CHANGELOG honest fix (do this FIRST in Phase D)
  Task 12 → blind-judge gate numbering
  Task 13 → deacon slop + witness overlap
  Task 14 → TIER.md counts
  Task 15 → veto-rate-logger patterns
  P3      → fabricated CLI audit (all 5 rows in the table)
  DEFERRED.md → P5 items

Phase E — Eval harness:
  Task 10 → run-evals.js + baseline.json + archive/
  Task 11 → complete tasks 002–020 (after runner exists)

Phase F — Blocked on Ftitos decision:
  Task 3  → loop-runner.js decision
  Task 16 → bi-temporal decision
```

---

## Open Questions (must resolve before Phase F)

1. **Task 3:** Build a new `loop-runner.js` for Mode 2 (fresh-context overnight) per the SKILL.md spec, or redirect SKILL.md to `ralph-loop.js` and document the difference?
2. **Task 16:** Add `valid_at`/`invalid_at` temporal edge columns to `brain-merge.sql`, or delete the "bi-temporal" claim from the header and CHANGELOG?

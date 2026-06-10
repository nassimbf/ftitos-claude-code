# v3 Review — Execution Plan

*Source: 3-specialist parallel review of the FACTORY-BLUEPRINT.md execution, 2026-06-10.*
*Status: 0 CRITICAL · 8 HIGH · ~9 MEDIUM · repo tests/validators all green.*

How to work this file: tasks are ordered by priority. Do them top to bottom. Each task has acceptance criteria — a task is done only when its criteria pass. Run `node tests/run-all.js` and the three `scripts/ci/validate-*.js` scripts after every task. Conventional commits, one task per commit (`fix(hooks): ...`, `docs(evals): ...`).

---

## P0 — Inert infrastructure (the loop engine doesn't run)

### Task 1 — Register `ralph-loop.js` in hooks.json
- **Problem:** `hooks/scripts/ralph-loop.js` exists but has no entry in `hooks/hooks.json`. It never fires.
- **Fix:** Add a `Stop` hook entry: `{ "type": "command", "command": "node \"$HOME/.claude/scripts/hooks/ralph-loop.js\"" }` (match the path convention of the other entries).
- **Accept:** `validate-hooks.js` passes; entry appears under `Stop`; script path resolves after install.

### Task 2 — Fix ralph-loop circuit breaker firing on iteration 2
- **Problem:** `ralph-loop.js:136-141` hashes relay notes extracted from `tool_response.content` / `assistant_response` / `output` — fields that do NOT exist in a Stop-hook payload. `extractRelayNotes` therefore always returns `''`, every iteration hashes identically, and the breaker trips on iteration 2, every time.
- **Fix:** When extracted notes are empty, skip circuit-breaker hash comparison entirely (do not push the hash). Additionally require ≥3 consecutive identical **non-empty** hashes to trip.
- **Also:** Renumber the gate comments in the header (`ralph-loop.js:7-16`) to match the code: Gate 1=EXIT_SIGNAL, Gate 2=LOOP:DONE, Gate 3=max_iterations, Gate 4=circuit breaker, Gate 5=error gate.
- **Accept:** Unit test: feed two consecutive Stop payloads with no relay-note fields → loop continues (no breaker). Feed 3 identical non-empty notes → breaker trips.

### Task 3 — Ship or remove `loop-runner.js`
- **Problem:** `skills/loop-engine/SKILL.md:144` wires Mode 2 (fresh-context overnight loop) to `hooks/scripts/loop-runner.js`, which does not exist. The blueprint's headline L2 deliverable has no runner.
- **Fix (pick one, ask Ftitos if unsure):**
  - (a) Implement `loop-runner.js` per the SKILL.md spec (dual exit gate, circuit breaker, 3-retry error gate → `pending_for_human.md`, budgets, relay notes), or
  - (b) Edit SKILL.md to point Mode 2 at `ralph-loop.js` and document the difference.
- **Accept:** Every script path referenced in `skills/loop-engine/SKILL.md` exists on disk.

### Task 4 — Register or quarantine `brain-merge-router.js`
- **Problem:** `hooks/scripts/brain-merge-router.js` exists but is not in hooks.json — dead code.
- **Fix:** If the brain-merge feature is live, add the appropriate PostToolUse entry. If pending, move the script to `hooks/scripts/pending/` and note it in CHANGELOG.
- **Accept:** No script in `hooks/scripts/` (excluding `lib/` and `pending/`) is unreferenced by hooks.json.

---

## P1 — Safety guard bypasses (`hooks/scripts/cc-safety-net.js`)

### Task 5 — `rm` path-before-flags bypass
- **Problem (line 60):** the regex requires flags before the path, so `rm /home/user -rf` is NOT caught (normalizeFlags reorders flag letters, not flag/path positions).
- **Fix:** After normalization, restructure the check: command is `rm` AND flags contain both `r` and `f` (anywhere) AND any argument is a dangerous path token (`/` alone, `~`, `$HOME`, `..` traversal). Token-based check, not one big regex.
- **Accept:** Tests: `rm -rf /` blocked · `rm / -rf` blocked · `rm /home -fr` blocked · `rm -rf ./build` allowed.

### Task 6 — `git clean` pattern defeated by its own flag sorter
- **Problem (line 65):** pattern requires `f` before `d`/`x`, but `normalizeFlags` sorts alphabetically, so `git clean -fdx` → `-dfx` → no match.
- **Fix:** After normalization test for presence of `f` (presence of `-f` alone is sufficient to flag) via character lookup, not ordered regex.
- **Accept:** Tests: `git clean -fdx`, `git clean -xdf`, `git clean -f` all blocked.

### Task 7 — Interpreter one-liners never unwrapped
- **Problem (lines 21, 32):** `INTERP_WRAPPERS` is defined but never used; `unwrap()` only handles shell wrappers and `eval`. Nested payloads like `bash -c "python3 -c 'os.system(\"rm -rf /\")'"` are never extracted and re-checked.
- **Fix:** Add an interpreter branch in `unwrap()`: `/^(?:python3?|node|perl|ruby)\s+-[a-z]*[ce]\s+([\s\S]+)/i`, recursing the captured payload through `allLayers`.
- **Also:** Make `stripOuterQuotes` (lines 23-29) loop until stable — `bash -c "'rm -rf /'"` currently leaves the inner single quotes, which defeats the `\brm` pattern.
- **Accept:** Tests: nested bash→python one-liner blocked; double-quoted-then-single-quoted `rm -rf /` blocked.

### Task 8 — `stop-verify.js` blocks forever when a tool is missing
- **Problem (lines 29-37):** `execSync` runs ruff/mypy/pytest with no existence check. A missing tool → "command not found" → `ok: false` → exit-2 hard block → Claude trapped in a permanent stop-block loop.
- **Fix:** Pre-flight each verifier with `commandExists` from `hooks/scripts/lib/utils.js`; skip (with a stderr warning) if absent.
- **Bonus (MEDIUM):** exit 0 immediately if no `.py` files were modified in the session (use `getGitModifiedFiles`) — currently every Stop runs the full suite even for markdown-only sessions.
- **Accept:** Test: with `ruff` absent from PATH, hook exits 0 (with warning), not 2.

### Task 9 — Command-injection hole in engram doc
- **Problem:** `brain/engram-v2-upgrades.md:133` shows `execSync(\`engram-cli capture-passive '${payload}'\`)` — string interpolation into a shell, banned by this repo's own `rules/security-guidance.md`.
- **Fix:** Rewrite the example using `execFileSync('engram-cli', ['capture-passive', payload])`.
- **Accept:** No backtick-interpolated `execSync` examples anywhere in the repo (`grep -rn 'execSync(`' .`).

---

## P2 — Eval harness: shipped as complete, isn't

### Task 10 — Build the runner
- **Problem:** `tests/eval-harness/` contains only `README.md` + `tasks/`. The README documents `run-evals.js`, `baseline.json`, and an `archive/ARCHIVE-LOG.md` — none exist. The harness cannot run; the CI gate is inoperative.
- **Fix:** Implement `tests/eval-harness/run-evals.js`: iterate tasks, run each task's `repo-state/setup.sh` into a temp dir, execute `checks.py`, support the 5-run protocol, compare against `baseline.json`, support `--update-baseline`. Seed `baseline.json` from task-001. Create `archive/` with empty `ARCHIVE-LOG.md`.
- **Accept:** `node tests/eval-harness/run-evals.js --task task-001-stop-verify` produces a pass/fail verdict deterministically.

### Task 11 — Complete tasks 002–020 (or relabel honestly)
- **Problem:** Only `task-001-stop-verify` has `checks.py` + `repo-state/`. Tasks 002–020 are prompt-only stubs — scenario descriptions, not evals.
- **Fix:** Replicate task-001's pattern (frozen `prompt.md`, `repo-state/setup.sh` fixture, deterministic `checks.py` — no LLM, no network, no randomness) across the remaining 19. Tasks 003 (loop circuit breaker) and 004 (beads atomic claim) need runtime infrastructure that doesn't exist — mark these `"requires_runner": true` in metadata.json and exclude them from the deterministic gate rather than faking checks.
- **Interim (do first, 10 min):** correct `CHANGELOG.md:42` to "eval harness scaffolded; 1 task fully implemented, 19 prompt stubs pending checks.py" so the docs stop overstating delivery.
- **Accept:** Every task dir has `checks.py` + `repo-state/` OR `requires_runner: true`; CHANGELOG matches reality.

---

## P3 — Fabricated external-tool surface (audit every CLI claim)

Several docs cite confident but invented APIs. For each, verify against the real tool's docs and correct:

| File | Claim | Reality |
|---|---|---|
| `skills/beads-workflow/SKILL.md:23` | `pip install gastownhall-beads` | Beads is a Go tool — `brew install` / `go install`. Also line 117: command is `bd close`, not `bd done`. |
| `skills/harness-evals/SKILL.md:203-214` | `pip install swe-smith`, `swesmith generate --from-failure` | This CLI does not exist; SWE-smith is a research framework. Rewrite section as a manual recipe or remove. |
| `skills/loop-engine/SKILL.md:225` | `claude --max-budget-usd` | Not a real CLI flag — leg 2 of the "triple budget" is unenforceable as written. Replace with iteration-count + wall-clock only, or a cost check via OTel/`/cost`. |
| `brain/engram-v2-upgrades.md:40-63` | `ENGRAM_PROGRESSIVE_DISCLOSURE`, `engram-mcp --full` | Unverifiable invented surface. Verify against installed engram v1.12.0; rewrite or mark as proposed-not-implemented. |
| `skills/mutation-testing/SKILL.md:29,112-122` | mutmut per-operator "tier" config; `mutmut results --survived`, `--rerun-all` | mutmut has no tier mechanism and those flags don't match the real CLI. Rewrite tiering as a manual triage order; fix flags against `mutmut --help`. |

- **Accept:** Every shell command in skills/ and brain/ either runs against the real installed tool or is explicitly labeled "proposed / not yet available".

---

## P4 — Consistency & slop cleanup

### Task 12 — Gate numbering contradiction
`skills/blind-judge/SKILL.md:217-222` defines Gate 1=pytest unit, Gate 2=pytest integration — contradicting the blueprint and CLAUDE.md (Gate 1=mutation, Gate 2=PBT). Align blind-judge to the blueprint's L3 ordering: Gate 0 deterministic → 1 mutation → 2 PBT → 3 blind judge → 4 UI.

### Task 13 — Deacon drafting slop + Witness/Deacon overlap
- `agents/deacon.md:13` shipped literal draft text: "written to — wait, you cannot write either." Rewrite the sentence.
- `agents/witness.md:186-221` embeds a full "Deacon Mode" duplicating `agents/deacon.md` (and uses Bash, which deacon forbids). Remove the embedded copy; reference `agents/deacon.md` instead.

### Task 14 — TIER.md out of date
`skills/TIER.md` doesn't list the 6 new v3 skills (`beads-workflow`, `blind-judge`, `loop-engine`, `mutation-testing`, `openspec`, `property-based-testing`) and its counts don't match the 33 on-disk skill dirs. Add tier assignments and fix the counts.

### Task 15 — `veto-rate-logger.js` over-counts vetos
- Line 21: any response containing the word `CONFIRM` logs as `vetoed` — tighten to the council format (e.g. `/\bCONFIRM\b\s*(?:—|:|\n)/` or require `Council` context).
- Lines 26-31: default verdict when no pattern matches should be `'unknown'`, not `'vetoed'`.

### Task 16 — Bi-temporal claim is false
`scripts/brain-merge.sql:24-25` only has `created_at`/`updated_at` but the header (line 2) claims bi-temporal. Either add `valid_at`/`invalid_at` edge columns (the blueprint's actual L5 requirement, graphiti-style) or delete the claim from the header and CHANGELOG. **Ask Ftitos which** before doing the schema work.

---

## P5 — Blueprint items not executed at all (decide: implement or defer)

Do NOT silently implement these — list them in a `DEFERRED.md` (or implement only after Ftitos confirms):

1. **L3 Gate 4 — UI verification** (agent-browser smoke loop + Playwright planner/generator/healer): zero artifacts exist.
2. **L6 Boucle payload-verified config audit**: a test that fires live payloads (`rm -rf /`, `git push --force`) at the hooks to prove they actually block (stderr + exit 2). This pairs naturally with Tasks 5–7 — strongly recommended to implement as `tests/hooks-payload.test.js`.
3. **L6 hookify-style markdown hooks migration**: hooks.json still pure JSON.
4. **L4 redundancy rule** ("never unattended on a single agent — ≥2 with review"): absent from all three fleet agents.
5. **L4 native agent-teams / Workflows wiring** (TeammateIdle/TaskCreated quality-gate hooks).
6. **Blueprint §3 cuts unrecorded in CHANGELOG**: duplicate-skill dedupe, `/base:groom` debt, claude-mem skip, ruflo skip — add a "Decided against / deferred" note.

---

## Definition of done (whole plan)

- [ ] `node tests/run-all.js` green
- [ ] All three `scripts/ci/validate-*.js` green
- [ ] New unit tests for Tasks 2, 5, 6, 7, 8 (payload-style tests proving hooks block/allow correctly)
- [ ] `grep` audit: no unreferenced hook scripts, no `execSync(\`` interpolation, no fabricated CLI flags
- [ ] CHANGELOG.md updated to reflect actual state (no overstated claims)
- [ ] One conventional commit per task

---
name: council
description: Blind multi-model review of a PLAN, a DIFF or a DECISION. Fable looks for wrong figures, an outside model (Codex, else Gemini, else Ollama cloud) looks for production failures, Opus checks the premise or the spec conformance, CodeRabbit is optional on diffs. A model from another family or the reproducer test verifies each P0/P1. A fresh Opus chair gives BLOCK, SHIP-WITH-FIXES or SHIP. Use for a plan before build, a PR before merge, or a decision that is hard to undo. Never use it per edit or in a loop.
---

# Council

Different models review the work blind and independently. Then each serious finding is verified, and then a chair gives one verdict. This replaces Claude-reviews-Claude rounds. The gain comes from independent answers plus verification, not from debate.

- `/council diff`: the current branch vs origin/main, committed work only
- `/council diff <pr#> | <sha> | <base>..<head>`
- `/council plan <file>`
- `/council decision "<question>"`: add the options and hard constraints if you know them

You, the session that runs this, are the clerk. You build the packet, launch the voices, run the checks and save the result. You do not judge findings and you never chair, because you can be the author.

## 0. Cache

The cache key is the head sha in diff mode. In plan and decision mode, it is the first 12 characters of `shasum -a 256` of the packet. The path is `$(git rev-parse --git-dir)/claude-council-<key>.md` (outside a repo, use the scratchpad). If that file exists, print it and stop. Never review the same sha twice.

## 1. Packet

Write everything to a private dir, `P=$(mktemp -d "${TMPDIR:-/tmp}/council.XXXXXX")`. The voices get `$P/packet.md` and nothing more.

Diff mode, from the repo root:
```bash
B=$(git merge-base origin/main HEAD); H=$(git rev-parse HEAD)
# PR:  H=$(gh pr view N --json headRefOid -q .headRefOid); git fetch -q origin pull/N/head; B=$(git merge-base origin/main "$H")
# sha: B="$S^"; H="$S"      range: B=<base>; H=<head>
g() { git -c core.quotePath=false diff --no-renames "$@"; }
g --numstat "$B" "$H" | cut -f3 > $P/all.txt
g --numstat "$B" "$H" | awk -F'\t' '$1!="-"{print $3}' \
 | grep -viE '\.(xlsx|xlsm|xls|pdf|csv|tsv|docx|doc|zip|parquet|pkl)$|(^|/)\.env|\.(pem|key|p12)$|(^|/)(uv\.lock|package-lock\.json|pnpm-lock\.yaml|bun\.lockb?)$' \
 | awk '!(/(^|\/)fixtures\// && !/\.py$/)' > $P/keep.txt
[ -s $P/keep.txt ] || { echo "council: nothing reviewable in $B..$H"; exit 0; }
{ echo "Someone else wrote this. Mode: diff. Target: ${B:0:9}..${H:0:9}."
  echo "CUT (not sent): $(grep -vxFf $P/keep.txt $P/all.txt | tr '\n' ' ')"
  tr '\n' '\0' < $P/keep.txt | xargs -0 git -c core.quotePath=false diff --no-renames -U10 "$B" "$H" -- ; } > $P/packet.md
```
- If `git status --porcelain` is not empty, put "uncommitted changes not reviewed" in the coverage.
- The brief: run `BR=$(/usr/bin/python3 -I ~/.claude/hooks/a3hooks.py brief-path </dev/null 2>/dev/null)` in the repo. If `$BR` exists, append it under `## Brief (the goal the author was given)`.
- Size: keep the packet under 200 KB. If it is bigger, keep the source hunks (number engine first), then drop tests, docs and generated files. Name each dropped file on the CUT line. `outside.sh` refuses anything over 400 KB.

Plan mode: the first line is the same, then the plan text, then the brief if there is one. Decision mode: the first line, then the question, the options and the hard constraints, in neutral words, with no preferred answer.

Code excerpts that are not diffs must keep their real line numbers: `awk -v o=<first line> '{printf "%d: %s\n", NR+o-1, $0}'`.

Never put these in the packet:
- commit messages, the PR body, chat history or the author's reasons
- client data: anonymizer output, real client names or figures, office, PDF or CSV files, or non-.py files under fixtures/
- secrets

If a kept hunk holds client data, stop and ask the owner. `outside.sh` also refuses secrets, binary data and oversize packets (exit 3). When it refuses, fix the packet. Never go around the refusal.

## 2. Voices: one message, all in parallel, blind

No voice sees the output of another voice. Put this text first in each Agent prompt:

> Someone else wrote this; you owe it nothing. Read <P>/packet.md fully. The repo at <path> is read-only: never edit it. Write any reproducer test under <P>/repro/ and run only that test from the repo root (A3: `PYTHONPATH=agents:libs:apps/backend:. uv run pytest <P>/repro/test_x.py -q -p no:cacheprovider`). Reply with ONE JSON object: {"verdict":"BLOCK|SHIP-WITH-FIXES|SHIP","findings":[{"severity":"P0|P1|P2|P3","file_line":"","claim":"","evidence":"","reproducer":"","confidence":0.0}],"not_checked":[]}. P0 = a wrong figure, data loss or a security hole on a normal path. P1 = a wrong result or a crash on a plausible path. P2 = an edge case. P3 = minor. A finding without evidence is not a finding.

| Voice | How | Lens |
|---|---|---|
| A, numbers auditor | Agent, `model: "fable"` | Find a wrong figure. Each finding needs input -> expected -> actual, or a failing pytest. Look at rounding, signs, units, period boundaries, totals that do not tie and silent defaults. Plan mode: check every formula, number and test oracle. Decision mode: check every number and fact in the question. |
| B, production breaker | Bash: `bash ~/.claude/skills/council/outside.sh $P/packet.md production-breaker`, timeout 600000 | Edge cases, error paths, silent fallbacks (return 0 or None on error), data loss. |
| C, premise and conformance | Agent, `model: "opus"` | Plan and decision mode: is the premise right, what is the simplest alternative that meets the goal, and what cannot be undone. Diff mode: does the change do what the brief says and nothing more? Find breaks of the repo's CLAUDE.md and GR-CL rules (quote the rule) and over-engineering. |
| D, CodeRabbit (diff mode, optional) | `coderabbit review --plain -t committed --base-commit $B --cwd <repo>`, timeout 600000 | Its own lens. You map its output to the JSON shape. Run it only when the CUT line is empty, because it uploads the repo diff itself, not our packet. |

Line 1 of the voice B output names the provider. `OUTSIDE_VOICE_ABSENT` means that voice is absent. Never put a Claude agent in its place. An Agent reply that is not the JSON shape also counts as absent.

## 3. Verify, do not debate

1. Merge the duplicates (the same file:line and the same defect). Keep the name of each voice that raised it.
2. For each P0/P1:
   - If it has a reproducer test, run only that test. If the test fails, the finding is CONFIRMED. If it passes, the claim as written is REFUTED.
   - If not, a voice from another model family checks it against the code:
     - A finding from A or C (Claude): copy the packet, append `FINDING (claimed by another reviewer):` with the finding JSON, then run `outside.sh <copy> verify`.
     - A finding from B or D (not Claude): a fresh Agent with `model: "opus"` gets the repo path and the finding: "Check this finding against the code. Try to refute it. Reply {verdict: CONFIRMED|REFUTED|UNSURE, reason, evidence file:line}."
   - If the verifier is absent or answers UNSURE, the finding goes to the INVESTIGATE list.
3. A failing reproducer test wins over any number of REFUTED votes. A majority cannot drop it.
4. P2 and P3 findings are not verified. They go to the advisory list.

Test budget: run only the reproducer tests, never a suite.

## 4. Chair

The chair is a fresh Agent with `model: "opus"`, never this session. Give it the packet path, the raw JSON of each voice (labelled with the voice and the model that answered), the verification results and the coverage. Ask for exactly this:

```
COUNCIL <mode> <key>: VERDICT BLOCK | SHIP-WITH-FIXES | SHIP [PARTIAL COVERAGE]
Verified, ranked: [P0] file:line: claim. Evidence. Verified by. Fix.
INVESTIGATE: each unverified P0/P1 on one line, with what would settle it.
Advisory: the P2/P3 findings, one line each.
Disagreements: who said what, and why the verified evidence wins.
Coverage: A fable ran|absent; B <provider>|absent (<reasons>); C opus ran|absent; D coderabbit ran|skipped (<why>); CUT files; not_checked.
```
Chair rules:
- BLOCK if, and only if, there is a verified P0/P1.
- SHIP-WITH-FIXES if there is a verified P2 or any INVESTIGATE item.
- SHIP only when nothing is open.
- Any absent voice adds PARTIAL COVERAGE. An absent voice is never a pass.

## 5. Save and stop

Write the chair's text to the cache path and print it. Then stop: do not start the fixes.

## Stop rules

- Each sha gets one council at most, plus one delta check after the fixes. The delta check reviews only `git diff <reviewed sha>..HEAD`, uses only the voices that raised verified blockers, and asks: "Is finding X fixed, and does the fix break anything near it?"
- Only verified P0/P1 findings block.
- If the same finding is still open after the delta check, it goes to the owner with both outputs. There is no third round.
- Never run it per edit, in a loop or on a cached sha.

## When to use

Use it on a plan before build, on a PR before merge, and on a decision that is hard to undo. Do not use it for small edits or as a gate on every turn.

## Outside-voice notes (probed 2026-10-07)

- Codex `gpt-6-astra` works but has a plan quota. Override the model with `COUNCIL_CODEX_MODEL`.
- The Gemini free tier is refused (IneligibleTierError), so it costs about 30 s before the fallback.
- Ollama free cloud has nemotron-3-ultra, nemotron-3-super, gemma4:31b and gpt-oss:120b/20b. kimi, deepseek-v4, glm and minimax need paid credits.
- Override the chain with `COUNCIL_PROVIDERS="codex ollama/nemotron-3-ultra:cloud"`.
- The voice runs in an empty temp dir. Codex runs with `--disable shell_tool --disable unified_exec`, read-only and `--ignore-user-config`, so it sees only the packet and never the repo.

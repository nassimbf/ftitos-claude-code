---
name: blind-judge
description: Gate 3 verification — permission-denied holdout scenarios, write-tool-less reviewers, evidence files over self-report, veto-rate logging.
---

# Blind Judge Gate

The verification moat. Separates the builder's context from the verifier's context so they cannot share blind spots. The builder never sees the acceptance scenarios; the reviewer never has write access.

> Spotify law: deterministic verifiers (Gate 0–2) run BEFORE the blind judge. The judge sees only (diff + original task). Success is silent. Vetoes surface with a reason and are logged.

---

## Core Principle

A builder agent that writes code, tests, and its own review will converge on shared blind spots. The blind judge breaks this by:

1. Storing acceptance scenarios in a path the builder cannot read
2. Spawning reviewer agents whose tool manifest excludes Edit and Write
3. Accepting only verifiable evidence (checksummed files, test results) — not self-report
4. Logging every veto event for fleet-level KPI tracking

---

## Step 1 — Holdout Directory Setup

Create the holdout directory before the builder starts. The builder agent must never be given the path.

```bash
# Create holdout directory — readable only by the reviewer/orchestrator
mkdir -p .claude/holdout
chmod 700 .claude/holdout

# Write acceptance scenarios as structured JSON
cat > .claude/holdout/scenarios.json << 'EOF'
{
  "task_id": "fa-agent-rollforward-v2",
  "scenarios": [
    {
      "id": "SC-01",
      "description": "Rollforward with zero disposals closes to opening + additions",
      "input_fixture": "fixtures/rollforward_zero_disposals.json",
      "expected_output_fixture": "fixtures/rollforward_zero_disposals_expected.json",
      "assertions": [
        "result.closing_balance == result.opening_balance + result.additions",
        "result.disposals == Decimal('0')"
      ]
    },
    {
      "id": "SC-02",
      "description": "Anlagenspiegel net book value reconciles to balance sheet",
      "input_fixture": "fixtures/anlagenspiegel_full.json",
      "expected_output_fixture": "fixtures/anlagenspiegel_full_expected.json",
      "assertions": [
        "sum(line.net_book_value for line in result.lines) == result.balance_sheet_total"
      ]
    }
  ]
}
EOF

chmod 600 .claude/holdout/scenarios.json
```

The builder is NEVER given `.claude/holdout/` in its CONTEXT.md. If the builder needs to know that a holdout exists, tell it only "acceptance scenarios exist; you cannot see them."

---

## Step 2 — Evidence File (progress.json)

The builder writes verifiable evidence to `.claude/progress.json` after each phase. The reviewer reads this file — never the builder's self-report prose.

```json
{
  "task_id": "fa-agent-rollforward-v2",
  "timestamp": "2026-06-10T14:22:00Z",
  "completed_steps": [
    "graph_v2 nodes wired",
    "unit tests passing",
    "integration tests passing"
  ],
  "file_checksums": {
    "agents/fixed-assets/src/saa/agents/fixed_assets/graph_v2/nodes/rollforward.py": "sha256:abc123...",
    "agents/fixed-assets/tests/test_rollforward.py": "sha256:def456..."
  },
  "test_results": {
    "passed": 161,
    "failed": 0,
    "coverage_pct": 84.2
  }
}
```

The reviewer independently checksums the listed files and compares against `progress.json`. A mismatch means the builder's evidence is stale or fabricated.

---

## Step 3 — Write-Tool-Less Reviewer

Spawn the reviewer agent with a tool manifest that **excludes Edit and Write**. In Claude Code, this is done by configuring the agent's allowed tools in the TaskCreate call or agent definition.

Reviewer agent template:

```
You are a code reviewer. Your ONLY job is to verify whether the builder's work satisfies the acceptance scenarios.

ALLOWED TOOLS: Read, Bash (read-only: cat, ls, pytest --collect-only, sha256sum)
FORBIDDEN TOOLS: Edit, Write, any tool that modifies files

Do not fix anything. Do not suggest rewrites. Return only:
- APPROVED if all scenarios pass
- VETOED with a structured reason if any scenario fails

Evidence to read: .claude/progress.json
Scenarios to verify against: .claude/holdout/scenarios.json
Diff to review: [paste diff here]
Original task: [paste task description here]
```

The reviewer reads `.claude/holdout/scenarios.json`, independently runs the fixture-based checks, and compares the results to `progress.json`.

---

## Step 4 — Convergence Loop

The orchestrator runs a convergence loop:

```
loop:
  1. Builder completes a phase → writes progress.json
  2. Reviewer reads progress.json + holdout/scenarios.json
  3. Reviewer returns APPROVED or VETOED
  4. If VETOED → pass structured feedback to builder, increment attempt counter
  5. If APPROVED → exit loop, log approval event
  6. If attempt_counter >= 3 AND progress.json hash unchanged → escalate to human
```

Reviewer structured feedback format (VETOED response):

```json
{
  "verdict": "vetoed",
  "reviewer_id": "blind-judge-01",
  "failed_scenarios": ["SC-02"],
  "reason": "SC-02 assertion failed: sum(line.net_book_value) = 99999.99 != balance_sheet_total = 100000.00. Off by 0.01 — likely float conversion in line 47 of anlagenspiegel.py",
  "evidence_hash_verified": true,
  "timestamp": "2026-06-10T14:25:00Z"
}
```

---

## Step 5 — Stuck Detection

If the same `progress.json` content hash appears 3 consecutive times without a new APPROVED verdict, the builder is stuck. Escalate immediately.

```bash
# Compute hash of progress.json
sha256sum .claude/progress.json | awk '{print $1}'
```

The orchestrator stores the last 3 hashes. If all 3 are identical, it stops the loop and sends a human notification:

```
STUCK DETECTED — task_id: fa-agent-rollforward-v2
Builder has submitted identical progress.json 3 times.
Vetoed scenario: SC-02
Last veto reason: [paste reason]
Human action required.
```

---

## Step 6 — Veto-Rate Logging

Every judge event (approved or vetoed) is appended to `.claude/veto-log.jsonl`. One JSON object per line.

```jsonl
{"timestamp":"2026-06-10T14:25:00Z","task_id":"fa-agent-rollforward-v2","reviewer_id":"blind-judge-01","verdict":"vetoed","veto_reason":"SC-02 Decimal mismatch: off by 0.01","attempt":1}
{"timestamp":"2026-06-10T14:38:00Z","task_id":"fa-agent-rollforward-v2","reviewer_id":"blind-judge-01","verdict":"approved","veto_reason":null,"attempt":2}
```

**Veto-rate KPI**: Track `vetoed / (vetoed + approved)` per week across all tasks. A3 target: < 25% veto rate (Spotify field benchmark). A rising veto rate signals builder context quality is degrading or task specs are unclear.

```bash
# Compute veto rate from log
python3 - << 'EOF'
import json, pathlib
records = [json.loads(l) for l in pathlib.Path('.claude/veto-log.jsonl').read_text().splitlines() if l]
total = len(records)
vetoed = sum(1 for r in records if r['verdict'] == 'vetoed')
print(f"Veto rate: {vetoed}/{total} = {vetoed/total*100:.1f}%")
EOF
```

---

## Full Example — Directory Layout

```
.claude/
├── holdout/                   # chmod 700 — builder cannot read
│   ├── scenarios.json         # chmod 600
│   └── fixtures/
│       ├── rollforward_zero_disposals.json
│       └── anlagenspiegel_full.json
├── progress.json              # written by builder, read by reviewer
└── veto-log.jsonl             # append-only, written by orchestrator
```

---

## Gate Ordering (Spotify Law)

The blind judge is Gate 3. Gates 0–2 must pass first:

| Gate | Verifier | Type | Blocks on |
|------|----------|------|-----------|
| 0 | ruff + mypy + pytest | Deterministic | Any lint/type/test error |
| 1 | mutmut (mutation testing) | Probabilistic | Unkilled mutant rate > threshold |
| 2 | Hypothesis (PBT) | Generative | Falsified property |
| **3** | **Blind judge** | **LLM reviewer** | **Holdout scenario gap** |

The judge never sees lint errors or test failures — those are already resolved by Gate 0–2. The judge sees only the semantic gap between the diff and the original task's acceptance scenarios.

---
name: mutation-testing
description: Trail-of-Bits two-phase mutmut campaign — targeted first, survivors get full suite, skeptical-agent rule on survivor killing.
---

# Mutation Testing

Trail-of-Bits two-phase mutmut campaign for Python projects. The goal is to expose tests that pass for the wrong reasons by injecting faults and checking that at least one test catches each fault.

## When to Activate

- After reaching 80%+ line coverage to check that coverage is load-bearing
- Before shipping a module with safety-critical arithmetic (Decimal pipelines, reconciliation logic)
- When a bug slips past the test suite and you suspect coverage is hollow
- CI survival rate > 15% on a core module (automatic gate)

---

## Mutation Priority Tiers

Mutants are not equal. Work highest-impact first.

| Tier | Mutation type | Examples | Why first |
|------|---------------|----------|-----------|
| **1 — Revert** | `return None` → `return X`, `raise` → `pass` | Silencing exceptions, returning wrong sentinel | These kill the most business logic per mutation |
| **2 — Comment-out** | Delete an entire logic block | Remove a guard clause, a validation branch | Catches absent-test coverage |
| **3 — Operator swap** | `+` → `-`, `>` → `>=`, `and` → `or` | Off-by-one, boundary confusion | Broad but lower signal; run last |

Configure mutmut to apply tiers in order by controlling which operators are enabled per run (see config below).

---

## Phase 1 — Targeted Run

Run only the tests that directly import or exercise the mutated file. This keeps Phase 1 fast enough to run on every PR.

```bash
# Run mutation testing on a single module, paired tests only
mutmut run \
  --paths-to-mutate src/saa/engine/areas/fixed_assets/ \
  --tests-dir tests/engine/areas/fixed_assets/ \
  --use-coverage \
  --no-progress
```

What "paired tests" means: mutmut discovers tests via `--tests-dir`. Pass only the directory whose test filenames mirror the mutated module. Do not point at the full test suite yet.

After Phase 1 finishes, inspect survivors:

```bash
mutmut results          # summary: killed / survived / timeout
mutmut show <id>        # view the exact diff of a surviving mutant
mutmut html             # generate HTML report for triage
```

---

## Phase 2 — Survivor Promotion

Any mutant that survived Phase 1 (i.e., no test killed it) gets the full suite:

```bash
# Re-run only surviving mutants against the full test suite
mutmut run \
  --paths-to-mutate src/saa/engine/areas/fixed_assets/ \
  --use-coverage \
  --rerun-all
```

`--rerun-all` tells mutmut to re-execute every surviving mutant from the DB against all tests, not just the paired subset.

A mutant that also survives Phase 2 is a genuine gap: either the code path is untested or the existing tests do not assert the right postcondition.

---

## DB-Backed Triage

mutmut stores state in `.mutmut-cache` (SQLite). This persists across runs and across branches, so you never re-run a mutant that was already killed.

```bash
# Show only survivors from the DB
mutmut results --survived

# Apply a surviving mutant to disk to inspect it manually
mutmut apply <id>

# Revert to clean source after inspection
mutmut revert <id>
```

Track the survival count as a metric — not a moral judgment. Survival does not always mean missing test; it sometimes means dead code. Triage before writing tests.

---

## Skeptical-Agent Rule

**A surviving mutant MUST NOT be killed by writing a test that encodes the current (possibly wrong) behavior.**

Before writing any killing test for a Phase 2 survivor:

1. The agent reads the surviving mutant diff and the original source.
2. The agent states the invariant it believes the test should assert.
3. The agent requests **external confirmation** — either a human review or a second agent with a fresh context window that has not seen the builder's reasoning.
4. Only after confirmation does the agent write the killing test.

This rule prevents the common failure mode where mutation testing crystallizes a latent bug into the test suite as a "correct" assertion.

---

## pyproject.toml Configuration

```toml
[tool.mutmut]
paths_to_mutate = "src/"
backup = false
runner = "python -m pytest"
tests_dir = "tests/"
dict_synonyms = ""

# Limit to Tier 1 + 2 operators for the first campaign
# Tier 3 (arithmetic) enabled separately via CLI flag
```

Alternatively, `setup.cfg`:

```ini
[mutmut]
paths_to_mutate=src/
runner=python -m pytest
tests_dir=tests/
backup=False
```

---

## Two-Phase Shell Script

```bash
#!/usr/bin/env bash
set -euo pipefail

MODULE="${1:?Usage: mutmut-campaign.sh <src/path/to/module>}"
TESTS="${2:?Usage: mutmut-campaign.sh <src/path> <tests/path>}"

echo "=== Phase 1: targeted run ==="
mutmut run \
  --paths-to-mutate "$MODULE" \
  --tests-dir "$TESTS" \
  --use-coverage \
  --no-progress

SURVIVED=$(mutmut results --survived 2>/dev/null | grep -c "^[0-9]" || true)
echo "Phase 1 survivors: $SURVIVED"

if [ "$SURVIVED" -eq 0 ]; then
  echo "No survivors. Campaign complete."
  exit 0
fi

echo "=== Phase 2: full suite against survivors ==="
mutmut run \
  --paths-to-mutate "$MODULE" \
  --use-coverage \
  --rerun-all

FINAL=$(mutmut results --survived 2>/dev/null | grep -c "^[0-9]" || true)
echo "Phase 2 survivors: $FINAL"

# Fail CI if survival rate exceeds threshold
TOTAL=$(mutmut results 2>/dev/null | grep -oP 'Killed: \K[0-9]+' || echo 1)
RATE=$(echo "scale=2; $FINAL / ($TOTAL + $FINAL) * 100" | bc)
THRESHOLD=15

if (( $(echo "$RATE > $THRESHOLD" | bc -l) )); then
  echo "FAIL: survival rate ${RATE}% exceeds ${THRESHOLD}% threshold on core module"
  exit 1
fi

echo "PASS: survival rate ${RATE}%"
```

---

## CI Integration

Add to your CI pipeline after the test suite passes:

```yaml
# .github/workflows/mutation.yml (runs on PRs touching core modules)
- name: Mutation testing — fixed_assets
  run: |
    pip install mutmut
    bash scripts/mutmut-campaign.sh \
      src/saa/engine/areas/fixed_assets/ \
      tests/engine/areas/fixed_assets/
```

Gate condition: **fail the build if the Phase 2 survival rate on any `src/saa/engine/` module exceeds 15%.**

Do not gate non-core modules at 15% — set a looser threshold (40%) or skip mutation testing for adapter/glue code.

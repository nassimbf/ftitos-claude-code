# Skills

## The rule changed in v5

v4 capped the count at 8. That counts things instead of measuring the resource:
it blocked a 61-token skill while a description growing by 400 tokens passed
unnoticed. What is scarce is always-on context.

v5 prices it directly.

```bash
node scripts/ci/always-on-budget.js           # check against the baseline
node scripts/ci/always-on-budget.js --write   # record deliberate growth
```

Per-file, against `scripts/ci/always-on-baseline.json`. Growth fails with the
file and the delta named. Deliberate growth lands in review as a one-line diff
saying exactly what it now costs. `doctor` still enforces the 8,000-token
ceiling; this is the finer instrument that catches creep too small to trip it.

**There is no cap on the number of skills.** If eleven cheap skills fit the
budget, eleven is the right number.

First thing the measurement showed: `rules/*.md` is 1,392 of 2,443 always-on
tokens — 57% of the surface. The skills are the cheap part. That was invisible
while the metric was a headcount.

## Shipped (9)

| Skill | Why it ships |
|---|---|
| `spec-driven-development` | 132 invocations over 4.5 months — the most-used by a wide margin |
| `build-phases` | Durable planning that survives context loss, with `plan-check.js` verifying wave parallelism |
| `loop-engine` | 30 invocations. The loop skill actually wired to `ralph-loop.js` |
| `codebase-onboarding` | 21 invocations. Byte-identical to ECC upstream; no reason to touch it |
| `code-review` | CodeRabbit path (`coderabbit` 0.4.0 installed) |
| `codex` | Cross-model review (`codex` 0.142.2 installed) |
| `cso` | Security audit, OWASP + STRIDE |
| `browse` | A CDP driver with an allowlist and proxy redaction — code, not advice |
| `qa` | The QA workflow over `browse` |

## Admission criteria

1. **Invoked.** Real usage, not a plausible use case.
2. **Not a hook.** If it can be enforced deterministically it belongs in
   `hooks/scripts/`. Advice in a SKILL.md is advice the model may ignore.
3. **Not already covered.**
4. **Affordable.** The budget check must stay green, or the growth must be
   recorded deliberately.

## Vendoring from gstack

`cso`, `browse`, `qa` and `codex` come from garrytan/gstack at `71f6048`, MIT,
license in `skills/GSTACK-LICENSE`.

Vendored, not installed via upstream `./setup`, which wires a self-updating hook
— an hourly mutation of the skill surface on a machine holding client audit data
is not a default worth accepting.

They are written to run inside the full gstack install, so re-vendoring requires
`node scripts/devendor-gstack.js`, which is idempotent. It retargets the paths
they genuinely need, neutralises gstack suite infrastructure (skill-start/end
telemetry, the learnings and decision brain, the question registry), and strips
`preamble-tier`, which gates a ~12k-token gstack preamble.

`node scripts/ci/validate-skill-refs.js` is what catches it when that is missed.
It found 34 dangling references the first time it ran, in skills vendored hours
earlier.

## Removed

`browser-qa` → `.archive/skills/`. `origin: ECC`, and 87 lines of prose telling
the model to use a browser MCP. `browse` ships the driver. **Worth revisiting:**
upstream has since added blast-radius rules, corrected FID→INP and WCAG 2.2, and
added an `INCONCLUSIVE` verdict — the archived copy is a stale fork, not a bad
idea.

`product-lens` → `.archive/skills/`. Its stated justification was driving
`pipeline/phases/validate.md`, deleted in `416e603`.

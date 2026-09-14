# Skills

v4 has no tiers. Tiers were a way to pretend that 32 skills were affordable because
only 9 of them were "core" — but Claude Code scans every installed skill's name and
description on every session, so an unused skill costs context whether it is tier 1 or
tier 3. The only honest lever is: fewer skills.

## Shipped (8, cap 8)

| Skill | Why it ships |
|---|---|
| `spec-driven-development` | 132 invocations over 4.5 months — the most-used skill by a wide margin |
| `loop-engine` | 30 invocations. The loop skill actually wired to `ralph-loop.js` in `hooks.json` |
| `codebase-onboarding` | 21 invocations — first contact with an unfamiliar repo |
| `code-review` | Backs the review pass in `/project:review` |
| `product-lens` | Drives the VALIDATE phase in `pipeline/phases/validate.md` |
| `cso` | Security audit (OWASP + STRIDE). No prior equivalent at any tier |
| `browse` | A CDP driver with an allowlist and proxy redaction — code, not advice |
| `qa` | The QA workflow over `browse` |

`cso`, `browse` and `qa` are vendored from garrytan/gstack at `71f6048`, MIT,
retained in `skills/GSTACK-LICENSE`. Vendored rather than installed: the upstream
`./setup` wires a self-updating hook, and an hourly mutation of the skill surface
on a machine holding client audit data is not a thing to accept by default. Pinned
means the surface changes when we change it.

## Removed here

`browser-qa` → `.archive/skills/`. Its `origin: ECC` frontmatter traces to a repo
whose 24 hook commands are inline `node -e` one-liners; the skill itself was 87
lines of prose instructing the model to *use* a browser MCP. `browse` ships the
driver. Criterion 2 — if it can be code, it should not be advice.

`codex` was vendored and then dropped before commit: `ccg:review` already performs
dual-model cross-validated review. Criterion 3.

## Admission criteria

A skill ships only if it clears all three:

1. **Invoked.** It has real usage, not a plausible use case.
2. **Not a hook.** If the behaviour can be enforced deterministically, it belongs in
   `hooks/scripts/`. Advice in a SKILL.md is advice the model may ignore.
3. **Not already covered.** No second skill that overlaps an existing one.

## Removal criteria

Zero invocations in 60 days, or superseded by a hook. Removed skills go to `.archive/skills/`
so the decision is reversible. Twenty-six skills were removed in v4 on the first criterion.

## Measuring before you add

```bash
node scripts/doctor.js     # fails if always-on context exceeds 8k tokens
```

Every skill you add spends part of that budget on every session, forever. Spend it deliberately.

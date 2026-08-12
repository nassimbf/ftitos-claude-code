# Skills

v4 has no tiers. Tiers were a way to pretend that 32 skills were affordable because
only 9 of them were "core" — but Claude Code scans every installed skill's name and
description on every session, so an unused skill costs context whether it is tier 1 or
tier 3. The only honest lever is: fewer skills.

## Shipped (6)

| Skill | Why it survived |
|---|---|
| `spec-driven-development` | 132 invocations over 4.5 months — the most-used skill by a wide margin |
| `loop-engine` | 30 invocations — unattended and in-session loops |
| `codebase-onboarding` | 21 invocations — first contact with an unfamiliar repo |
| `code-review` | Backs the review pass in `/project:review` |
| `product-lens` | Forcing questions before building the wrong thing |
| `browser-qa` | The only verification layer that sees what the user sees |

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

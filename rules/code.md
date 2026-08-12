---
trigger: always_on
---

# Code

## Style

- **Immutability**: never mutate. Return new objects — `{...obj, k: v}`, `[...arr, x]`, `map/filter/reduce` over `push/splice`.
- **Size**: files 200–800 lines, functions < 50 lines, nesting ≤ 3. Early returns over if-else chains.
- **No hardcoded values**: config, credentials, URLs, magic numbers go in constants, env vars, or config files.
- **Naming**: descriptive. No abbreviations except `id`, `url`, `ctx`.
- **No dead code**: remove unused vars, imports, functions, and commented-out blocks before committing.
- **Absolute paths in code. Relative paths when referencing files to the user.**

## Banned patterns (AI slop)

**Visual** — purple/violet/indigo gradients · 3-column icon-in-circle feature grids · rounded-card-with-shadow on everything · emoji as design elements · stock-photo hero sections · glassmorphism unless the design system calls for it · floating particle backgrounds.

**Copy** — "unleash the power of" · "unlock your potential" · "revolutionary" · "cutting-edge" · "game-changing" · "next-generation" · "seamless"/"robust"/"scalable" without evidence · "leverage" as a verb · "synergy" · "paradigm shift" · "In today's fast-paced world" · "In the ever-evolving landscape".

**Code** — Lorem Ipsum · realistic-looking fake data ("John Doe", "test@test.com") — use obviously-fake data · spinners masking empty states — use skeletons or a real empty state · TODO without an issue reference · wrapper functions that pass through to one other function · comments restating the code.

Before emitting any UI, component, or user-facing copy: check against this list, replace matches with something specific and contextual. When in doubt, plain and functional beats decorative and generic.

## Performance

Profile before optimizing. Index DB queries, avoid N+1, paginate. Async for I/O-bound, sync for simple CPU-bound. Cache at the right layer, not preemptively.

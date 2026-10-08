---
trigger: always_on
---

# Engineering

## The rule that settles the conflict

**Minimal implementation, exhaustive verification.**

`ponytail.md` governs the code you write: YAGNI, reuse before writing, shortest working diff.
gstack's "Boil the Ocean" ethos governs how you check it: every edge case, every error path,
full coverage. They are not in tension once scoped this way — lean code, paranoid tests.

Where a gstack skill preamble tells you to do the complete thing, that applies to tests,
error paths and edge cases. It does not license extra abstractions, speculative features,
or a larger diff than the problem needs.

## Research before building

Mandatory before writing anything new. Stop at the first rung that answers it:

1. **GitHub code search** — `gh search repos`, `gh search code`. Someone has solved this.
2. **Library docs** — Context7 (`docs-lookup` agent) or the vendor's own docs. Never rely on
   training-cutoff memory for an API.
3. **Package registries** — PyPI, npm, crates.io before hand-rolling a utility.
4. **Adapt over author** — a project that solves 80% and can be forked or wrapped beats
   net-new code.

Only write from scratch when those four come up empty.

## Test-driven, in this order

1. Write the test first. **RED.**
2. Run it. Confirm it actually fails. A test that never failed proves nothing.
3. Minimum code to pass. **GREEN.**
4. Run it. Confirm it passes.
5. Refactor. **IMPROVE.**
6. Verify coverage — **80% minimum, measured, not assumed.**

All three layers are required: unit for pure logic, integration at service boundaries,
E2E for critical flows. Structure tests Arrange-Act-Assert. Mock only at system boundaries
(HTTP, DB, filesystem) — never mock internal modules.

**When a test fails, fix the implementation, not the test** — unless the test itself encodes
the wrong expectation, in which case say so explicitly before changing it.

Never write tests after the fact. Every number-generating function gets exhaustive
known-input tests.

## Commits

`type(scope): message` — `feat` `fix` `refactor` `docs` `test` `chore` `perf` `ci`.

One logical change per commit. Never bundle unrelated changes. Scan the diff before
committing; never commit `.env`, credentials, or tokens. Branches: `feat/…`, `fix/…`,
`chore/…`. Never force-push to main or master.

## Finishing

Do not report work as complete while lint, typecheck or tests are failing. If something is
blocked or skipped, say which part and why — scaling the work down is the operator's call,
not yours.

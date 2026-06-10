# Deferred Items

Items from `FACTORY-BLUEPRINT.md` that were NOT executed in the v3 implementation.
These are tracked here to prevent false claims of completeness.

## P5 — Not Implemented

### Gate 4 UI
Blueprint L3 calls for a visual gate summary (pass/fail/skipped per gate) rendered
in the terminal after a full 4-gate verification run. Not yet implemented.
- Dependency: requires gates 1–3 to be fully wired first
- Relevant skill: `skills/blind-judge/`

### Boucle Payload Audit
Blueprint notes that Stop hook payloads should be audited to verify which fields
are actually present at runtime. The `ralph-loop.js` and `loop-runner.js` both
rely on payload fields (`tool_response.content`, etc.) that may not exist in practice.
- Action needed: run hooks with `console.error(JSON.stringify(payload))` and capture
  a real payload to verify field availability

### Hookify Rule
Blueprint L6 calls for a lint rule that detects `execSync` with template literals
(injection vector) in hook scripts. Not yet a CI check.
- Action: add to `scripts/ci/validate-hooks.js` or a dedicated lint script

### Redundancy Rule
Blueprint calls for a rule/lint that detects skills referenced in SKILL.md files
that are not in TIER.md, and vice versa. Prevents silent skill drift.
- Action: add a CI check comparing `skills/*/SKILL.md` names against `skills/TIER.md`

### Agent Teams
Blueprint L4 describes a `teams/` directory structure for grouping agents into
named teams (e.g. `teams/verification/`, `teams/fleet/`). Not implemented.
- Decision: may be superseded by Claude Code's native agent teams feature

### Cuts Documentation
`FACTORY-BLUEPRINT.md` section 4 lists cuts (decisions NOT to implement) but
`CHANGELOG.md` only captures the 3 high-level cuts. Full cuts rationale is not
documented in any shipped file.
- Action: expand the Cuts section in CHANGELOG.md with the full rationale

## Decision Log

| Item | Status | Rationale |
|------|--------|-----------|
| Gate 4 UI | Deferred | Gates 1–3 not fully validated yet |
| Boucle payload audit | Deferred | Requires runtime capture, can't test statically |
| Hookify rule | Deferred | Low risk until more hooks are added |
| Redundancy rule | Deferred | TIER.md just updated; check first |
| Agent teams | Deferred | May be superseded by native feature |
| Cuts documentation | Deferred | Low priority |
| mutmut `--survived`/`--rerun-all` flags | Needs verification | mutmut not installed in audit env |
| engram env vars | Needs verification | engram-mcp not installed in audit env |

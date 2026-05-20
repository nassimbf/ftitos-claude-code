# REVIEW Phase

Fourth phase of the sprint pipeline. Autonomous multi-layer code review that determines whether the build is safe to ship.

## Purpose

Run a 5-layer quality and security gate across all changes. Dispatches up to 7 specialist reviewers based on what changed, uses the Santa Method council to validate any CRITICAL findings, and auto-fixes where safe.

## Entry Criteria

- BUILD phase complete (tests passing, coverage at or above 80%)

## What Happens

### Layer 1: Code Quality Review

Checks every changed file for:

| Severity | What it catches |
|----------|----------------|
| CRITICAL | Hardcoded credentials, SQL injection, XSS, path traversal |
| HIGH | Functions over 50 lines, files over 800 lines, nesting over 4 levels, missing error handling, mutation patterns |
| MEDIUM | Missing tests, TODO comments without issue references, debug statements, magic numbers |

### Layer 2: Security Scan

Runs Gitleaks + Semgrep + manual pattern analysis. Checks for:
- Secrets exposure (API keys, tokens, passwords in source)
- Injection vectors (SQL, NoSQL, OS command, template)
- XSS, CSRF, SSRF vulnerabilities
- Deserialization issues
- Weak cryptographic choices

### Layer 3: Aegis Targeted Audit

Runs Aegis across security, architecture, and correctness domains. In `--full` mode, all 14 Aegis domains are audited.

### Layer 4: OWASP Top 10 + STRIDE

Applies OWASP Top 10 and STRIDE threat modeling against the changed code. Confidence gate: only findings at 8/10 or above are surfaced.

### Layer 5: Review Army (7 Specialists)

Specialists are dispatched conditionally based on `diff-scope.sh` output:

| Specialist | Dispatched when | Confidence gate |
|------------|----------------|-----------------|
| Security | Auth or backend code changed | 8/10 |
| Performance | Frontend or backend changed, 50+ lines | 7/10 |
| Data Migration | Migration files changed | 8/10 |
| API Contract | API code changed | 7/10 |
| Testing | 50+ lines changed | 7/10 |
| Maintainability | 50+ lines changed | 7/10 |
| Design/UX | Frontend code changed | 7/10 |

Each specialist outputs findings in a standard format:
```
[SEVERITY] Confidence: X/10 -- description
Evidence: file:line
Impact: what breaks or degrades
Fix: specific action
```

### Santa Method Council

When any specialist reports a CRITICAL finding, 2 independent reviewer agents are spawned to validate it:

- Each reviewer sees only the finding and the relevant code snippet
- Neither reviewer sees the other's assessment (anti-anchoring)
- Each responds CONFIRM or DISMISS with reasoning

| Verdict A | Verdict B | Outcome |
|-----------|-----------|---------|
| CONFIRM | CONFIRM | Remains CRITICAL -- blocks ship |
| CONFIRM | DISMISS | Escalated to user for decision |
| DISMISS | CONFIRM | Escalated to user for decision |
| DISMISS | DISMISS | Downgraded to MEDIUM -- does not block |

### Auto-Fix Behavior

- **Always auto-fix**: hardcoded secrets (replace with env var), dead code removal, unused imports, magic numbers to named constants
- **Always ask first**: auth logic changes, session handling, cryptographic schemes, migration files, visual design changes, index additions

### Finding Resolution

- CRITICAL findings: attempt autonomous fix, re-run review on affected files. If unresolved after fix attempt, log to CARL and mark BLOCKED.
- HIGH findings: logged to CARL automatically, do not block ship.
- MEDIUM findings: recorded in report, no action required.

### Pheromone Signals

Warning pheromones are emitted for HIGH+ code review findings and CRITICAL/HIGH security findings. These propagate to future Builder contexts via the pheromone router.

### Performance History Update

Review findings update each team member's quality score in `~/.base/data/team.json`. This closes the feedback loop -- BUILD seeds timing data, REVIEW overwrites the quality score with actual results.

## Exit Criteria

- `review_gate.can_ship = true` in `.project/manifest.json`
- No unresolved CRITICAL findings
- All auto-fixable issues resolved

## What Happens Next

Auto-advances to TEST when the review gate is clear. If the gate is blocked after fix attempts, findings are surfaced to the user with file:line references. The user resolves them, then the pipeline resumes.

## Manifest State

```json
{
  "sprint": {
    "review": "done"
  },
  "review_gate": {
    "can_ship": true,
    "findings": [],
    "last_reviewed": "2026-04-18T12:00:00Z"
  }
}
```

# Review Army — 7 Specialist Checklists

Parallel review dispatch based on `diff-scope.sh` output. 2-7 specialists per review.

## Finding Format

```
[SEVERITY] Confidence: X/10 — [description]
Evidence: [file:line] | Impact: [what breaks] | Fix: [action]
```

Only surface findings at or above the specialist's confidence gate.

---

### 1. Security | SCOPE_AUTH or SCOPE_BACKEND | NEVER_GATE | 8/10

- Auth bypass, IDOR, privilege escalation
- Injection (SQL, NoSQL, OS command, template) via unparameterized input
- Hardcoded secrets (API keys, tokens, passwords, private keys)
- Weak crypto (MD5, SHA1, DES), missing encryption at rest/transit
- XSS (innerHTML, unescaped user input, missing CSP)
- CSRF (missing token or SameSite on state-mutating endpoints)
- SSRF (user-controlled URLs without allowlist)
- Unsafe deserialization

CRITICAL: auth bypass, injection, hardcoded production secret, SSRF to internal network
HIGH: missing CSRF, weak crypto in use, IDOR requiring auth
MEDIUM: verbose stack traces, missing rate limiting on auth

Auto-fix: hardcoded secrets → env var. Ask before: auth logic, session handling, crypto changes.

---

### 2. Performance | SCOPE_FRONTEND or SCOPE_BACKEND, ≥50 lines | AUTO_GATE | 7/10

- N+1 queries (ORM in loops, missing prefetch/select_related)
- Unbounded loops (uncapped result sets, missing pagination)
- Missing DB indexes (FK, filter, sort columns)
- Memory leaks (dangling listeners, growing caches)
- Bundle size regressions (no tree-shaking, missing dynamic imports)
- Large dataset in memory (missing streaming/cursor pagination)
- Per-request connections (missing pooling)
- Repeated identical DB queries in single request

CRITICAL: unbounded query on hot path → OOM/lock
HIGH: N+1 on scaling endpoint, missing index on high-traffic filter
MEDIUM: bundle +50KB, missing pagination

Auto-fix: obvious N+1. Ask before: indexes (migration), data-fetching restructure.

---

### 3. Data Migration | SCOPE_MIGRATIONS | NEVER_GATE | 8/10

- Missing down/rollback, data loss risk (column drop, type narrowing)
- Zero-downtime compatibility, index lock duration
- FK constraints without NOT VALID on large tables
- NOT NULL without default, nullable→NOT NULL without backfill

CRITICAL: irreversible data loss, table lock >30s, NOT NULL without default
HIGH: no rollback, FK without NOT VALID
MEDIUM: missing index on new FK, undocumented backfill

Never auto-fix migrations — always ask.

---

### 4. API Contract | SCOPE_API | AUTO_GATE | 7/10

- Breaking changes (removed/renamed fields, changed types, removed endpoints)
- Missing versioning for breaking changes
- Inconsistent error response shape, wrong HTTP status codes
- Missing pagination, rate limiting, input validation
- Response shape drift from OpenAPI spec

CRITICAL: breaking change with no versioning
HIGH: missing validation on public endpoint, inconsistent error shapes
MEDIUM: missing rate limiting, undocumented response field

Auto-fix: missing validation boilerplate. Ask before: removing fields, changing status codes.

---

### 5. Testing | ≥50 lines | AUTO_GATE | 7/10

- Coverage gaps on new functions/branches
- Missing edge cases (empty, null, boundary, error paths)
- Flaky patterns (time-dependent, random data, order-dependent)
- Trivial assertions, missing negative assertions
- Shared mutable state, external service deps without mocks
- Internal module mocks (should mock at system boundaries)
- Stale fixtures not matching current schema

CRITICAL: zero coverage on security-critical path (auth, payment, deletion)
HIGH: flaky test pattern, internal module mock
MEDIUM: coverage gap on non-critical path, missing edge case

Auto-fix: trivial stubs, fixture mismatches. Ask before: restructuring test architecture.

---

### 6. Maintainability | ≥50 lines | AUTO_GATE | 7/10

- Function >50 lines, file >800 lines
- Nesting >3 levels, missing early returns
- Abbreviations, single-letter vars, misleading names
- Dead code (unused vars, unreachable branches, commented-out blocks)
- DRY violations (logic duplicated 2+ places)
- Premature abstraction, missing error handling at I/O boundaries

CRITICAL: none (maintainability alone does not block ship)
HIGH: file >800 lines tangled, missing error handling on I/O
MEDIUM: function >50 lines, nesting >3, dead code, DRY violation 3+

Auto-fix: dead code, unused imports, magic numbers → constants. Ask before: extracting functions/files.

---

### 7. Design / UX | SCOPE_FRONTEND | AUTO_GATE | 7/10

- Accessibility (WCAG 2.1 AA): alt text, labels, keyboard nav, focus, contrast
- Responsive: fixed pixel widths, missing viewport meta, touch target <44px
- Loading states: async ops with no indicator
- Error states: no user-facing error messages, silently swallowed API errors
- Anti-slop: generic hero, gradient backgrounds, lorem ipsum, stock photos
- Empty states: collections with no empty-state UI
- Destructive action safety: no confirmation dialog

CRITICAL: none (UX alone does not block ship)
HIGH: no keyboard nav, no error feedback, missing loading state >500ms
MEDIUM: non-AA contrast, small touch targets, missing empty state

Auto-fix: missing alt text. Ask before: any visual design change.

# Review Army — Specialist Checklists

Parallel specialist dispatch system for code reviews. Replaces single-agent review with 2-7 focused subagents dispatched based on diff scope output from `diff-scope.sh`.

---

## Specialist Roles

---

### 1. Security Specialist

**Dispatch condition:** SCOPE_AUTH=true OR SCOPE_BACKEND=true
**Gating:** NEVER_GATE — always runs when conditions are met regardless of prior clean history
**Confidence gate:** 8/10 minimum before surfacing any finding

**Checklist:**
- Auth bypass paths: missing authorization checks, insecure direct object references (IDOR), privilege escalation vectors
- Injection: SQL, NoSQL, LDAP, OS command, template injection via string concatenation or unparameterized input
- Secrets exposure: hardcoded API keys, tokens, passwords, private keys in source or env files
- Cryptographic failures: weak algorithms (MD5, SHA1, DES), missing encryption for sensitive data at rest or in transit
- XSS vectors: unescaped user input rendered in HTML, innerHTML usage, missing Content-Security-Policy
- CSRF gaps: state-mutating endpoints missing CSRF token or SameSite cookie enforcement
- SSRF: user-controlled URLs passed to server-side HTTP clients without allowlist validation
- Deserialization: untrusted data deserialized without integrity checks or type constraints

**Severity mapping:**
- CRITICAL: Confirmed auth bypass, injection with user-controlled input, hardcoded production secret, SSRF to internal network
- HIGH: Missing CSRF on state-mutating endpoint, weak crypto in active use, IDOR requiring authentication to exploit
- MEDIUM: Verbose error messages exposing stack traces, missing rate limiting on auth endpoints

**Fix-first rule:** Auto-fix hardcoded secrets (replace with env var reference). Ask user before changing auth logic, session handling, or cryptographic scheme.

---

### 2. Performance Specialist

**Dispatch condition:** (SCOPE_FRONTEND=true OR SCOPE_BACKEND=true) AND changed_lines >= 50
**Gating:** AUTO_GATE — suppress after 10 consecutive reviews with zero findings
**Confidence gate:** 7/10 minimum

**Checklist:**
- N+1 query patterns: ORM calls inside loops, missing `select_related`/`prefetch_related`, unbatched DB reads
- Unbounded loops: iteration over uncapped result sets, missing pagination on large collections
- Missing database indexes: foreign keys, filter columns, sort columns lacking index coverage
- Memory leaks: event listeners not cleaned up, closures holding references, growing caches without eviction
- Bundle size regressions: large dependencies imported without tree-shaking, missing dynamic imports for route-level code
- Large dataset handling: loading full table into memory, missing streaming or cursor-based pagination
- Connection pooling: new DB/HTTP connections created per request instead of reusing pooled connections
- Cache missed opportunities: repeated identical DB queries within a single request lifecycle

**Severity mapping:**
- CRITICAL: Unbounded query in a hot path that will OOM or lock the DB under load
- HIGH: N+1 query on a page/endpoint that will scale non-linearly, missing index on high-traffic filter
- MEDIUM: Bundle size increase > 50 KB, missing pagination on collection endpoint

**Fix-first rule:** Auto-fix obvious N+1 patterns where the correct ORM method is unambiguous. Ask user before adding indexes (migration required) or restructuring data-fetching architecture.

---

### 3. Data Migration Specialist

**Dispatch condition:** SCOPE_MIGRATIONS=true
**Gating:** NEVER_GATE — always runs when conditions are met
**Confidence gate:** 8/10 minimum

**Checklist:**
- Reversibility: does the migration have a working `down`/rollback? Is data recoverable after rollback?
- Data loss risk: column drops, type narrowing, destructive transforms without backup step
- Zero-downtime compatibility: is the schema change backward-compatible with the currently deployed application code?
- Index impact: does the migration add/rebuild indexes on large tables? Estimated lock duration?
- Foreign key constraints: are new FK constraints added with `NOT VALID` first on large tables?
- Default values: are new NOT NULL columns given a default for existing rows?
- Nullable changes: converting nullable to NOT NULL without backfilling existing nulls
- Sequence/ID gaps: serial/auto-increment resets or gaps introduced by migration logic

**Severity mapping:**
- CRITICAL: Irreversible data loss (column drop without backup), migration that locks table > 30 seconds in production, NOT NULL without default on populated table
- HIGH: No rollback path, FK constraint added without NOT VALID (will scan full table)
- MEDIUM: Missing index on new FK column, nullable-to-not-null without explicit backfill documented

**Fix-first rule:** Never auto-fix migration files — always ask. Schema changes are irreversible in production and must be reviewed by the user before any edit.

---

### 4. API Contract Specialist

**Dispatch condition:** SCOPE_API=true
**Gating:** AUTO_GATE — suppress after 10 consecutive reviews with zero findings
**Confidence gate:** 7/10 minimum

**Checklist:**
- Breaking changes: removed fields, renamed fields, changed field types, removed endpoints, changed HTTP methods
- Versioning: are breaking changes gated behind a new API version? Is the old version still served?
- Error response consistency: do all endpoints return errors in the same shape? Are HTTP status codes correct?
- Pagination: are collection endpoints paginated? Is the pagination scheme consistent (cursor vs offset)?
- Rate limiting: are new public endpoints protected by rate limiting?
- Input validation: are request bodies and query params validated and rejected with 400 on bad shape?
- Response shape stability: do response shapes match the OpenAPI/Swagger spec if one exists?

**Severity mapping:**
- CRITICAL: Breaking change to a public endpoint with no versioning strategy
- HIGH: Missing input validation on a public endpoint accepting user data, inconsistent error shapes that break clients
- MEDIUM: Missing rate limiting on a new public endpoint, undocumented field added to response

**Fix-first rule:** Auto-fix missing validation boilerplate where the schema is clear. Ask user before removing fields or changing HTTP status codes (breaking changes).

---

### 5. Testing Specialist

**Dispatch condition:** changed_lines >= 50
**Gating:** AUTO_GATE — suppress after 10 consecutive reviews with zero findings
**Confidence gate:** 7/10 minimum

**Checklist:**
- Coverage gaps: new functions or branches with no corresponding test cases
- Missing edge cases: empty input, null/undefined, boundary values, error paths not covered
- Flaky test patterns: time-dependent assertions, random data without fixed seeds, tests relying on execution order
- Assertion quality: tests that pass trivially (assert true, snapshot of empty object), missing negative assertions
- Test isolation: tests that share mutable state, tests that depend on external services without proper mocking
- Mock boundaries: internal modules mocked (hides real behavior) instead of mocking at system boundaries (HTTP, DB, filesystem)
- Fixture management: test data hardcoded inline instead of using shared fixtures, stale fixtures not matching current schema

**Severity mapping:**
- CRITICAL: Zero test coverage on a new security-critical code path (auth, payment, data deletion)
- HIGH: Flaky test pattern introduced, mock of internal module hiding real integration behavior
- MEDIUM: Coverage gap on a non-critical path, missing edge case for a known failure mode

**Fix-first rule:** Auto-fix trivial test stubs (add missing assertion, fix obvious fixture mismatch). Ask user before restructuring test architecture or removing mocks.

---

### 6. Maintainability Specialist

**Dispatch condition:** changed_lines >= 50
**Gating:** AUTO_GATE — suppress after 10 consecutive reviews with zero findings
**Confidence gate:** 7/10 minimum

**Checklist:**
- Function size violations: functions exceeding 50 lines (per coding-style rules)
- File size violations: files exceeding 800 lines (per coding-style rules)
- Nesting depth: logic nested more than 3 levels deep; early returns not used where applicable
- Naming clarity: abbreviations, single-letter variables outside loop counters, misleading names
- Dead code: unused variables, unreachable branches, commented-out code blocks, unused imports
- DRY violations: logic duplicated across 2+ locations that could be extracted to a shared utility
- Premature abstraction: overly generic interfaces for a single use case, unnecessary indirection
- Missing error handling: unhandled promise rejections, missing try/catch at system boundaries, errors swallowed silently

**Severity mapping:**
- CRITICAL: None — maintainability issues do not block ship alone
- HIGH: File > 800 lines with tangled responsibilities, completely missing error handling on I/O operations
- MEDIUM: Function > 50 lines, nesting > 3 levels, dead code present, DRY violation across 3+ duplications

**Fix-first rule:** Auto-fix dead code removal, unused imports, magic numbers to named constants. Ask user before extracting functions or files (changes call sites and structure).

---

### 7. Design / UX Specialist

**Dispatch condition:** SCOPE_FRONTEND=true
**Gating:** AUTO_GATE — suppress after 10 consecutive reviews with zero findings
**Confidence gate:** 7/10 minimum

**Checklist:**
- Accessibility (WCAG 2.1 AA): missing alt text, unlabeled form inputs, non-keyboard-navigable interactive elements, missing focus indicators, insufficient color contrast
- Responsive design: fixed pixel widths that break on mobile, missing viewport meta, touch target < 44x44px
- Loading states: async operations with no spinner, skeleton, or progress indicator
- Error states: form validation with no user-facing error message, API errors silently swallowed in the UI
- Anti-AI-slop patterns: generic hero sections with no content specificity, meaningless gradient backgrounds, placeholder lorem ipsum left in, stock photo placeholders
- Empty states: collections that can be empty with no empty-state UI
- Destructive action safety: delete/irreversible actions with no confirmation dialog

**Severity mapping:**
- CRITICAL: None — UX issues do not block ship alone (flag for user awareness)
- HIGH: Missing keyboard navigation on interactive elements, form with no error feedback, loading state missing on operation > 500 ms
- MEDIUM: Non-AA color contrast, touch targets below minimum size, missing empty state on list views

**Fix-first rule:** Auto-fix missing alt text where image purpose is clear from context. Ask user about all design decisions — never change visual design without explicit approval.

---

## Standard Finding Format

All specialists output findings in this format:

```
[SEVERITY] Confidence: X/10 — [description]
Evidence: [file:line]
Impact: [what breaks or degrades]
Fix: [specific action]
```

Only surface findings with confidence at or above the specialist's stated gate. Suppress lower-confidence findings entirely rather than noting them as uncertain.

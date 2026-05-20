---
name: project:review
description: Integrated review pipeline -- code review + security + Aegis + CARL decision logging in one command
argument-hint: "[--quick] [--security-only] [--full]"
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion]
---

<objective>
Run the complete integrated review pipeline:
1. Code quality review (checks functions, nesting, naming, error handling)
2. Security scan (secrets, injection, XSS, missing validation) -- Gitleaks + Semgrep + manual pattern analysis
3. Aegis targeted audit (domains: security, architecture, correctness)
4. Extended security pass -- OWASP Top 10 + STRIDE threat model applied locally (confidence gate: 8/10+)
5. Synthesize findings from all sources into one unified report (no duplicates)
6. Update .project/manifest.json review_gate
7. Gate: block ship if CRITICAL findings; warn if HIGH
8. Optionally log findings decision to CARL

This replaces running /code-review, /verify-security, and /aegis:audit separately.
</objective>

<modes>
- Default: Code review + Security + Aegis quick-scan + OWASP/STRIDE pass
- --quick: Code review + Security only (skip Aegis and OWASP/STRIDE -- fastest)
- --security-only: Security + Aegis domain 04 + OWASP/STRIDE pass
- --full: All checks + full Aegis audit (all 14 domains)
</modes>

<process>

## Step 0: Determine Project Context

1. Check if `.project/manifest.json` exists in current directory
   - If yes: read it for project context
   - If no: check parent directories (up to 3 levels)
   - If not found: proceed without manifest, warn that state won't be saved

2. Check if there are staged or unstaged git changes:
   ```bash
   git diff --name-only HEAD 2>/dev/null || echo "no-git"
   git diff --staged --name-only 2>/dev/null
   ```

   If no changes: warn user "No git changes detected. Review will cover all files in current scope."

3. Parse mode from $ARGUMENTS (default, --quick, --security-only, --full)

## Step 1: Code Quality Review

Perform code quality analysis on changed files (or specified scope):

For each file in scope, check:

**CRITICAL issues (block ship):**
- Hardcoded credentials (API keys, passwords, tokens, private keys)
- SQL injection (string concatenation in queries)
- XSS (unescaped user input in HTML)
- Path traversal (unsanitized file paths in fs operations)

**HIGH issues (warn, should fix):**
- Functions > 50 lines
- Files > 800 lines
- Nesting depth > 4 levels
- Missing error handling (unhandled promise rejections, uncaught exceptions)
- Mutation patterns (state modified in place instead of returning new objects)
- Missing input validation at system boundaries

**MEDIUM issues (consider fixing):**
- Missing tests for new code
- TODO/FIXME comments without issue references
- console.log or debug statements
- Magic numbers without constants

Format findings as:
```
[SEVERITY] Confidence: X/10 -- [description]
Evidence: [file:line]
Impact: [what breaks]
Fix: [specific action]
```

IMPORTANT: Only report findings with confidence >= 7. Lower confidence -> skip entirely.

## Step 1.5: Review Army -- Parallel Specialist Dispatch

After completing Step 1 (code quality review), dispatch specialist subagents in parallel based on the diff scope.

1. Run diff-scope detection:
   ```bash
   bash $HOME/.claude/scripts/diff-scope.sh
   ```

2. Based on scope flags, dispatch the relevant specialists IN PARALLEL using the Agent tool (all in a single message):

   Reference: @$HOME/.claude/rules/review-army.md for specialist definitions.

   Dispatch rules:
   - If auth OR backend: dispatch Security Specialist (NEVER_GATE)
   - If migrations: dispatch Data Migration Specialist (NEVER_GATE)
   - If frontend OR backend AND 50+ lines: dispatch Performance Specialist
   - If api: dispatch API Contract Specialist
   - If 50+ lines: dispatch Testing Specialist + Maintainability Specialist
   - If frontend: dispatch Design/UX Specialist

   Each specialist agent receives:
   - The git diff output for files in their scope
   - Their specialist checklist from review-army.md
   - Instructions to output findings in the standard format: [SEVERITY] Confidence: X/10 -- [description]

3. Collect all specialist findings. De-duplicate against Step 1 findings.

4. For any CRITICAL findings: apply Council protocol (@$HOME/.claude/rules/review-council.md)
   - Spawn 2 independent reviewer agents with the finding + code only
   - Both must CONFIRM for the finding to remain CRITICAL

5. Auto-fix mechanical issues (dead code, stale comments, magic numbers, missing types).
   Ask user about: security decisions, architecture changes, design choices, anything affecting user-visible behavior.

6. Merge all findings into the unified report in Step 4.

## Step 2: Security Scan

Perform security-focused scan:

Reference: @$HOME/.claude/rules/security.md

Check for:
- Secrets in environment variables vs hardcoded
- Authentication/authorization bypasses
- Rate limiting missing on endpoints
- CSRF protection missing
- Cryptographic operations (avoid weak algos)
- Dependency vulnerabilities (check package.json/requirements.txt for known-vulnerable versions)
- SQL/NoSQL injection
- SSRF vulnerabilities

Run Gitleaks if available:
```bash
gitleaks detect --source . --no-banner 2>/dev/null && echo "gitleaks-clean" || echo "gitleaks-found"
```

Run Semgrep if available:
```bash
semgrep --config=auto --quiet --json . 2>/dev/null | head -100 || echo "semgrep-unavailable"
```

## Step 3: Aegis Targeted Audit (skip if --quick mode)

Run targeted Aegis audit on the project. Focus on 3 domains most relevant to active development:

**Domain 04 -- Security**: auth, injection, secrets, data handling
**Domain 01 -- Architecture**: design decisions, coupling, modularity
**Domain 03 -- Correctness**: logic errors, edge cases, data contracts

Reference Aegis domain files:
@$HOME/.claude/aegis/domains/04-security.md
@$HOME/.claude/aegis/domains/01-architecture.md
@$HOME/.claude/aegis/domains/03-correctness.md

For each domain, apply its audit questions to the current codebase/changes and produce findings.

If --full mode: follow the full /aegis:audit workflow (all phases 0-5).

## Step 3.5: OWASP Top 10 + STRIDE Threat Model Pass (skip if --quick)

Apply OWASP Top 10 and STRIDE threat model analysis locally against the current codebase/changes.

**OWASP Top 10 -- check for:**
- A01 Broken Access Control -- missing authorization checks, IDOR patterns
- A02 Cryptographic Failures -- weak algorithms, hardcoded secrets, unencrypted sensitive data
- A03 Injection -- SQL/NoSQL/LDAP/command injection via string concatenation
- A04 Insecure Design -- missing rate limiting, no input validation at trust boundaries
- A05 Security Misconfiguration -- debug mode on, default creds, verbose error messages
- A06 Vulnerable Components -- check package.json/requirements.txt for known-vulnerable versions
- A07 Auth/Session Failures -- weak session tokens, missing expiry, improper logout
- A08 Data Integrity Failures -- missing signature verification on deserialized data
- A09 Logging Failures -- insufficient logging of auth events, no audit trail
- A10 SSRF -- user-controlled URLs passed to server-side HTTP clients

**STRIDE -- evaluate:**
- Spoofing: Can identity be faked? (auth bypass, token forgery)
- Tampering: Can data be modified in transit or at rest?
- Repudiation: Are actions logged with enough context to reconstruct events?
- Information Disclosure: Are errors verbose? Is sensitive data in logs?
- DoS: Are there unbounded loops, missing rate limits, or resource exhaustion paths?
- Elevation of Privilege: Can a lower-privilege user reach higher-privilege operations?

**Confidence gate:** Only surface findings with confidence >= 8/10. Lower confidence -> suppress entirely.

Collect all CRITICAL and HIGH findings for synthesis in Step 4.

## Step 4: Synthesize Findings

Combine all findings from Steps 1, 2, 3, and 3.5 into a single unified report.

De-duplicate: if any two sources flag the same issue, merge into one finding with combined evidence and note which sources corroborated it.

Produce the report in this format:

```
============================
PROJECT REVIEW REPORT
============================

Target: [project-name or current dir]
Scope: [files reviewed]
Mode: [default/quick/security/full]
Date: [timestamp]

----------------------------
CRITICAL (must fix before ship)
----------------------------
[List critical findings with evidence and fix]

----------------------------
HIGH (should fix before ship)
----------------------------
[List high findings]

----------------------------
MEDIUM (consider fixing)
----------------------------
[List medium findings]

----------------------------
SUMMARY
----------------------------
Critical: N  |  High: N  |  Medium: N  |  Low: N
Sources: code-review(N) | security(N) | aegis(N) | owasp-stride(N)

SHIP GATE: [BLOCKED / WARNING / CLEAR]

Reason: [explanation if blocked or warning]
============================
```

## Step 5: Update manifest review_gate

If `.project/manifest.json` exists:

### Step 5a: Append current review_gate state to history

Before overwriting `review_gate`, read the CURRENT `review_gate` values and append them to `review_gate.history[]` as a snapshot. This creates an audit trail of all review cycles.

Only append if `review_gate.last_review` is not null (skip on first-ever review).

### Step 5b: Write new review_gate values

Now update the review_gate with current cycle results:
```json
{
  "review_gate": {
    "last_review": "[ISO timestamp]",
    "code_review_passed": true,
    "security_passed": true,
    "aegis_passed": true,
    "can_ship": true,
    "history": []
  }
}
```

## Step 6: CARL Decision Logging

If CRITICAL or HIGH findings were found:
Ask: "Log these findings as a CARL decision for tracking? (y/n)"

If yes: use mcp__carl-mcp__carl_v2_log_decision with:
- domain: "code-review"
- decision: "Review found [N critical, N high] issues in [project-name] on [date]"
- rationale: "[list the critical/high findings briefly]"
- recall: "review, [project-name], findings, [key-issue-keywords]"

Update manifest `frameworks.carl.decisions_logged` counter.

## Step 7: Display Ship Gate Status

If CRITICAL found:
```
SHIP BLOCKED -- Fix all CRITICAL issues before running /project:ship
```

If HIGH found (no CRITICAL):
```
SHIP WARNING -- HIGH issues present. Document risk before shipping.
Run /project:ship --force to override (not recommended).
```

If clean:
```
SHIP CLEAR -- Review passed. Run /project:ship when ready.
```

</process>

<success_criteria>
- [ ] Code quality findings generated with confidence scores
- [ ] Security scan completed (manual + tool-assisted)
- [ ] Aegis targeted audit run on domains 04, 01, 03
- [ ] OWASP Top 10 + STRIDE threat model pass run (unless --quick)
- [ ] Unified report produced (no duplicates across all 4 sources)
- [ ] .project/manifest.json review_gate updated
- [ ] CARL decision logged if critical/high findings
- [ ] Ship gate status clearly displayed
- [ ] User knows exactly what to fix before shipping
</success_criteria>

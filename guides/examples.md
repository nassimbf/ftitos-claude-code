# What You'll See

Concrete terminal output from the system running. No annotations, no abstract descriptions — just what appears on screen.

---

## Example 1: GateGuard Blocking an Unsafe Edit

Claude attempts to edit a file it has not read. GateGuard intercepts the `Edit` tool call before it executes.

```
> Edit src/auth/middleware.ts

[GateGuard] BLOCKED: src/auth/middleware.ts has not been read in this session.
Read the file first, then edit.

> Read src/auth/middleware.ts

     1  import { Request, Response, NextFunction } from 'express';
     2  import jwt from 'jsonwebtoken';
     3
     4  export function validateToken(req: Request, res: Response, next: NextFunction) {
     5    const token = req.headers.authorization?.split(' ')[1];
     6    if (!token) return res.status(401).json({ error: 'No token provided' });
     7    try {
     8      req.user = jwt.verify(token, process.env.JWT_SECRET!);
     9      next();
     10   } catch {
     11     return res.status(401).json({ error: 'Invalid token' });
     12   }
     13 }

> Edit src/auth/middleware.ts

[GateGuard] Backup created: ~/.claude/backups/middleware.ts.2026-04-18T14:22:31.bak
[edit applied successfully]
```

The same hook that blocked the first attempt confirms the backup before allowing the second. The file is only writable after it has been read in the current session.

---

## Example 2: Sprint Pipeline Running

Output from `/project:sprint validate` on a project with an existing test suite.

```
/project:sprint validate

[VALIDATE] Checking project structure...
  - CLAUDE.md present                  OK
  - CONTEXT.md present                 OK
  - .paul/ directory present           OK
  - package.json present               OK

[VALIDATE] Checking test coverage...
  - Running: npm test -- --coverage
  - Coverage: 84% (threshold: 80%)    OK

[VALIDATE] Checking for secrets...
  - Scanning diff for API keys...     clean
  - Scanning diff for tokens...       clean
  - Scanning .env references...       clean

[VALIDATE] All checks passed. Moving to PLAN.

[PLAN] Task: "Add rate limiting to /api/auth endpoints"
[PLAN] Analyzing codebase scope...
  - Affected files: src/routes/auth.ts, src/app.ts
  - Dependencies: express-rate-limit (not yet installed)
  - Risks identified: 2

[PLAN] Writing .paul/PLAN.md...         done
[PLAN] Writing CONTEXT.md...            done

[PLAN] Summary:
  Tasks: 3
    1. Install and configure express-rate-limit
    2. Apply rate limiter middleware to POST /api/auth/login and POST /api/auth/register
    3. Add integration tests for rate limit enforcement (429 response)
  Risks:
    - Existing tests may fail if they hit the limiter in rapid succession
    - Rate limit window must be configurable via env var, not hardcoded

--- Gate 1: Review .paul/PLAN.md, then type "approve" to continue ---
```

---

## Example 3: Review Army Dispatch

Output from the REVIEW phase after a 127-line diff touching `src/routes/auth.ts` and `src/auth/middleware.ts`.

```
[REVIEW] Running diff-scope.sh...
[REVIEW] Scope detected:
  SCOPE_AUTH=true
  SCOPE_BACKEND=true
  SCOPE_FRONTEND=false
  SCOPE_MIGRATIONS=false
  changed_lines=127

[REVIEW] Dispatching 4 specialists in parallel:
  - Security Specialist       (SCOPE_AUTH=true, SCOPE_BACKEND=true)
  - Performance Specialist    (changed_lines=127, threshold=50)
  - Testing Specialist        (changed_lines=127, threshold=50)
  - Maintainability Specialist (changed_lines=127, threshold=50)

[Security] Scan complete.
  [HIGH] Confidence: 9/10 — Missing rate limiting on POST /api/auth/login
    Evidence: src/routes/auth.ts:45
    Impact: Brute-force credential stuffing with no throttle
    Fix: Add express-rate-limit with max=5, windowMs=60000 before the route handler

[Performance] Scan complete.
  No findings above confidence threshold (7/10).

[Testing] Scan complete.
  [MEDIUM] Confidence: 8/10 — No test coverage for error path in validateToken()
    Evidence: src/auth/middleware.ts:23-31
    Impact: Malformed or expired JWTs reach protected routes silently in test runs
    Fix: Add test cases for expired token (jwt.TokenExpiredError) and malformed token (jwt.JsonWebTokenError)

[Maintainability] Scan complete.
  [MEDIUM] Confidence: 7/10 — Function loginHandler exceeds 50-line limit (67 lines)
    Evidence: src/routes/auth.ts:12-79
    Impact: Single function handles input validation, DB lookup, token generation, and response shaping
    Fix: Extract generateAuthToken(userId, role) to src/auth/tokens.ts

[REVIEW] Results: 3 findings (0 CRITICAL, 1 HIGH, 2 MEDIUM)
[REVIEW] No CRITICAL findings — council not required.
[REVIEW] Proceeding to TEST phase.
```

---

## Example 4: Review Council (Santa Method)

A different diff where the Security Specialist finds a SQL injection. The CRITICAL finding triggers the council.

```
[Security] Scan complete.
  [CRITICAL] Confidence: 9/10 — SQL injection via unsanitized user input
    Evidence: src/db/queries.ts:34
    Impact: req.body.username concatenated directly into db.query() string.
            Attacker input `' OR '1'='1` bypasses WHERE clause entirely.
    Fix: Replace string interpolation with parameterized query:
         db.query('SELECT * FROM users WHERE username = $1', [req.body.username])

[COUNCIL] CRITICAL finding detected. Spawning 2 independent reviewers in parallel...
[COUNCIL] Anti-anchoring enforced: reviewers cannot see each other's output.

[Reviewer A] CONFIRM
  The query at src/db/queries.ts:34 uses template literal interpolation with
  req.body.username. No sanitization layer between user input and db.query().
  This is exploitable without authentication.

[Reviewer B] CONFIRM
  String interpolation in db.query() call at line 34. Input flows directly from
  request body. Parameterized query is the only correct fix here.

[COUNCIL] Verdict: 2/2 CONFIRM
[COUNCIL] Finding remains CRITICAL. Blocks ship.
[COUNCIL] Auto-fix applied: parameterized query written to src/db/queries.ts:34
[COUNCIL] Backup saved: ~/.claude/backups/queries.ts.2026-04-18T14:37:09.bak
```

Had the two reviewers disagreed, the output would have been:

```
[COUNCIL] Verdict: SPLIT (1 CONFIRM, 1 DISMISS)

COUNCIL SPLIT — User decision required

Finding: SQL injection via unsanitized user input
Evidence: src/db/queries.ts:34

Reviewer A (CONFIRM):
  Template literal with user input passed directly to db.query(). Exploitable.

Reviewer B (DISMISS):
  The db library at this version sanitizes inputs internally. This is not
  exploitable in the current dependency configuration.

Does this finding block ship? (yes / no)
```

---

## Example 5: Doctor Health Check

```
$ npm run doctor

ftitos-claude-code doctor v1.0.0
Validating installation at ~/.claude/

Agents           20/20 valid
Skills           40/40 valid (all have SKILL.md with name + description frontmatter)
Rules (common)   10/10 valid
Rules (python)    5/5 valid
Hooks            25/25 registered, all scripts pass syntax check
Commands          7/7 valid
Frameworks        4/4 documented (BASE, PAUL, Aegis, CARL)

MCP servers
  context7         reachable
  memory           reachable
  sequential-thinking reachable
  playwright       reachable
  deepwiki         reachable
  gbrain           not installed (optional — WHO+WHY engine)
  graphify         not installed (optional — WHAT+HOW engine)
  gitnexus         not installed (optional — WHERE+IMPACT engine)
  engram           not installed (optional — LEARNED engine)

Node.js           v20.11.0 (required: 18+)  OK

Status: HEALTHY — core system fully operational.
        4 optional brain servers not installed. Run guides/brain-system.md to add them.
```

The 4 brain servers are always listed as optional. The core pipeline, Review Army, GateGuard, and all hooks function without them.

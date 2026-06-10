# Security Guidance

Three-layer security model: hooks catch mechanical violations fast, LLM review catches semantic violations before delivery, agentic commit review traces full data flow before anything lands in git.

---

## Layer 1 — Hook-Level Regex Guard (fast, deterministic)

`hooks/scripts/cc-safety-net.js` runs on every Bash PreToolUse call. It blocks before the command executes.

Additional patterns enforced at hook level:

**File writes — always block:**
- Writes to `.env`, `*.pem`, `*.key`, `id_rsa*`, `credentials.*`, `secrets.*`
- Any tool call that would overwrite `~/.ssh/` or `~/.gnupg/` contents

**File reads — warn (exit 1):**
- Reads of `~/.ssh/` private key files (`id_rsa`, `id_ed25519`, etc.)
- Reads of `~/.gnupg/` keyring files

**Code smell detection — warn on edit:**
- `os.system(` in Python source files
- `subprocess.call(shell=True` in Python source files
- `eval(` in Python source files not in a test context

Hooks are deterministic and have zero LLM cost. They run first and are never skipped.

---

## Layer 2 — LLM Diff Review (pre-response)

Before delivering any response that includes a code edit, verify the diff mentally against this checklist. Do not deliver the response if any item fails — fix it first.

**Secret detection:**
- No API keys matching `/sk-[a-zA-Z0-9]{20,}/`
- No GitHub tokens matching `/ghp_[a-zA-Z0-9]{36}/` or `/github_pat_[a-zA-Z0-9_]{82}/`
- No AWS keys matching `/AKIA[A-Z0-9]{16}/`
- No generic high-entropy strings assigned to variables named `key`, `token`, `secret`, `password`, `credential`

**Injection prevention:**
- User input must not be directly concatenated into shell commands — use `shlex.quote()` (Python) or `execFile` with args array (Node.js)
- User input must not be directly interpolated into SQL — parameterized queries only
- No `innerHTML = userValue` without explicit sanitization

**Endpoint hygiene:**
- New HTTP endpoints must have input validation on the request body and query params
- Auth-gated resources must check permissions before returning data, not after

**Reporting format** — same as Review Army specialists:
```
[SEVERITY] Confidence: X/10 — [description]
Evidence: [file:line]
Impact: [what breaks or degrades]
Fix: [specific action]
```

---

## Layer 3 — Agentic Commit Review (cross-file data flow)

Before any `git commit`, trace all user-controlled inputs from ingestion to persistence. Check each sink:

| Sink | Required control |
|------|-----------------|
| Database write | Parameterized query or ORM — never string interpolation |
| Shell execution | `execFile` with args array, or `shlex.quote()` — never `shell=True` with user data |
| HTML rendering | Framework escaping (`{{ }}` in Jinja/Django, JSX auto-escape) — never raw `innerHTML` |
| File system write | Path sanitized with `os.path.abspath` + prefix check — never user-controlled `../` traversal |
| Redirect URL | Allowlist or same-origin check — never open redirect |

If any sink is uncontrolled: block commit, surface a `[CRITICAL]` finding, trigger Review Council.

---

## Monitoring

Enable OpenTelemetry export:
```
CLAUDE_CODE_ENABLE_TELEMETRY=1
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**Retry loop detection:** 4 identical tool calls within 6 consecutive spans is a retry loop — surface as `[HIGH]` alert and halt autonomous execution.

**Safety-net log:** `~/.claude/safety-net.log` — review weekly for false positives and missed patterns. Each unique missed pattern becomes a new hook rule (Hashimoto rule: observed failure → permanent engineered fix).

---

## Isolation Doctrine

- Never run `--dangerously-skip-permissions` on the host machine if credentials, SSH keys, or cloud configs are present in `~`.
- Sandboxed execution: use a git worktree or Docker container with no credential mounts as the blast-radius boundary.
- Worktree pattern: `git worktree add .claude/worktrees/<branch>` — agent operates there, no access to home directory secrets.
- Docker pattern: `docker run --rm -v $(pwd):/workspace -w /workspace --network none <image>` — network disabled, no volume mounts outside workspace.

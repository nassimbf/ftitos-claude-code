---
trigger: always_on
---

# Security

Secret writes are blocked mechanically by the `pre-secrets-block` hook, destructive commands by `cc-safety-net`. This file covers what a hook cannot check.

## Before every commit

| Sink | Required control |
|---|---|
| Database write | Parameterized query or ORM. Never string interpolation. |
| Shell execution | `execFile` with an args array, or `shlex.quote()`. Never `shell=True` with user data. |
| HTML rendering | Framework escaping (`{{ }}`, JSX). Never raw `innerHTML`. |
| Filesystem write | `os.path.abspath` + prefix check. Never user-controlled `../`. |
| Redirect URL | Allowlist or same-origin check. Never an open redirect. |

Also: CSRF tokens or SameSite cookies on state-mutating endpoints · rate limiting on auth endpoints and public APIs · validate and reject unexpected shapes at HTTP handlers and CLI args · no known critical CVEs in direct dependencies (`npm audit` / `pip-audit` before ship).

## Reviewing a diff

Trace every user-controlled input from ingestion to sink. If any sink above is uncontrolled, block the commit and say so.

Report findings as:

```
[SEVERITY] Confidence: X/10 — description
Evidence: file:line | Impact: what breaks | Fix: specific action
```

Auto-fix hardcoded secrets → env var. Ask before changing auth logic, session handling, or crypto.

## Isolation

Never run `--dangerously-skip-permissions` on a host holding credentials, SSH keys, or cloud configs. Use a git worktree or a Docker container with no credential mounts as the blast-radius boundary.

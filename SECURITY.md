# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Email **nessim.ben.ftita@gmail.com** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Affected component (hooks, install script, agent dispatch, etc.)
4. Potential impact

### Response Timeline

- **48 hours** — acknowledgment of your report
- **7 days** — initial assessment and severity classification
- **30 days** — fix developed and tested (for confirmed issues)

### What Qualifies

- Code injection via hook scripts or agent dispatch
- Secrets exposure through the install process
- Path traversal in file operations
- Unintended privilege escalation via agent definitions
- Supply chain risks in dependencies

### What Does Not Qualify

- Feature requests or non-security bugs (use [GitHub Issues](https://github.com/ftitos/ftitos-claude-code/issues))
- Vulnerabilities in upstream dependencies that are already publicly disclosed
- Issues requiring physical access to the machine

## Disclosure Policy

We follow coordinated disclosure. Once a fix is available and released, we will:

1. Credit the reporter (unless anonymity is requested)
2. Publish a security advisory on GitHub
3. Update the changelog with the fix

We ask that reporters do not disclose the vulnerability publicly until a fix is released.

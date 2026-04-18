# Security

Pre-commit checklist — block commit if any item fails:

- **No hardcoded secrets**: No API keys, tokens, passwords, or credentials in source. Use env vars or secret managers.
- **Parameterized SQL**: All database queries use parameterized statements or ORM. Never string-concatenate user input into SQL.
- **XSS prevention**: Escape all user-supplied data before rendering in HTML. Use framework-provided escaping, never raw innerHTML.
- **CSRF protection**: All state-mutating endpoints require CSRF tokens or SameSite cookies.
- **Rate limiting**: Auth endpoints and public APIs must have rate limiting configured.
- **Input validation**: Validate and sanitize at system boundaries (HTTP handlers, CLI args). Reject unexpected shapes early.
- **Dependency scanning**: No known critical CVEs in direct dependencies. Run `npm audit` / `pip-audit` before ship.
- **Sensitive paths**: Never write to `.env`, `*.pem`, `*.key`, `id_rsa`, or `credentials.*` files in tool output.

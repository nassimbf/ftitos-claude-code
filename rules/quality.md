# Quality — Testing + Security

## Testing

- **80% minimum coverage**: No task is done until coverage is at or above 80%. Measure before marking complete.
- **TDD mandatory**: Write the failing test first (RED), then the minimum implementation (GREEN), then refactor (REFACTOR). Never write tests after the fact.
- **Test pyramid**: Unit tests for pure logic, integration tests for service boundaries, E2E tests for critical user flows.
- **No mocking internals**: Mock at system boundaries (HTTP, DB, filesystem). Never mock internal modules — that hides real behavior.
- **Test naming**: `test_<what>_<when>_<expected>`. Tests are documentation; names must be descriptive.
- **No flaky tests**: Tests must be deterministic. Fix or quarantine any test that fails intermittently.
- **pytest** is the Python test framework. Every number-generating function must be tested exhaustively with known inputs.

## Security — Pre-Commit Checklist

Block commit if any item fails:

- **No hardcoded secrets**: No API keys, tokens, passwords, or credentials in source. Use env vars or secret managers.
- **Parameterized SQL**: All database queries use parameterized statements or ORM. Never string-concatenate user input into SQL.
- **XSS prevention**: Escape all user-supplied data before rendering in HTML. Use framework-provided escaping, never raw innerHTML.
- **CSRF protection**: All state-mutating endpoints require CSRF tokens or SameSite cookies.
- **Rate limiting**: Auth endpoints and public APIs must have rate limiting configured.
- **Input validation**: Validate and sanitize at system boundaries (HTTP handlers, CLI args). Reject unexpected shapes early.
- **Dependency scanning**: No known critical CVEs in direct dependencies. Run `npm audit` / `pip-audit` before ship.
- **Sensitive paths**: Never write to `.env`, `*.pem`, `*.key`, `id_rsa`, or `credentials.*` files in tool output.

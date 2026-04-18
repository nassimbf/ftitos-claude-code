# Testing

- **80% minimum coverage**: No task is done until coverage is at or above 80%. Measure before marking complete.
- **TDD mandatory**: Write the failing test first (RED), then the minimum implementation (GREEN), then refactor (REFACTOR). Never write tests after the fact.
- **Test pyramid**: Unit tests for pure logic, integration tests for service boundaries, E2E tests for critical user flows.
- **No mocking internals**: Mock at system boundaries (HTTP, DB, filesystem). Never mock internal modules — that hides real behavior.
- **Test naming**: `test_<what>_<when>_<expected>`. Tests are documentation; names must be descriptive.
- **No flaky tests**: Tests must be deterministic. Fix or quarantine any test that fails intermittently.
- **pytest** is the Python test framework. Every number-generating function must be tested exhaustively with known inputs.

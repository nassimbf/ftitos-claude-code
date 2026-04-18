---
name: python-testing
description: Python testing strategies using pytest, TDD methodology, fixtures, mocking, parametrization, and coverage requirements.
origin: ECC
---

# Python Testing Patterns

Comprehensive testing strategies for Python applications using pytest, TDD methodology, and best practices.

## When to Activate

- Writing new Python code (follow TDD: red, green, refactor)
- Designing test suites for Python projects
- Reviewing Python test coverage
- Setting up testing infrastructure

## Core Testing Philosophy

### Test-Driven Development (TDD)

Always follow the TDD cycle:

1. **RED**: Write a failing test for the desired behavior
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Improve code while keeping tests green

```python
# Step 1: Write failing test (RED)
def test_add_numbers():
    result = add(2, 3)
    assert result == 5

# Step 2: Write minimal implementation (GREEN)
def add(a, b):
    return a + b

# Step 3: Refactor if needed (REFACTOR)
```

### Coverage Requirements

- **Target**: 80%+ code coverage
- **Critical paths**: 100% coverage required
- Use `pytest --cov` to measure coverage

```bash
pytest --cov=mypackage --cov-report=term-missing --cov-report=html
```

## pytest Fundamentals

### Basic Test Structure

```python
import pytest

def test_addition():
    """Test basic addition."""
    assert 2 + 2 == 4

def test_string_uppercase():
    """Test string uppercasing."""
    text = "hello"
    assert text.upper() == "HELLO"
```

### Assertions

```python
# Equality
assert result == expected

# Truthiness
assert result  # Truthy
assert not result  # Falsy
assert result is None  # Exactly None

# Membership
assert item in collection

# Type checking
assert isinstance(result, str)

# Exception testing (preferred approach)
with pytest.raises(ValueError):
    raise ValueError("error message")

# Check exception message
with pytest.raises(ValueError, match="invalid input"):
    raise ValueError("invalid input provided")
```

## Fixtures

### Basic Fixture Usage

```python
@pytest.fixture
def sample_data():
    return {"name": "Alice", "age": 30}

def test_sample_data(sample_data):
    assert sample_data["name"] == "Alice"
```

### Fixture with Setup/Teardown

```python
@pytest.fixture
def database():
    db = Database(":memory:")
    db.create_tables()
    db.insert_test_data()
    yield db  # Provide to test
    db.close()  # Teardown
```

### Fixture Scopes

```python
@pytest.fixture  # Function scope (default)
def temp_file(): ...

@pytest.fixture(scope="module")  # Once per module
def module_db(): ...

@pytest.fixture(scope="session")  # Once per session
def shared_resource(): ...
```

### Conftest.py for Shared Fixtures

```python
# tests/conftest.py
@pytest.fixture
def client():
    app = create_app(testing=True)
    with app.test_client() as client:
        yield client
```

## Parametrization

```python
@pytest.mark.parametrize("input,expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
    ("PyThOn", "PYTHON"),
])
def test_uppercase(input, expected):
    assert input.upper() == expected

@pytest.mark.parametrize("a,b,expected", [
    (2, 3, 5),
    (0, 0, 0),
    (-1, 1, 0),
])
def test_add(a, b, expected):
    assert add(a, b) == expected
```

## Markers and Test Selection

```python
@pytest.mark.slow
def test_slow_operation(): ...

@pytest.mark.integration
def test_api_integration(): ...
```

```bash
pytest -m "not slow"        # Skip slow tests
pytest -m integration       # Only integration tests
```

## Mocking and Patching

```python
from unittest.mock import patch, Mock

@patch("mypackage.external_api_call")
def test_with_mock(api_call_mock):
    api_call_mock.return_value = {"status": "success"}
    result = my_function()
    api_call_mock.assert_called_once()
    assert result["status"] == "success"

# Mocking exceptions
@patch("mypackage.api_call")
def test_api_error_handling(api_call_mock):
    api_call_mock.side_effect = ConnectionError("Network error")
    with pytest.raises(ConnectionError):
        api_call()
```

## Testing Async Code

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    result = await async_add(2, 3)
    assert result == 5
```

## Test Organization

```
tests/
├── conftest.py
├── unit/
│   ├── test_models.py
│   └── test_services.py
├── integration/
│   └── test_api.py
└── e2e/
    └── test_user_flow.py
```

## Best Practices

### DO

- **Follow TDD**: Write tests before code (red-green-refactor)
- **Test one thing**: Each test should verify a single behavior
- **Use descriptive names**: `test_user_login_with_invalid_credentials_fails`
- **Use fixtures**: Eliminate duplication
- **Mock external dependencies**: Don't depend on external services
- **Test edge cases**: Empty inputs, None values, boundary conditions
- **Aim for 80%+ coverage**: Focus on critical paths

### DON'T

- **Don't test implementation**: Test behavior, not internals
- **Don't share state between tests**: Tests should be independent
- **Don't catch exceptions in tests**: Use `pytest.raises`
- **Don't write tests that are too brittle**: Avoid over-specific mocks

## Running Tests

```bash
pytest                               # Run all tests
pytest tests/test_utils.py           # Run specific file
pytest -v                            # Verbose output
pytest --cov=mypackage               # With coverage
pytest -m "not slow"                 # Skip slow tests
pytest -x                            # Stop on first failure
pytest --lf                          # Run last failed
pytest -k "test_user"                # Run tests matching pattern
```

## Quick Reference

| Pattern | Usage |
|---------|-------|
| `pytest.raises()` | Test expected exceptions |
| `@pytest.fixture()` | Create reusable test fixtures |
| `@pytest.mark.parametrize()` | Run tests with multiple inputs |
| `@patch()` | Mock functions and classes |
| `tmp_path` fixture | Automatic temp directory |
| `pytest --cov` | Generate coverage report |

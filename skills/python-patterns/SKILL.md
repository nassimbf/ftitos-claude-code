---
name: python-patterns
description: Pythonic idioms, PEP 8 standards, type hints, and best practices for building robust, efficient, and maintainable Python applications.
origin: ECC
---

# Python Development Patterns

Idiomatic Python patterns and best practices for building robust, efficient, and maintainable applications.

## When to Activate

- Writing new Python code
- Reviewing Python code
- Refactoring existing Python code
- Designing Python packages/modules

## Core Principles

### Readability Counts
```python
# Good: Clear and readable
def get_active_users(users: list[User]) -> list[User]:
    return [user for user in users if user.is_active]

# Bad: Clever but confusing
def get_active_users(u):
    return [x for x in u if x.a]
```

### Explicit is Better Than Implicit
Avoid magic; be clear about what your code does.

### EAFP - Easier to Ask Forgiveness Than Permission
```python
# Good: EAFP style
try:
    return dictionary[key]
except KeyError:
    return default_value
```

## Type Hints

### Modern Type Hints (Python 3.9+)
```python
def process_items(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}
```

### Protocol-Based Duck Typing
```python
from typing import Protocol

class Renderable(Protocol):
    def render(self) -> str: ...

def render_all(items: list[Renderable]) -> str:
    return "\n".join(item.render() for item in items)
```

## Error Handling

### Specific Exceptions
```python
def load_config(path: str) -> Config:
    try:
        with open(path) as f:
            return Config.from_json(f.read())
    except FileNotFoundError as e:
        raise ConfigError(f"Config file not found: {path}") from e
    except json.JSONDecodeError as e:
        raise ConfigError(f"Invalid JSON in config: {path}") from e
```

### Custom Exception Hierarchy
```python
class AppError(Exception):
    pass

class ValidationError(AppError):
    pass

class NotFoundError(AppError):
    pass
```

## Context Managers

```python
from contextlib import contextmanager

@contextmanager
def timer(name: str):
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"{name} took {elapsed:.4f} seconds")
```

## Data Classes

```python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class User:
    id: str
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

    def __post_init__(self):
        if "@" not in self.email:
            raise ValueError(f"Invalid email: {self.email}")
```

## Concurrency Patterns

### Threading for I/O-Bound
```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(fetch_url, urls))
```

### Multiprocessing for CPU-Bound
```python
from concurrent.futures import ProcessPoolExecutor

with ProcessPoolExecutor() as executor:
    results = list(executor.map(process_data, datasets))
```

### Async/Await
```python
async def fetch_all(urls: list[str]) -> list[str]:
    tasks = [fetch_async(url) for url in urls]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

## Package Organization

```
myproject/
+-- src/
|   +-- mypackage/
|       +-- __init__.py
|       +-- main.py
|       +-- api/
|       +-- models/
|       +-- utils/
+-- tests/
|   +-- conftest.py
|   +-- test_api.py
|   +-- test_models.py
+-- pyproject.toml
```

## Python Tooling

```bash
black .              # Code formatting
isort .              # Import sorting
ruff check .         # Linting
mypy .               # Type checking
pytest --cov=pkg     # Testing with coverage
bandit -r .          # Security scanning
pip-audit            # Dependency vulnerabilities
```

## Anti-Patterns to Avoid

```python
# Bad: Mutable default arguments
def append_to(item, items=[]):  # Shared across calls!

# Good: Use None
def append_to(item, items=None):
    if items is None:
        items = []

# Bad: Bare except
except:
    pass

# Good: Specific exception
except SpecificError as e:
    logger.error(f"Operation failed: {e}")

# Bad: type() for type checking
if type(obj) == list:

# Good: isinstance
if isinstance(obj, list):
```

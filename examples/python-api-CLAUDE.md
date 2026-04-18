# CLAUDE.md

## What

Python API service built with FastAPI. Handles [describe domain] operations.

## Where

```
project-root/
├── app/
│   ├── main.py          # FastAPI application entry
│   ├── routes/           # API route handlers
│   ├── models/           # Pydantic models + SQLAlchemy ORM
│   ├── services/         # Business logic layer
│   ├── middleware/        # Auth, CORS, rate limiting
│   └── config.py         # Settings from environment variables
├── tests/
│   ├── conftest.py       # Shared fixtures
│   ├── test_routes/      # Route-level integration tests
│   └── test_services/    # Unit tests for business logic
├── alembic/              # Database migrations
├── pyproject.toml        # Project config + dependencies
└── CLAUDE.md
```

## How

### Stack

- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0 (async)
- **DB**: PostgreSQL
- **Tests**: pytest + httpx (async test client)
- **Migrations**: Alembic

### Development Workflow

```bash
# Run tests
pytest --cov=app --cov-report=term-missing

# Run dev server (always in tmux)
tmux new -s api
uvicorn app.main:app --reload

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

### Conventions

- All SQL uses parameterized queries via SQLAlchemy ORM
- Input validation happens in Pydantic models at the route layer
- Business logic lives in `services/`, not in route handlers
- Auth middleware checks run before route handlers
- Every endpoint has rate limiting configured
- Tests mock at system boundaries (DB, external HTTP), never internal modules

### Environment

All configuration comes from environment variables. Never hardcode:
- `DATABASE_URL` -- PostgreSQL connection string
- `SECRET_KEY` -- JWT signing key
- `ALLOWED_ORIGINS` -- CORS whitelist

---
name: database-migrations
description: Database migration best practices for schema changes, data migrations, rollbacks, and zero-downtime deployments across PostgreSQL and common ORMs.
origin: ECC
---

# Database Migration Patterns

Safe, reversible database schema changes for production systems.

## When to Activate

- Creating or altering database tables
- Adding/removing columns or indexes
- Running data migrations (backfill, transform)
- Planning zero-downtime schema changes
- Setting up migration tooling for a new project

## Core Principles

1. **Every change is a migration** -- never alter production databases manually
2. **Migrations are forward-only in production** -- rollbacks use new forward migrations
3. **Schema and data migrations are separate** -- never mix DDL and DML in one migration
4. **Test migrations against production-sized data** -- a migration that works on 100 rows may lock on 10M
5. **Migrations are immutable once deployed** -- never edit a migration that has run in production

## Migration Safety Checklist

- [ ] Migration has both UP and DOWN (or is explicitly marked irreversible)
- [ ] No full table locks on large tables (use concurrent operations)
- [ ] New columns have defaults or are nullable
- [ ] Indexes created concurrently
- [ ] Data backfill is a separate migration from schema change
- [ ] Tested against a copy of production data
- [ ] Rollback plan documented

## PostgreSQL Patterns

### Adding a Column Safely

```sql
-- Good: Nullable column, no lock
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Good: Column with default (Postgres 11+ is instant)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Bad: NOT NULL without default (requires full rewrite, locks table)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
```

### Adding an Index Without Downtime

```sql
-- Bad: Blocks writes on large tables
CREATE INDEX idx_users_email ON users (email);

-- Good: Non-blocking
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

### Renaming a Column (Zero-Downtime)

Use the expand-contract pattern:

```sql
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Step 2: Backfill data (separate migration)
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- Step 3: Update application code to read/write both columns

-- Step 4: Drop old column
ALTER TABLE users DROP COLUMN username;
```

### Large Data Migrations

```sql
-- Bad: Updates all rows in one transaction
UPDATE users SET normalized_email = LOWER(email);

-- Good: Batch update
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users WHERE normalized_email IS NULL
      LIMIT batch_size FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## ORM Migration Workflows

### Prisma

```bash
npx prisma migrate dev --name add_user_avatar   # Create migration
npx prisma migrate deploy                        # Apply in production
```

### Drizzle

```bash
npx drizzle-kit generate    # Generate migration
npx drizzle-kit migrate     # Apply migrations
```

### Django

```bash
python manage.py makemigrations    # Generate from model changes
python manage.py migrate           # Apply migrations
```

### golang-migrate

```bash
migrate create -ext sql -dir migrations -seq add_user_avatar
migrate -path migrations -database "$DATABASE_URL" up
```

## Zero-Downtime Migration Strategy

```
Phase 1: EXPAND
  - Add new column/table (nullable or with default)
  - Deploy: app writes to BOTH old and new
  - Backfill existing data

Phase 2: MIGRATE
  - Deploy: app reads from NEW, writes to BOTH
  - Verify data consistency

Phase 3: CONTRACT
  - Deploy: app only uses NEW
  - Drop old column/table in separate migration
```

## Anti-Patterns

| Anti-Pattern | Better Approach |
|-------------|-----------------|
| Manual SQL in production | Always use migration files |
| Editing deployed migrations | Create new migration instead |
| NOT NULL without default | Add nullable, backfill, then constrain |
| Inline index on large table | CREATE INDEX CONCURRENTLY |
| Schema + data in one migration | Separate migrations |
| Dropping column before removing code | Remove code first, drop next deploy |

---
name: api-design
description: REST API design patterns including resource naming, status codes, pagination, filtering, error responses, versioning, and rate limiting for production APIs.
origin: ECC
---

# API Design Patterns

Conventions and best practices for designing consistent, developer-friendly REST APIs.

## When to Activate

- Designing new API endpoints
- Reviewing existing API contracts
- Adding pagination, filtering, or sorting
- Implementing error handling for APIs
- Planning API versioning strategy

## Resource Design

### URL Structure

```
# Resources are nouns, plural, lowercase, kebab-case
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id

# Sub-resources for relationships
GET    /api/v1/users/:id/orders

# Actions that don't map to CRUD (use verbs sparingly)
POST   /api/v1/orders/:id/cancel
POST   /api/v1/auth/login
```

## HTTP Methods and Status Codes

### Status Code Reference

```
# Success
200 OK                    -- GET, PUT, PATCH (with response body)
201 Created               -- POST (include Location header)
204 No Content            -- DELETE, PUT (no response body)

# Client Errors
400 Bad Request           -- Validation failure, malformed JSON
401 Unauthorized          -- Missing or invalid authentication
403 Forbidden             -- Authenticated but not authorized
404 Not Found             -- Resource doesn't exist
409 Conflict              -- Duplicate entry, state conflict
422 Unprocessable Entity  -- Semantically invalid
429 Too Many Requests     -- Rate limit exceeded

# Server Errors
500 Internal Server Error -- Unexpected failure (never expose details)
503 Service Unavailable   -- Temporary overload, include Retry-After
```

## Response Format

### Success Response

```json
{
  "data": {
    "id": "abc-123",
    "email": "alice@example.com",
    "name": "Alice",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

### Collection Response (with Pagination)

```json
{
  "data": [...],
  "meta": {
    "total": 142,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  },
  "links": {
    "self": "/api/v1/users?page=1&per_page=20",
    "next": "/api/v1/users?page=2&per_page=20"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address", "code": "invalid_format" }
    ]
  }
}
```

## Pagination

### Offset-Based (Simple)

```
GET /api/v1/users?page=2&per_page=20
```

**Pros:** Easy to implement, supports "jump to page N"
**Cons:** Slow on large offsets, inconsistent with concurrent inserts

### Cursor-Based (Scalable)

```
GET /api/v1/users?cursor=eyJpZCI6MTIzfQ&limit=20
```

**Pros:** Consistent performance, stable with concurrent inserts
**Cons:** Cannot jump to arbitrary page

| Use Case | Pagination Type |
|----------|----------------|
| Admin dashboards, small datasets | Offset |
| Infinite scroll, feeds, large datasets | Cursor |
| Public APIs | Cursor (default) |

## Filtering, Sorting, and Search

```
# Simple equality
GET /api/v1/orders?status=active

# Comparison operators
GET /api/v1/products?price[gte]=10&price[lte]=100

# Sorting (prefix - for descending)
GET /api/v1/products?sort=-created_at,price

# Full-text search
GET /api/v1/products?q=wireless+headphones

# Sparse fieldsets
GET /api/v1/users?fields=id,name,email
```

## Rate Limiting

```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

| Tier | Limit | Use Case |
|------|-------|----------|
| Anonymous | 30/min | Public endpoints |
| Authenticated | 100/min | Standard API access |
| Premium | 1000/min | Paid API plans |

## Versioning

```
# URL path versioning (recommended)
/api/v1/users
/api/v2/users
```

Non-breaking changes (adding fields, new optional params, new endpoints) don't need a new version. Breaking changes (removing/renaming fields, changing types) require a new version.

## API Design Checklist

- [ ] Resource URL follows naming conventions (plural, kebab-case, no verbs)
- [ ] Correct HTTP method used
- [ ] Appropriate status codes returned
- [ ] Input validated with schema (Zod, Pydantic, etc.)
- [ ] Error responses follow standard format
- [ ] Pagination implemented for list endpoints
- [ ] Authentication required (or explicitly marked as public)
- [ ] Authorization checked
- [ ] Rate limiting configured
- [ ] Response does not leak internal details

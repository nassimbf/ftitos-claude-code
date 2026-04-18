---
name: backend-patterns
description: Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes.
origin: ECC
---

# Backend Development Patterns

Backend architecture patterns and best practices for scalable server-side applications.

## When to Activate

- Designing REST or GraphQL API endpoints
- Implementing repository, service, or controller layers
- Optimizing database queries (N+1, indexing, connection pooling)
- Adding caching (Redis, in-memory, HTTP cache headers)
- Setting up background jobs or async processing
- Structuring error handling and validation for APIs
- Building middleware (auth, logging, rate limiting)

## API Design Patterns

### RESTful API Structure

```typescript
GET    /api/items                 # List resources
GET    /api/items/:id             # Get single resource
POST   /api/items                 # Create resource
PUT    /api/items/:id             # Replace resource
PATCH  /api/items/:id             # Update resource
DELETE /api/items/:id             # Delete resource

GET /api/items?status=active&sort=volume&limit=20&offset=0
```

### Repository Pattern

```typescript
interface ItemRepository {
  findAll(filters?: ItemFilters): Promise<Item[]>
  findById(id: string): Promise<Item | null>
  create(data: CreateItemDto): Promise<Item>
  update(id: string, data: UpdateItemDto): Promise<Item>
  delete(id: string): Promise<void>
}
```

### Service Layer Pattern

```typescript
class ItemService {
  constructor(private itemRepo: ItemRepository) {}

  async searchItems(query: string, limit: number = 10): Promise<Item[]> {
    const embedding = await generateEmbedding(query)
    const results = await this.vectorSearch(embedding, limit)
    const items = await this.itemRepo.findByIds(results.map(r => r.id))
    return items.sort((a, b) => {
      const scoreA = results.find(r => r.id === a.id)?.score || 0
      const scoreB = results.find(r => r.id === b.id)?.score || 0
      return scoreA - scoreB
    })
  }
}
```

### Middleware Pattern

```typescript
export function withAuth(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    try {
      const user = await verifyToken(token)
      req.user = user
      return handler(req, res)
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}
```

## Database Patterns

### N+1 Query Prevention

```typescript
// Bad: N+1 query problem
const items = await getItems()
for (const item of items) {
  item.creator = await getUser(item.creator_id)
}

// Good: Batch fetch
const items = await getItems()
const creatorIds = items.map(m => m.creator_id)
const creators = await getUsers(creatorIds)
const creatorMap = new Map(creators.map(c => [c.id, c]))
items.forEach(item => {
  item.creator = creatorMap.get(item.creator_id)
})
```

## Caching Strategies

### Cache-Aside Pattern

```typescript
async function getItemWithCache(id: string): Promise<Item> {
  const cacheKey = `item:${id}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const item = await db.items.findUnique({ where: { id } })
  if (!item) throw new Error('Item not found')

  await redis.setex(cacheKey, 300, JSON.stringify(item))
  return item
}
```

## Error Handling Patterns

### Centralized Error Handler

```typescript
class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
  }
}

export function errorHandler(error: unknown, req: Request): Response {
  if (error instanceof ApiError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode })
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 })
  }
  console.error('Unexpected error:', error)
  return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
}
```

### Retry with Exponential Backoff

```typescript
async function fetchWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError!
}
```

## Authentication & Authorization

### Role-Based Access Control

```typescript
type Permission = 'read' | 'write' | 'delete' | 'admin'

const rolePermissions: Record<string, Permission[]> = {
  admin: ['read', 'write', 'delete', 'admin'],
  moderator: ['read', 'write', 'delete'],
  user: ['read', 'write']
}

export function hasPermission(user: User, permission: Permission): boolean {
  return rolePermissions[user.role].includes(permission)
}
```

## Rate Limiting

```typescript
class RateLimiter {
  private requests = new Map<string, number[]>()

  async checkLimit(identifier: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    const recentRequests = requests.filter(time => now - time < windowMs)
    if (recentRequests.length >= maxRequests) return false
    recentRequests.push(now)
    this.requests.set(identifier, recentRequests)
    return true
  }
}
```

## Structured Logging

```typescript
class Logger {
  log(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...context }))
  }
}
```

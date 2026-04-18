---
name: coding-standards
description: Universal coding standards, best practices, and patterns for TypeScript, JavaScript, React, and Node.js development.
origin: ECC
---

# Coding Standards & Best Practices

Universal coding standards applicable across all projects.

## When to Activate

- Starting a new project or module
- Reviewing code for quality and maintainability
- Refactoring existing code to follow conventions
- Enforcing naming, formatting, or structural consistency
- Setting up linting, formatting, or type-checking rules
- Onboarding new contributors to coding conventions

## Code Quality Principles

### 1. Readability First
- Code is read more than written
- Clear variable and function names
- Self-documenting code preferred over comments
- Consistent formatting

### 2. KISS (Keep It Simple)
- Simplest solution that works
- Avoid over-engineering
- No premature optimization
- Easy to understand > clever code

### 3. DRY (Don't Repeat Yourself)
- Extract common logic into functions
- Create reusable components
- Share utilities across modules

### 4. YAGNI (You Aren't Gonna Need It)
- Don't build features before they're needed
- Avoid speculative generality
- Start simple, refactor when needed

## TypeScript/JavaScript Standards

### Variable Naming

```typescript
// GOOD: Descriptive names
const searchQuery = 'election'
const isUserAuthenticated = true
const totalRevenue = 1000

// BAD: Unclear names
const q = 'election'
const flag = true
const x = 1000
```

### Function Naming

```typescript
// GOOD: Verb-noun pattern
async function fetchItemData(itemId: string) { }
function calculateSimilarity(a: number[], b: number[]) { }
function isValidEmail(email: string): boolean { }

// BAD: Unclear or noun-only
async function item(id: string) { }
function similarity(a, b) { }
```

### Immutability Pattern (CRITICAL)

```typescript
// ALWAYS use spread operator
const updatedUser = { ...user, name: 'New Name' }
const updatedArray = [...items, newItem]

// NEVER mutate directly
user.name = 'New Name'  // BAD
items.push(newItem)     // BAD
```

### Error Handling

```typescript
// GOOD: Comprehensive error handling
async function fetchData(url: string) {
  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Fetch failed:', error)
    throw new Error('Failed to fetch data')
  }
}
```

### Async/Await Best Practices

```typescript
// GOOD: Parallel execution when possible
const [users, items, stats] = await Promise.all([
  fetchUsers(),
  fetchItems(),
  fetchStats()
])

// BAD: Sequential when unnecessary
const users = await fetchUsers()
const items = await fetchItems()
const stats = await fetchStats()
```

### Type Safety

```typescript
// GOOD: Proper types
interface Item {
  id: string
  name: string
  status: 'active' | 'resolved' | 'closed'
  created_at: Date
}

function getItem(id: string): Promise<Item> {
  // Implementation
}

// BAD: Using 'any'
function getItem(id: any): Promise<any> {
  // Implementation
}
```

## React Best Practices

### Component Structure

```typescript
interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary'
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  )
}
```

### Custom Hooks

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
```

### State Management

```typescript
const [count, setCount] = useState(0)

// GOOD: Functional update for state based on previous state
setCount(prev => prev + 1)

// BAD: Direct state reference (can be stale in async scenarios)
setCount(count + 1)
```

## API Design Standards

### REST API Conventions

```
GET    /api/items              # List all items
GET    /api/items/:id          # Get specific item
POST   /api/items              # Create new item
PUT    /api/items/:id          # Update item (full)
PATCH  /api/items/:id          # Update item (partial)
DELETE /api/items/:id          # Delete item

# Query parameters for filtering
GET /api/items?status=active&limit=10&offset=0
```

### Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```

### Input Validation

```typescript
import { z } from 'zod'

const CreateItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  endDate: z.string().datetime(),
  categories: z.array(z.string()).min(1)
})
```

## Code Smell Detection

### 1. Long Functions
```typescript
// BAD: Function > 50 lines — split into smaller functions
function processData() {
  const validated = validateData()
  const transformed = transformData(validated)
  return saveData(transformed)
}
```

### 2. Deep Nesting
```typescript
// BAD: 5+ levels of nesting
// GOOD: Early returns
if (!user) return
if (!user.isAdmin) return
if (!item) return
// Do something
```

### 3. Magic Numbers
```typescript
// BAD: Unexplained numbers
if (retryCount > 3) { }

// GOOD: Named constants
const MAX_RETRIES = 3
if (retryCount > MAX_RETRIES) { }
```

---

**Remember**: Code quality is not negotiable. Clear, maintainable code enables rapid development and confident refactoring.

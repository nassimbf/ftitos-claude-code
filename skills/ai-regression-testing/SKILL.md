---
name: ai-regression-testing
description: Regression testing strategies for AI-assisted development. Catch systematic blind spots where the same model writes and reviews code.
origin: ECC
---

# AI Regression Testing

Testing patterns designed for AI-assisted development, where the same model writes code and reviews it -- creating systematic blind spots that only automated tests can catch.

## When to Activate

- AI agent has modified API routes or backend logic
- A bug was found and fixed -- need to prevent re-introduction
- Running bug-check workflows after code changes
- Multiple code paths exist (sandbox vs production, feature flags)

## The Core Problem

When an AI writes code and then reviews its own work, it carries the same assumptions into both steps:

```
AI writes fix -> AI reviews fix -> AI says "looks correct" -> Bug still exists
```

## Common AI Regression Patterns

### Pattern 1: Sandbox/Production Path Mismatch

Most common (observed in 3 out of 4 regressions):

```typescript
// FAIL: AI adds field to production path only
if (isSandboxMode()) {
  return { data: { id, email, name } };  // Missing new field
}
return { data: { id, email, name, notification_settings } };

// PASS: Both paths return the same shape
if (isSandboxMode()) {
  return { data: { id, email, name, notification_settings: null } };
}
return { data: { id, email, name, notification_settings } };
```

### Pattern 2: SELECT Clause Omission

Common when adding new columns:

```typescript
// FAIL: New column added to response but not to SELECT
const { data } = await db.from("users").select("id, email, name").single();
return { data: { ...data, notification_settings: data.notification_settings } };
// notification_settings is always undefined
```

### Pattern 3: Error State Leakage

```typescript
// FAIL: Error state set but old data not cleared
catch (err) {
  setError("Failed to load");
  // items still shows data from previous view
}

// PASS: Clear related state on error
catch (err) {
  setItems([]);
  setError("Failed to load");
}
```

### Pattern 4: Optimistic Update Without Rollback

```typescript
// FAIL: No rollback on failure
const handleRemove = async (id: string) => {
  setItems(prev => prev.filter(i => i.id !== id));
  await fetch(`/api/items/${id}`, { method: "DELETE" });
};

// PASS: Capture previous state and rollback on failure
const handleRemove = async (id: string) => {
  const prevItems = [...items];
  setItems(prev => prev.filter(i => i.id !== id));
  try {
    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("API error");
  } catch {
    setItems(prevItems);
  }
};
```

## Testing Strategy

Write tests for bugs that were found, not for code that works:

```typescript
const REQUIRED_FIELDS = [
  "id", "email", "full_name", "phone", "role",
  "created_at", "avatar_url", "notification_settings",
];

describe("GET /api/user/profile", () => {
  it("returns all required fields", async () => {
    const res = await GET(createTestRequest("/api/user/profile"));
    const { status, json } = await parseResponse(res);
    expect(status).toBe(200);
    for (const field of REQUIRED_FIELDS) {
      expect(json.data).toHaveProperty(field);
    }
  });
});
```

## Bug-Check Workflow

```
1. Run automated tests (npm test)
   -> FAIL = Bug found mechanically
   -> PASS = Continue

2. Run build check (npm run build)
   -> FAIL = Type error found mechanically
   -> PASS = Continue

3. AI code review (with known blind spots in mind)

4. For each fix, write a regression test
```

## Quick Reference

| AI Regression Pattern | Test Strategy | Priority |
|---|---|---|
| Sandbox/production mismatch | Assert same response shape in all modes | High |
| SELECT clause omission | Assert all required fields in response | High |
| Error state leakage | Assert state cleanup on error | Medium |
| Missing rollback | Assert state restored on API failure | Medium |

## DO / DON'T

**DO:**
- Write tests immediately after finding a bug
- Test the API response shape, not the implementation
- Run tests as the first step of every bug-check
- Name tests after the bug they prevent

**DON'T:**
- Trust AI self-review as a substitute for automated tests
- Skip sandbox path testing because "it's just mock data"
- Aim for coverage percentage -- aim for regression prevention

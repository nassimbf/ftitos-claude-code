---
name: code-review
description: AI-powered code review patterns. Use when reviewing code changes, checking code quality, finding bugs or security issues, or running fix-review cycles.
origin: ECC
---

# Code Review

AI-powered code review patterns for autonomous development workflows.

## When to Use

- Review code changes or staged/uncommitted changes
- Check code quality, find bugs, or security issues
- PR review or pull request feedback
- Implement a feature and review it
- Fix issues found in review

## How to Review

### 1. Run Automated Checks First

Before any manual review, run:

```bash
# Build check (type errors)
npm run build    # or equivalent

# Lint check
npm run lint     # or equivalent

# Test suite
npm test         # or equivalent
```

If automated checks fail, report as highest priority. Only proceed to manual review if all pass.

### 2. Review Focus Areas

1. **Sandbox / production path consistency** -- same response shapes in all code paths
2. **API response shape matches frontend expectations** -- fields present in both
3. **SELECT clause completeness** -- new columns included in queries
4. **Error handling with rollback** -- optimistic updates recover on failure
5. **Security** -- auth checks, input validation, injection prevention

### 3. Present Results

Group findings by severity:
- **Critical**: Blocks ship (security, data loss, auth bypass)
- **High**: Should fix before merge (logic errors, missing validation)
- **Medium**: Improve when convenient (code quality, naming)

### 4. Fix-Review Cycle

For autonomous workflows:

1. Implement the requested feature
2. Run automated checks
3. Review code for issues
4. Fix each issue systematically
5. Re-run checks and review until clean

## Review Checklist

- [ ] All automated checks pass (build, lint, test)
- [ ] No hardcoded secrets or credentials
- [ ] Input validated at system boundaries
- [ ] Error handling present for all I/O operations
- [ ] No N+1 query patterns introduced
- [ ] Response shapes consistent across code paths
- [ ] Destructive actions have confirmation
- [ ] New code has corresponding tests

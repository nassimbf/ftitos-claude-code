# Aegis Audit Domains

Each domain represents a distinct lens through which the codebase is evaluated. Specialist agents focus on one domain at a time, producing findings specific to their area.

## 1. Architecture

**Focus**: System structure, layer boundaries, dependency management.

**What it checks**:
- Layer separation: are concerns properly isolated?
- Dependency direction: do dependencies flow inward (clean architecture)?
- Coupling: are modules tightly coupled where they should not be?
- Cohesion: do modules contain related functionality?
- Interface boundaries: are public APIs well-defined?
- Circular dependencies: are there import cycles?

**Common findings**:
- God module that handles too many concerns
- Business logic leaking into presentation or infrastructure layers
- Missing abstraction at system boundaries

---

## 2. Correctness

**Focus**: Logic errors, edge cases, data integrity.

**What it checks**:
- Calculation accuracy: are formulas and computations correct?
- Edge cases: empty inputs, null values, boundary conditions
- Data transformations: are conversions lossless where required?
- State machines: are all transitions valid? Are terminal states reachable?
- Error propagation: do errors surface correctly or get swallowed?

**Common findings**:
- Off-by-one errors in pagination or indexing
- Floating-point arithmetic used for financial calculations
- Missing null checks on optional data paths

---

## 3. Security

**Focus**: Vulnerabilities, attack surface, data protection.

**What it checks**:
- Authentication bypass: missing auth checks, privilege escalation
- Injection: SQL, NoSQL, OS command, template injection
- Secrets exposure: hardcoded keys, tokens, passwords
- XSS vectors: unescaped user input, innerHTML usage
- CSRF: missing tokens on state-mutating endpoints
- SSRF: user-controlled URLs passed to server-side HTTP clients
- Deserialization: untrusted data without integrity checks
- Cryptographic strength: weak algorithms, missing encryption

**Common findings**:
- API endpoint missing authorization middleware
- User input concatenated into SQL query string
- API key in source code instead of environment variable

---

## 4. Performance

**Focus**: Efficiency under load, resource usage.

**What it checks**:
- N+1 queries: ORM calls inside loops
- Unbounded iteration: loops over uncapped result sets
- Missing indexes: filter/sort columns without index coverage
- Memory leaks: event listeners not cleaned up, growing caches
- Bundle size: large dependencies imported without tree-shaking
- Connection pooling: new connections per request
- Caching: repeated identical queries within a request

**Common findings**:
- Database query inside a for loop (should use prefetch or batch)
- Collection endpoint returning all records without pagination
- Missing index on a frequently-filtered column

---

## 5. Compliance

**Focus**: Regulatory requirements, standards adherence.

This domain is project-specific. The scope document defines which standards apply.

**Examples**:
- HGB/IDW PS 200 compliance for audit software
- GDPR data handling for EU user data
- PCI DSS for payment processing
- SOC 2 controls for SaaS platforms

**What it checks**:
- Are required controls implemented?
- Are audit trails maintained?
- Is sensitive data handled according to the standard?
- Are retention policies enforced?

---

## 6. Testing

**Focus**: Test coverage, quality, reliability.

**What it checks**:
- Coverage gaps: new code paths without tests
- Edge cases: empty input, boundary values, error paths not covered
- Flaky patterns: time-dependent assertions, random data without seeds
- Assertion quality: tests that pass trivially
- Test isolation: shared mutable state between tests
- Mock boundaries: internal modules mocked instead of system boundaries

**Common findings**:
- New function with zero test coverage
- Test that mocks an internal module, hiding real integration behavior
- Time-dependent assertion that fails intermittently

---

## 7. Maintainability

**Focus**: Code quality, readability, long-term health.

**What it checks**:
- Function size: exceeding 50 lines
- File size: exceeding 800 lines
- Nesting depth: logic nested more than 3 levels deep
- Naming clarity: abbreviations, single-letter variables, misleading names
- Dead code: unused variables, unreachable branches, commented-out blocks
- DRY violations: duplicated logic across multiple locations
- Error handling: unhandled promise rejections, swallowed errors

**Common findings**:
- 200-line function doing five different things
- Commented-out code block left in production
- Three copies of the same validation logic in different files

---

## 8. Data Integrity

**Focus**: Schema consistency, migration safety, referential integrity.

**What it checks**:
- Migration reversibility: does it have a working rollback?
- Data loss risk: column drops, type narrowing without backup
- Zero-downtime compatibility: schema changes backward-compatible with deployed code?
- Foreign key constraints: added with NOT VALID on large tables?
- Default values: new NOT NULL columns given defaults for existing rows?
- Sequence gaps: serial/auto-increment resets introduced by migration logic

**Common findings**:
- Migration drops a column without backup step
- NOT NULL constraint added to populated table without default value
- Foreign key added without NOT VALID (full table scan on large tables)

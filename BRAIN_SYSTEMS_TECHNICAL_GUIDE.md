# The 4-Brain System: Technical Guide

**For:** Technical professionals who want to understand how Claude Code's brain systems work
**Complexity:** Advanced concepts explained in accessible language
**Date:** April 2026

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Brain System 1: GBrain (WHO+WHY)](#brain-system-1-gbrain-whowhy)
3. [Brain System 2: Graphify (WHAT+HOW)](#brain-system-2-graphify-whathow)
4. [Brain System 3: GitNexus (WHERE+IMPACT)](#brain-system-3-gitnexus-whereimpact)
5. [Brain System 4: Engram (LEARNED)](#brain-system-4-engram-learned)
6. [How They Work Together](#how-they-work-together)
7. [Technical Deep Dives](#technical-deep-dives)
8. [Practical Examples](#practical-examples)

---

## Overview & Architecture

### The Problem They Solve

When you're building software, you need to answer 5 fundamental questions:
- **WHO**: Who did what, when, with whom? (people, companies, context)
- **WHAT**: What concepts are involved? How do they relate?
- **WHERE**: Where in the codebase does X live? What calls it?
- **IMPACT**: What breaks if I change X? (blast radius)
- **LEARNED**: What have we decided before? (memory, patterns)

Traditional development relies on scattered documentation, search tools, and human memory. The 4-brain system turns these into queryable, interconnected knowledge engines.

### The 4 Engines

| Brain | Purpose | Data Source | Query Type | Latency |
|-------|---------|-------------|-----------|---------|
| **GBrain** | People, companies, relationships, context | External APIs, user input, relationships | Natural language about people/orgs | ~500ms |
| **Graphify** | Concepts, connections, communities | Code AST, semantic analysis, obsidian | Concept queries, architecture questions | ~1-2s |
| **GitNexus** | Code structure, impact analysis, execution flows | Git history, AST, static analysis | "what calls X?", "what will break?" | ~2-5s |
| **Engram** | Session memory, decisions, learnings | JSON files, previous sessions | "what did we decide?", "last session" | <50ms |

### The Routing Logic (Brain Command)

When you run `/brain <query>`, the system:

1. **Analyzes intent** — classifies the question into one of 6 categories
2. **Routes to the right engine(s)** — could be 1 brain or all 4 in parallel
3. **Executes the query** — uses engine-specific APIs/tools
4. **Merges results** — deduplicates and presents unified answer
5. **Attributes sources** — shows which brain(s) answered

**Intent Classification:**

```
Query Pattern                          → Routes To
─────────────────────────────────────────────────
"who is...", "tell me about [person]" → GBrain
"how does X work?", "what calls Y?"    → GitNexus
"impact of", "what will break?"        → GitNexus
"what concepts relate to X?"           → Graphify
"shortest path between A and B?"       → Graphify
"what did we decide about?"            → Engram
"remember when", "last session"        → Engram
"search" or ambiguous                  → All 4 (parallel)
```

---

## Brain System 1: GBrain (WHO+WHY)

### What It Does

GBrain is a **persistent knowledge graph of people and organizations**. It answers "who?" questions and provides context about relationships, decisions, and history.

Think of it as a structured social graph + decision log combined.

### Architecture

**Data Structure:**
- **Pages** — individual entities (person, company)
- **Properties** — attributes (name, email, title, company)
- **Timeline** — events (met on [date], decided [thing] on [date])
- **Relationships** — connections (works at, reports to, decided with)

**Storage:**
- Default: `~/.gbrain/` directory (local markdown/JSON files)
- Optional: Remote sync to cloud storage
- Format: Structured markdown with frontmatter

**Indexing:**
- Incremental (new entries added as you create them)
- Searchable via full-text + property queries
- Can be queried offline

### How It Works

**Query Flow:**

```
User Query: "who is Sarah Chen?"
    ↓
GBrain parser: Is this a person lookup?
    ↓
Find matching page: ~/.gbrain/people/sarah-chen.md
    ↓
Extract properties (name, title, company, email)
Extract timeline (meetings, decisions, interactions)
    ↓
Merge with relationships (colleagues, mentors, direct reports)
    ↓
Return compiled truth + timeline
```

**Key Capabilities:**

| Capability | How It Works |
|-----------|-------------|
| **Lookup** | Full-text search across person/company pages |
| **Relationships** | Graph traversal (works at, reports to, decided with) |
| **Timeline** | Chronological event log per entity |
| **Context** | Compiled summary of most recent info |

### Data Model Example

```markdown
# Sarah Chen

## Properties
- Title: VP Engineering
- Company: Acme Inc
- Email: sarah@acme.com
- Started: 2023-01-15

## Timeline

### 2026-04-18
- Decided: API versioning strategy (with: John, Alex)
- Meeting: Q2 roadmap planning

### 2026-04-10
- Decided: Microservices split (database per service)

### 2026-03-01
- Joined company

## Relationships
- Reports to: CEO (Jane Smith)
- Direct reports: John Doe, Alex Kumar
- Mentors: Bob Johnson (previous manager)
```

### When to Use GBrain

- **Before a big decision:** "Who should we consult on this?"
- **Onboarding context:** "Tell me about the people on this project"
- **Finding past decisions:** "What did Sarah decide about caching?"
- **Understanding relationships:** "Who reports to whom?"
- **Meeting prep:** "What do we know about the client stakeholders?"

---

## Brain System 2: Graphify (WHAT+HOW)

### What It Does

Graphify is a **semantic knowledge graph of concepts and their relationships**. It answers "what concepts exist?" and "how are they connected?"

Think of it as a structured Wikipedia + Obsidian graph combined. It shows not just nodes (concepts) but also their connections (relationships) and communities (clusters).

### Architecture

**Data Structure:**
- **Nodes** — concepts (Authentication, Caching, API Gateway)
- **Edges** — relationships (uses, depends-on, similar-to, implements)
- **Communities** — clusters of highly-connected nodes (found via Leiden algorithm)
- **God Nodes** — highly connected hubs (like "authentication" might connect to 30+ concepts)

**Storage:**
- Primary: `graphify-out/` directory
- Files: `GRAPH.json` (nodes + edges), `COMMUNITIES.md`, `REPORT.md`
- Format: JSON + Markdown
- Updates: Incremental (semantic pass on code changes)

**Indexing:**
- **AST-based:** Extracts concepts from code structure
- **Semantic-based:** Uses embeddings to find implicit relationships
- **User-driven:** Manual concept additions via prompts

### How It Works

**Build Flow:**

```
Code Repository
    ↓
AST Analysis
  ├─ Extract types, functions, classes
  ├─ Identify modules and boundaries
  └─ Build initial concept nodes
    ↓
Relationship Detection
  ├─ imports → "depends-on"
  ├─ inheritance → "implements"
  ├─ calls → "uses"
  └─ type systems → "compatible-with"
    ↓
Semantic Analysis (Optional)
  ├─ Calculate embeddings for each concept
  ├─ Find implicit relationships
  └─ Suggest new connections
    ↓
Community Detection (Leiden Algorithm)
  ├─ Group highly-connected nodes
  ├─ Calculate cohesion scores
  └─ Label communities by role
    ↓
Output: GRAPH.json + COMMUNITIES.md + REPORT.md
```

**Query Flow:**

```
User Query: "what concepts relate to authentication?"
    ↓
Search GRAPH.json for concept matching "authentication"
    ↓
Find node + all edges (incoming/outgoing)
    ↓
Walk the graph (depth-limited) to find related concepts
    ↓
Rank by connection strength (how many hops away)
    ↓
Return: central concept + nearest neighbors + path explanations
```

### Key Capabilities

| Capability | How It Works |
|-----------|-------------|
| **Concept Search** | Find nodes by name/keyword |
| **Relationship Queries** | "What does X depend on?" → walk edges |
| **Shortest Path** | Find shortest connection between 2 concepts |
| **Community Analysis** | "What's in the Auth community?" → walk cluster |
| **God Nodes** | "What's most important?" → rank by edge count |
| **Architecture Views** | "Show me communities" → visual clustering |

### Data Model Example

```json
{
  "nodes": [
    {
      "id": "auth-jwt",
      "label": "JWT Authentication",
      "type": "pattern",
      "community": "security"
    },
    {
      "id": "middleware",
      "label": "Express Middleware",
      "type": "concept",
      "community": "http"
    }
  ],
  "edges": [
    {
      "from": "auth-jwt",
      "to": "middleware",
      "type": "implements",
      "strength": 0.95
    }
  ],
  "communities": [
    {
      "id": "security",
      "label": "Security & Auth",
      "nodes": ["auth-jwt", "oauth2", "cors"],
      "cohesion": 0.92
    }
  ]
}
```

### When to Use Graphify

- **Architecture understanding:** "What's the structure of this codebase?"
- **Design decisions:** "What patterns are we using?"
- **Knowledge sharing:** "How do these concepts connect?"
- **Concept queries:** "What's related to payments?"
- **Community analysis:** "What's in the 'database' community?"
- **Impact planning:** "If we change this concept, what else touches it?"

---

## Brain System 3: GitNexus (WHERE+IMPACT)

### What It Does

GitNexus is a **code-level knowledge graph** that understands your codebase structure at the symbol level (functions, classes, types). It answers "where is X?" and "what breaks if I change X?"

Think of it as an IDE's symbol navigation + impact analysis, but queryable and persistent.

### Architecture

**Data Structure:**
- **Symbols** — functions, classes, methods, types
- **Files** — source files
- **Relationships** — CALLS, IMPORTS, EXTENDS, IMPLEMENTS, ACCESSES, HAS_METHOD, HAS_PROPERTY
- **Processes** — execution flows (chains of calls from entry point to terminal)
- **Communities** — functional areas (detected via Leiden algorithm on the call graph)

**Storage:**
- Primary: `.gitnexus/` directory in each repo
- Index: `symbols.json` (all symbols + metadata), `relationships.json` (all edges)
- Format: JSON
- Staleness tracking: Compare indexed commit vs HEAD

**Indexing:**
- **AST-based:** Parse source code to extract definitions
- **Flow-based:** Build call graphs via static analysis
- **Process detection:** Identify execution flows from entry points
- **Incremental:** Only re-index changed files

### How It Works

**Index Flow:**

```
Source Code Repository
    ↓
AST Parsing (per file)
  ├─ Extract function/class definitions
  ├─ Extract type signatures
  └─ Extract import statements
    ↓
Reference Resolution
  ├─ Match function calls to definitions
  ├─ Match imports to source files
  └─ Match class extensions/implementations
    ↓
Build Symbol Graph
  ├─ Create nodes for each symbol
  ├─ Create edges for relationships
  └─ Calculate metadata (line number, return type, etc.)
    ↓
Process Detection
  ├─ Find entry points (main, exports, API handlers)
  ├─ Trace call chains from entry to terminal
  └─ Build process DAGs (directed acyclic graphs)
    ↓
Community Detection (Leiden Algorithm)
  ├─ Group highly-connected symbols
  ├─ Label by functional area (Auth, Database, HTTP, etc.)
    ↓
Output: symbols.json + relationships.json + processes.json
```

**Context Query (e.g., "how does X work?"):**

```
User Query: "show me how validateUser works"
    ↓
Lookup symbol: validateUser in symbols.json
    ↓
Get metadata: file path, signature, return type
    ↓
Find incoming edges (CALLS) — who calls validateUser?
    ↓
Find outgoing edges (CALLS) — what does validateUser call?
    ↓
Find processes that include validateUser
    ↓
Return:
  - Symbol definition + location
  - Callers (with counts)
  - Callees (dependency tree)
  - Processes it participates in
  - Community it belongs to
```

**Impact Query (e.g., "what breaks if I change X?"):**

```
User Query: "impact of changing validateUser"
    ↓
Lookup symbol: validateUser
    ↓
Find all CALLS edges pointing TO validateUser (callers)
    ↓
For each caller, walk upstream (depth-limited, e.g., 3 hops)
    ↓
Categorize by depth:
  - Depth 1: Direct callers (will definitely break)
  - Depth 2: Callers of callers (likely affected)
  - Depth 3: Higher order (may be affected)
    ↓
Calculate risk:
  - Count of affected symbols
  - Criticality (is it in a process? how many processes?)
  - Type (CALLS vs IMPLEMENTS — more breaking if IMPLEMENTS)
    ↓
Return:
  - Risk level (LOW/MEDIUM/HIGH/CRITICAL)
  - Affected symbols grouped by depth
  - Affected processes
  - Affected modules
```

### Key Capabilities

| Capability | How It Works |
|-----------|-------------|
| **Symbol Lookup** | Find function/class definition + location |
| **Call Graph** | "What calls X?" → traverse CALLS edges |
| **Impact Analysis** | "What breaks if I change X?" → upstream walk |
| **Process Tracing** | "What execution flow includes X?" → process lookup |
| **Community Context** | "What functional area is X in?" → community membership |
| **Architecture View** | "Show me the whole structure" → all communities |
| **Dead Code Detection** | "What has no callers?" → symbols with no incoming edges |

### Data Model Example

```json
{
  "symbols": [
    {
      "name": "validateUser",
      "type": "function",
      "file": "src/auth/validation.ts",
      "line": 42,
      "signature": "(user: User) => boolean",
      "community": "Auth",
      "exports": false
    }
  ],
  "relationships": [
    {
      "from": "LoginHandler",
      "to": "validateUser",
      "type": "CALLS",
      "confidence": 1.0
    },
    {
      "from": "auth-validation",
      "to": "validateUser",
      "type": "EXPORTS",
      "confidence": 1.0
    }
  ],
  "processes": [
    {
      "name": "UserLogin",
      "entryPoint": "LoginHandler",
      "steps": ["LoginHandler", "validateUser", "generateToken"],
      "terminal": "sendToken"
    }
  ]
}
```

### When to Use GitNexus

- **Understanding code:** "How does feature X work?"
- **Before refactoring:** "What will break if I rename this function?"
- **Code review:** "What execution flows will be affected?"
- **Finding bugs:** "What calls this broken function?"
- **Architecture decisions:** "What's the dependency structure?"
- **Dead code detection:** "What's not being called?"
- **Performance analysis:** "What processes are slowest?"

---

## Brain System 4: Engram (LEARNED)

### What It Does

Engram is a **persistent session memory system** that remembers decisions, learnings, patterns, and observations across sessions. It answers "what did we decide?" and "what have we learned?"

Think of it as a structured decision log + pattern database + learning system combined.

### Architecture

**Data Structure:**
- **Observations** — individual facts, decisions, patterns, learnings
- **Sessions** — time-bounded work units (one coding session, one week, one project)
- **Topics** — semantic groupings (auth, caching, api-design)
- **Metadata** — scope (project vs global), type (decision/bugfix/pattern), creation date

**Storage:**
- Primary: `/Users/theftitostai.lung.2026/.claude/projects/-Users-theftitostai-lung-2026/memory/`
- Files: `MEMORY.md` (current session snapshot), individual `.json` files (one per observation)
- Format: JSON + Markdown
- Persistence: Survives session boundaries (auto-loaded on session start)

**Indexing:**
- **By keyword** — full-text search across observation content
- **By type** — filter by decision/bugfix/pattern/architecture/discovery/learning
- **By scope** — project-scoped vs global learnings
- **By date** — temporal queries ("what did we learn last week?")
- **By topic** — grouped by semantic topic (upserting with topic_key)

### How It Works

**Save Flow (Auto-triggered):**

```
Developer completes task or learns something
    ↓
Call mem_save() with:
  - title: short, searchable title
  - content: structured What/Why/Where/Learned format
  - type: decision|architecture|bugfix|pattern|discovery|learning
  - scope: project|global
  - topic_key: optional (for upserts)
    ↓
System checks for existing observation with same topic_key
    ↓
If found: UPDATE (keep history, merge observations)
If not found: CREATE (new observation)
    ↓
Write to file: .claude/projects/.../memory/{id}.json
    ↓
Auto-index: add to keyword index, type index, topic index
    ↓
Return: observation ID for future reference
```

**Query Flow (Search):**

```
User Query: "what did we decide about API versioning?"
    ↓
mem_search(query="API versioning", type="decision")
    ↓
Keyword search: find observations matching "API" OR "versioning"
    ↓
Filter by type: keep only "decision" observations
    ↓
Rank by relevance:
  - Exact phrase match highest
  - Keyword match lower
  - Temporal: recent first
    ↓
Limit to recent observations (default: 20)
    ↓
Return: list of matching observations with snippets
```

**Context Flow (Session Start):**

```
New session starts
    ↓
mem_context(project="current-project", limit=20)
    ↓
Find all observations for this project scope
    ↓
Sort by date (most recent first)
    ↓
Return: last 20 observations (decisions, learnings, patterns)
    ↓
Display to user: "Here's what you learned last time"
```

**Session Summary (Session End — MANDATORY):**

```
User runs mem_session_summary() at end of session
    ↓
Provide structured summary:
  - Goal: what were you building?
  - Discoveries: what did you learn?
  - Accomplished: what did you finish?
  - Relevant Files: what did you change?
    ↓
System archives summary + creates session record
    ↓
Session is closed (can't add observations to it)
    ↓
Next session can reference this one
```

### Key Capabilities

| Capability | How It Works |
|-----------|-------------|
| **Save Observation** | Mem_save with title, content, type |
| **Search Memory** | Full-text search + type filter + ranking |
| **Get Context** | Get recent observations for a project |
| **Topic Upsert** | Save with topic_key → updates existing if found |
| **Session Summary** | Summarize a bounded work unit |
| **Cross-Session** | Observations survive and are searchable across sessions |
| **Scope Control** | Separate project-scoped from global learnings |

### Data Model Example

```json
{
  "id": "global-003",
  "title": "JWT Auth Middleware Pattern",
  "type": "pattern",
  "scope": "global",
  "topic_key": "patterns/jwt-auth-middleware",
  "created": "2026-04-15T10:30:00Z",
  "updated": "2026-04-18T14:22:00Z",
  "content": "**What**: Implemented JWT auth as Express middleware that validates token and injects user to request.body\n**Why**: Separates auth logic from route handlers, allows reuse across endpoints\n**Where**: src/middleware/auth.ts, src/routes/\n**Learned**: Must set httpOnly and secure flags on cookie, refresh tokens need separate rotation logic",
  "keywords": ["jwt", "auth", "middleware", "express"],
  "sessions": ["session-2026-04-15", "session-2026-04-18"]
}
```

### When to Use Engram

- **"What did we decide?"** — Search past decisions before making new ones
- **"Did we try this before?"** — Check if pattern was attempted
- **"How did we solve this?"** — Find past solutions to similar problems
- **"Context switching back"** — Load last session's learnings
- **"New team member onboarding"** — Share accumulated decisions + patterns
- **"Avoiding repeating mistakes"** — Track what didn't work
- **"Building institutional knowledge"** — Document and search learnings

---

## How They Work Together

### The Unified Query Router (`/brain`)

When you ask `/brain <query>`, the system:

1. **Classifies intent** (who/what/where/impact/learned)
2. **Routes to appropriate brain(s)**
3. **Runs queries in parallel** (if multi-brain)
4. **Merges results** with deduplication
5. **Attributes sources** to each answer

### Example: Building a New Feature

```
Developer: "I want to add OAuth to the login flow"

Route 1: GBrain
  Query: "who should we consult on OAuth?"
  Answer: Sarah Chen (VP Eng) decided on JWT before, but might support OAuth

Route 2: GitNexus
  Query: "where is the auth code? what calls login?"
  Answer: src/auth/handlers.ts, called from 3 routes, affects LoginProcess

Route 3: Graphify
  Query: "what concepts relate to authentication?"
  Answer: Auth community has 12 concepts, OAuth would extend it

Route 4: Engram
  Query: "what did we decide about auth?"
  Answer: JWT chosen for scalability, decision was to avoid third-party providers

Result: "You should involve Sarah, impact will be moderate, you'll need to extend the Auth community, consider the previous decision about third-party providers"
```

### Design Patterns

**Pattern 1: Context Gathering**
```
mem_context(project)          # Get recent learnings
  ↓ (feeds into)
brain how does X work         # Understand code (GitNexus)
  ↓ (informs)
brain what concepts           # Architecture view (Graphify)
  ↓
make decision with full context
```

**Pattern 2: Impact Analysis**
```
brain impact of changing X    # Blast radius (GitNexus)
  ↓ (feeds into)
brain who should approve      # Get stakeholders (GBrain)
  ↓ (with context)
mem_save(decision)            # Log the decision (Engram)
```

**Pattern 3: Knowledge Inheritance**
```
new developer joins
  ↓
mem_context(project)          # Load project history
  ↓
brain search <topic>          # Explore related concepts
  ↓
brain who is <stakeholder>    # Understand people
  ↓
read decisions from mem_search
  ↓
ramp up quickly with context
```

---

## Technical Deep Dives

### Query Execution Model

All 4 brains use different execution models optimized for their data:

**GBrain: Lightweight & Fast**
- Data: Small (1-1000 people/orgs)
- Query: Direct lookup + timeline traversal
- Latency: <500ms
- Execution: Single-threaded (no concurrency needed)

**Graphify: Moderate & Flexible**
- Data: Medium (1000-10000 concepts)
- Query: BFS/DFS graph traversal
- Latency: 1-2s (concept queries) or 2-5s (semantic queries)
- Execution: Can parallelize multiple queries

**GitNexus: Heavy & Precise**
- Data: Large (10000-100000+ symbols per repo)
- Query: Multi-pass (definition lookup, edge traversal, process matching)
- Latency: 2-5s per query
- Execution: Optimized with indices, incremental updates

**Engram: Instant & Queryable**
- Data: Small-medium (100-10000 observations)
- Query: Keyword search + filtering
- Latency: <50ms (memory operations)
- Execution: In-memory indices, no I/O

### Memory & Staleness

Each brain handles updates differently:

**GBrain**
- Manual updates (user adds person, records decision)
- No automatic indexing
- Staleness: None (all manual)

**Graphify**
- Auto-detects code changes
- Incremental AST re-parsing on file changes
- Optional semantic re-pass (expensive)
- Staleness: Can be manually triggered (`/brain index`)

**GitNexus**
- Auto-detects git changes (via commit history)
- Incremental indexing (only changed symbols)
- Tracks staleness (compare indexed commit vs HEAD)
- Staleness: Reports "N commits behind HEAD"

**Engram**
- Manual saves (observations)
- Auto-archived on session end
- No staleness (all historical data kept)
- Staleness: None (immutable observations)

### Consistency Model

**Eventual Consistency**
- All 4 brains are eventually consistent (not strongly consistent)
- Changes to code are indexed asynchronously
- Queries may return slightly stale results
- Session start auto-recovers from last checkpoint

**Collision Handling**
- **GBrain**: Last-write-wins (manual updates)
- **Graphify**: Rebuild (overwrite old index with new)
- **GitNexus**: Merge (incremental, preserves old + adds new)
- **Engram**: Append (history is immutable, upsert via topic_key)

---

## Practical Examples

### Example 1: "Why is the API slow?"

**Step 1: Gather context**
```bash
/brain last session                    # Load recent work
```
Returns: Last session's learnings about API changes

**Step 2: Understand architecture**
```bash
/brain how does the API handler work
```
Returns: (GitNexus)
- API handler symbol + location
- What it calls (database queries, external services)
- All execution flows that include it
- Performance-sensitive code paths

**Step 3: Check for decisions**
```bash
/brain what did we decide about caching
```
Returns: (Engram)
- Previous decisions on caching
- Patterns tried before
- Why they were chosen/rejected

**Step 4: Identify bottleneck**
```bash
/brain impact of caching the database query
```
Returns: (GitNexus)
- All code that depends on that query
- How many processes it affects
- Risk level of adding caching

**Step 5: Log decision**
```bash
mem_save(
  title="Added caching to user query",
  type="decision",
  content="**What**: Add 5-min TTL cache to getUserById\n**Why**: API was 2s per request due to DB hits\n**Where**: src/handlers/api.ts\n**Learned**: Cache key must include user id, need invalidation on user update"
)
```

### Example 2: "Who should review this API change?"

**Step 1: Understand impact**
```bash
/brain impact of changing the user API
```
Returns: (GitNexus)
- 15 symbols affected
- 3 execution processes impacted
- Affects Auth + Database communities

**Step 2: Find stakeholders**
```bash
/brain who designed the user API
```
Returns: (GBrain)
- Sarah Chen (VP Eng, designed it)
- John Doe (current maintainer)
- Alex Kumar (uses it in payments)

**Step 3: Check related decisions**
```bash
/brain what did we decide about API versioning
```
Returns: (Engram)
- Decided to use /v2 for breaking changes
- Must maintain backward compatibility

**Step 4: Plan review**
- Assign Sarah (API designer) + John (maintainer)
- Check if breaking (it is) → use /v2
- Document decision + who reviewed it

### Example 3: "How do we auth users?"

**Step 1: Code structure**
```bash
/brain how does authentication work
```
Returns: (GitNexus)
- Auth module location
- Symbol structure (validateToken, generateJWT, verifySignature)
- All callers (login, protected routes, refresh token)
- Related processes

**Step 2: Concept understanding**
```bash
/brain what concepts relate to authentication
```
Returns: (Graphify)
- Auth community (12 concepts)
- Related: JWT, OAuth, CORS, Sessions
- Shortest path from Login to CORS validation

**Step 3: Implementation details**
```bash
/brain what did we decide about JWT
```
Returns: (Engram)
- JWT chosen for scalability (can scale horizontally)
- httpOnly + secure flags required
- 15min access token, 7-day refresh token
- No sessions (stateless)

**Step 4: Person context**
```bash
/brain who designed our auth system
```
Returns: (GBrain)
- Sarah Chen (designed it)
- Decided to use JWT instead of sessions
- Timeline of decisions

**Result:** Complete picture — code structure + architecture + decisions + responsible people + implementation details

---

## Key Insights

### Why 4 Separate Brains?

**1. Different Problem Spaces**
- Code changes frequently (GitNexus needs incremental indexing)
- Concepts are stable (Graphify can rebuild less often)
- Decisions are immutable (Engram just appends)
- People are semi-stable (GBrain manual updates)

**2. Different Query Patterns**
- "Where is X?" requires code structure (GitNexus)
- "What concepts?" requires semantic understanding (Graphify)
- "What did we decide?" requires history (Engram)
- "Who did it?" requires relationship tracking (GBrain)

**3. Different Performance Requirements**
- GitNexus: Must be fast for IDE-like queries (in-flight while coding)
- GBrain: Can be slower (decision context not needed mid-code)
- Engram: Must be instant (hot path in every session)
- Graphify: Moderate (used for planning, not coding)

### Integration Philosophy

The 4-brain system follows a **specialization** principle:
- **Each brain is a specialist** in one domain
- **Router (`/brain`) is the generalist** that knows which specialist to ask
- **Parallel execution** when possible (all 4 queries run at once)
- **Source attribution** so you know which brain answered

This is different from a monolithic knowledge graph (all-in-one). Monolithic would be:
- Slower (one index for 4 different purposes)
- Harder to maintain (4 different access patterns in 1 structure)
- Less flexible (can't optimize each for its use case)

---

## Limitations & Trade-offs

### GBrain Limitations
- Manual data entry (no automatic sync)
- Small scale (not for 1000+ people)
- Limited to text (no code understanding)
- Slow for relationship queries

### Graphify Limitations
- Concept extraction is heuristic-based (misses implicit relationships)
- Semantic pass is expensive (not run frequently)
- Can't understand business logic (only structure)
- Community detection is probabilistic

### GitNexus Limitations
- Static analysis only (misses dynamic behavior)
- Requires AST parsing (only works for indexed languages)
- Call graphs can be incomplete (dynamic dispatch)
- Impact analysis is conservative (overestimates risk)

### Engram Limitations
- Search is keyword-based (not semantic)
- No automatic learning (must manually save)
- Scope is session/project (no cross-project search)
- Type classification is manual

### When to Use Which

| Question | Brain | Why |
|----------|-------|-----|
| "What's the architecture?" | GitNexus + Graphify | Code structure + concepts |
| "What should I optimize?" | GitNexus | Impact analysis on call graph |
| "Who should review this?" | GBrain + GitNexus | People + impact |
| "Did we try this before?" | Engram | Decision history |
| "How do these ideas relate?" | Graphify | Concept connections |
| "What will break?" | GitNexus | Upstream walk |
| "What was I doing?" | Engram | Last session context |
| "How do I do X?" | Engram | Pattern search |

---

## Conclusion

The 4-brain system is a **knowledge infrastructure** that makes your codebase and project history queryable, persistent, and intelligent.

- **GBrain** = social graph + decision log (WHO + WHY)
- **Graphify** = concept graph + architecture (WHAT + HOW)
- **GitNexus** = code graph + impact (WHERE + IMPACT)
- **Engram** = session memory + learnings (LEARNED)

Together, they provide a **360-degree view** of your project—past, present, and structure—available at query time. This is fundamentally different from traditional tools that separate:
- Code from context
- History from present
- Architecture from decisions
- People from code

The `/brain` command is your unified interface to all of this knowledge, routing queries to the right specialist and merging results into actionable answers.


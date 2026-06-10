---
name: brain-merge
description: Unified bi-temporal knowledge graph over GBrain (PostgreSQL/pgvector) and Graphify (NetworkX/tree-sitter). Treats both stores as a single citation-addressable graph. Query with `brain query --unified "topic"`.
origin: ftitos-claude-code
---

# Brain Merge

Brain Merge treats GBrain and Graphify as two views over a single bi-temporal knowledge graph. GBrain holds compiled narrative truth, embeddings, and timeline entries for any content type (pages, files, media). Graphify holds structural code intelligence: AST-derived nodes, call edges, and semantic clusters. Both stores contribute to unified relevance ranking; neither is primary.

---

## Citation ID Format

Every entry surfaced from the unified graph carries a stable citation ID:

```
[BM:store:entity_id:timestamp]
```

| Segment | Values | Notes |
|---|---|---|
| `BM` | literal | Brain Merge namespace, distinguishes from `[mem:id]` (Engram) |
| `store` | `gbrain` or `graphify` | Origin store — preserved, never normalised away |
| `entity_id` | slug or node ID from the origin store | GBrain: `pages.slug`; Graphify: `node["id"]` as produced by `extract._make_id` |
| `timestamp` | ISO 8601 UTC to second precision | `created_at` from origin store; omit subseconds |

Example citations:

```
[BM:gbrain:fixed-assets-rollforward-spec:2026-05-23T14:00:00Z]
[BM:graphify:rollforward_node_compute_delta:2026-06-07T09:15:00Z]
```

Use the citation ID immediately after any claim drawn from the merged graph, exactly as `[mem:id]` is used for Engram observations. A future session that sees `[BM:gbrain:slug:ts]` can resolve it by querying the `brain_entries` table directly:

```sql
SELECT content FROM brain_entries
WHERE citation_id = '[BM:gbrain:fixed-assets-rollforward-spec:2026-05-23T14:00:00Z]';
```

---

## Ingestor Schema

The unified table `brain_entries` (defined in `scripts/brain-merge.sql`) holds one normalised row per knowledge unit regardless of origin:

```
{
  id          — surrogate BIGSERIAL PK (internal only)
  source      — "gbrain" | "graphify"
  entity_name — human-readable name: GBrain page title or Graphify node label
  content     — full text of the knowledge unit (compiled_truth, chunk_text, or node description)
  embedding   — vector(1536) — from text-embedding-3-large; NULL until embed job runs
  created_at  — TIMESTAMPTZ from origin store; never rewritten
  updated_at  — TIMESTAMPTZ from origin store; updated on content change
  citation_id — TEXT GENERATED ALWAYS — "[BM:source:entity_id:created_at_iso]"
  content_hash — SHA-256 hex of content — dedup key
}
```

The `graphify_to_brain_entries` view (also in `scripts/brain-merge.sql`) maps Graphify's on-disk JSON extraction format to this schema for use with `INSERT INTO brain_entries SELECT * FROM graphify_to_brain_entries`.

---

## 4-Step Merge Protocol

Run the merge protocol any time a new batch of entries is ingested into either store, or on a weekly cron. Steps are sequential; do not skip step 1 before step 4.

### Step 1 — Dedup by Content Hash

Prevent byte-for-byte duplicates from entering the unified store regardless of which origin produced them.

```sql
-- Only insert rows whose content_hash is not already present
INSERT INTO brain_entries (source, entity_name, content, embedding, created_at, updated_at, content_hash)
SELECT source, entity_name, content, embedding, created_at, updated_at, content_hash
FROM   staging_entries s
WHERE  NOT EXISTS (
  SELECT 1 FROM brain_entries b WHERE b.content_hash = s.content_hash
);
```

Hash is SHA-256 of `content` (UTF-8 bytes). Compute it at ingestion time, not during merge, so the column is always populated.

### Step 2 — Temporal Ordering

After dedup, order all entries for a given `entity_name` by `created_at ASC`. The oldest entry is the origin record; subsequent entries with the same `entity_name` are revisions. The most recent `updated_at` wins for content served to queries.

This is a read-time operation — no data is deleted. The `brain_entries` table is append-only except for embedding updates.

### Step 3 — Cross-Link by Entity Name Similarity

Link GBrain pages to Graphify nodes that refer to the same real-world entity. Uses trigram similarity on `entity_name`.

```sql
INSERT INTO brain_entry_links (from_id, to_id, link_type, similarity)
SELECT g.id, p.id, 'name_similar', similarity(g.entity_name, p.entity_name)
FROM   brain_entries g
JOIN   brain_entries p ON g.source = 'graphify' AND p.source = 'gbrain'
WHERE  similarity(g.entity_name, p.entity_name) > 0.4
  AND  NOT EXISTS (
    SELECT 1 FROM brain_entry_links l
    WHERE l.from_id = g.id AND l.to_id = p.id
  );
```

Threshold 0.4 is conservative. Tune upward (0.6) if false positives appear in `brain_entry_links`.

### Step 4 — pgvector Proximity Search for Latent Duplicates

Catch semantic duplicates that step 1 missed because content was paraphrased or reformatted.

```sql
-- Flag entry pairs with cosine distance < 0.08 (very high semantic overlap)
INSERT INTO brain_entry_links (from_id, to_id, link_type, similarity)
SELECT a.id, b.id, 'vector_near', 1 - (a.embedding <=> b.embedding)
FROM   brain_entries a
JOIN   brain_entries b ON a.id < b.id   -- avoid symmetric pairs
WHERE  a.embedding IS NOT NULL
  AND  b.embedding IS NOT NULL
  AND  a.source != b.source             -- only flag cross-store near-dupes
  AND  (a.embedding <=> b.embedding) < 0.08
  AND  NOT EXISTS (
    SELECT 1 FROM brain_entry_links l
    WHERE l.from_id = a.id AND l.to_id = b.id
  );
```

Pairs found here are candidates for manual review or automated content merge — they are not auto-deleted.

---

## Querying Across Both Stores

### CLI (conceptual — not implemented in GBrain/Graphify source)

```bash
brain query --unified "fixed assets rollforward"
```

Routes to both GBrain and Graphify, runs relevance scoring in each, then merges results by score before returning.

### Implementation in SQL

```sql
-- Unified relevance query: text search + vector similarity combined via RRF
WITH text_ranked AS (
  SELECT id, entity_name, content, citation_id,
         ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) AS text_score,
         ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) DESC) AS rn
  FROM   brain_entries
  WHERE  to_tsvector('english', content) @@ plainto_tsquery('english', $1)
),
vector_ranked AS (
  SELECT id, entity_name, content, citation_id,
         1 - (embedding <=> $2::vector) AS vec_score,
         ROW_NUMBER() OVER (ORDER BY embedding <=> $2::vector) AS rn
  FROM   brain_entries
  WHERE  embedding IS NOT NULL
),
rrf AS (
  SELECT COALESCE(t.id, v.id)           AS id,
         COALESCE(t.entity_name, v.entity_name) AS entity_name,
         COALESCE(t.content, v.content) AS content,
         COALESCE(t.citation_id, v.citation_id) AS citation_id,
         COALESCE(1.0 / (60 + t.rn), 0) + COALESCE(1.0 / (60 + v.rn), 0) AS rrf_score
  FROM   text_ranked t
  FULL OUTER JOIN vector_ranked v ON t.id = v.id
)
SELECT entity_name, content, citation_id, rrf_score
FROM   rrf
ORDER  BY rrf_score DESC
LIMIT  20;
```

`$1` is the query text; `$2` is the query embedding (pre-computed via `text-embedding-3-large`).

### Merge by Relevance Score

After both stores return results, merge by RRF score descending. When two rows have the same `entity_name` but different `source`, present the GBrain row as the primary result (richer narrative) and append the Graphify row as a structural cross-reference. Format:

```
[BM:gbrain:rollforward-spec:2026-05-23T14:00:00Z]
**Fixed Assets Rollforward Spec** — opening balance + additions + disposals must net
to closing balance exactly. Decimal arithmetic throughout.

  ↳ [BM:graphify:rollforward_node_compute_delta:2026-06-07T09:15:00Z]
     Graphify node: rollforward_node_compute_delta — calls depreciation_schedule, asset_register
```

---

## Hook Integration

`hooks/scripts/brain-merge-router.js` fires on `PostToolUse(Bash)` when `brain query` appears in the command. It logs every unified query to `~/.claude/brain-merge/query-log.jsonl` for KPI tracking (query volume, store distribution, latency proxies).

Enable by setting `BRAIN_MERGE_ENABLED=1` in your environment. Without this variable the hook exits immediately with code 0, adding zero overhead to every Bash call.

---

## Store Characteristics (Reference)

| Property | GBrain | Graphify |
|---|---|---|
| Primary data | Compiled narrative truth, timeline entries, file chunks | AST nodes, call edges, semantic clusters |
| Storage | PostgreSQL + pgvector | NetworkX JSON on disk, no persistent DB |
| Embeddings | `vector(1536)` per `content_chunks` row | None natively; provided by `brain_entries` after merge |
| Entity ID format | `pages.slug` (URL-safe kebab-case) | `node["id"]` — snake_lower from `extract._make_id` |
| Temporal columns | `created_at`, `updated_at` (TIMESTAMPTZ) | `captured_at` in frontmatter (ISO 8601 string) |
| Dedup mechanism | `content_hash` on `pages`; `UNIQUE(page_id, chunk_index)` on chunks | `seen_ids` set per file in extractor |

---

## When to Run the Merge

| Trigger | Action |
|---|---|
| New files synced to GBrain (`gbrain sync`) | Run steps 1–2 |
| `graphify --update` completes | Run steps 1–2 |
| Weekly (cron, Sunday 02:00) | Run full 4-step protocol |
| Manual: `brain merge --full` | Run full 4-step protocol |

The merge is idempotent. Re-running on already-merged data does nothing except burn a few milliseconds on the duplicate checks.

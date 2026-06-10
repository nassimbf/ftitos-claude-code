-- brain-merge.sql
-- Unified brain_entries table: single bi-temporal knowledge store over GBrain (PostgreSQL/pgvector)
-- and Graphify (NetworkX/tree-sitter AST). Neither store is modified by this schema.
-- Apply once against the GBrain database: psql $DATABASE_URL -f scripts/brain-merge.sql

-- Requires: pgvector and pg_trgm extensions (already present if GBrain schema was applied)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================================
-- brain_entries — unified ingestor table
-- ============================================================
-- One row per discrete knowledge unit, normalised from either store.
-- Bi-temporal: valid_at/invalid_at track fact validity; created_at/updated_at track row lifecycle.
-- Point-in-time queries: WHERE valid_at <= $ts AND (invalid_at IS NULL OR invalid_at > $ts)
-- Latest-fact queries: WHERE invalid_at IS NULL ORDER BY valid_at DESC

CREATE TABLE IF NOT EXISTS brain_entries (
  id           BIGSERIAL    PRIMARY KEY,
  source       TEXT         NOT NULL CHECK (source IN ('gbrain', 'graphify')),
  entity_name  TEXT         NOT NULL,
  content      TEXT         NOT NULL,
  embedding    vector(1536),
  created_at   TIMESTAMPTZ  NOT NULL,
  updated_at   TIMESTAMPTZ  NOT NULL,
  valid_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  invalid_at   TIMESTAMPTZ,
  content_hash TEXT         NOT NULL,
  citation_id  TEXT         GENERATED ALWAYS AS (
                 '[BM:' || source || ':' || entity_id || ':' ||
                 to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || ']'
               ) STORED,
  entity_id    TEXT         NOT NULL   -- pages.slug (gbrain) or node["id"] (graphify)
);

-- Prevent exact content duplicates regardless of origin store
CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_entries_content_hash
  ON brain_entries (content_hash);

-- Fast lookup by citation ID (the primary external reference)
CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_entries_citation_id
  ON brain_entries (citation_id);

-- Source filter (common in WHERE clauses)
CREATE INDEX IF NOT EXISTS idx_brain_entries_source
  ON brain_entries (source);

-- Bi-temporal validity range — used in point-in-time and latest-fact queries
CREATE INDEX IF NOT EXISTS idx_brain_entries_valid_at
  ON brain_entries (valid_at);

CREATE INDEX IF NOT EXISTS idx_brain_entries_invalid_at
  ON brain_entries (invalid_at)
  WHERE invalid_at IS NOT NULL;

-- Entity name — used for cross-link join (step 3) and text search
CREATE INDEX IF NOT EXISTS idx_brain_entries_entity_name
  ON brain_entries USING GIN (entity_name gin_trgm_ops);

-- pgvector IVFFlat cosine index — used in step 4 and unified queries
-- lists=100 is appropriate for up to ~1M rows; increase to 200 at 4M+
CREATE INDEX IF NOT EXISTS idx_brain_entries_embedding
  ON brain_entries USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search column (mirrors GBrain's pages.search_vector pattern)
ALTER TABLE brain_entries ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_brain_entries_search
  ON brain_entries USING GIN (search_vector);

-- Auto-populate search_vector on insert/update
CREATE OR REPLACE FUNCTION brain_entries_update_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.entity_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brain_entries_search ON brain_entries;
CREATE TRIGGER trg_brain_entries_search
  BEFORE INSERT OR UPDATE ON brain_entries
  FOR EACH ROW EXECUTE FUNCTION brain_entries_update_search_vector();


-- ============================================================
-- brain_entry_links — cross-store relationship table
-- ============================================================
-- Populated by steps 3 (name similarity) and 4 (vector proximity).
-- link_type: 'name_similar' | 'vector_near'

CREATE TABLE IF NOT EXISTS brain_entry_links (
  id          BIGSERIAL   PRIMARY KEY,
  from_id     BIGINT      NOT NULL REFERENCES brain_entries (id) ON DELETE CASCADE,
  to_id       BIGINT      NOT NULL REFERENCES brain_entries (id) ON DELETE CASCADE,
  link_type   TEXT        NOT NULL,
  similarity  REAL        NOT NULL CHECK (similarity BETWEEN 0 AND 1),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_id, to_id)
);

CREATE INDEX IF NOT EXISTS idx_brain_links_from ON brain_entry_links (from_id);
CREATE INDEX IF NOT EXISTS idx_brain_links_to   ON brain_entry_links (to_id);


-- ============================================================
-- graphify_to_brain_entries VIEW
-- ============================================================
-- Maps Graphify's on-disk JSON extraction format (imported via a staging table)
-- to the brain_entries schema. Graphify stores nodes as JSON objects:
--   { "id": "rollforward_node_compute_delta", "label": "rollforward_node_compute_delta()",
--     "type": "function", "source_location": "...", "description": "..." }
-- These are imported into graphify_nodes_staging (created below) before this view is used.
--
-- Usage:
--   INSERT INTO brain_entries (source, entity_id, entity_name, content, created_at, updated_at, content_hash)
--   SELECT source, entity_id, entity_name, content, created_at, updated_at, content_hash
--   FROM graphify_to_brain_entries
--   WHERE NOT EXISTS (
--     SELECT 1 FROM brain_entries b WHERE b.content_hash = graphify_to_brain_entries.content_hash
--   );

-- Staging table for raw Graphify node JSON (populated externally via COPY or psql \copy)
CREATE TABLE IF NOT EXISTS graphify_nodes_staging (
  id              TEXT         NOT NULL,
  label           TEXT,
  node_type       TEXT,
  source_location TEXT,
  description     TEXT,
  captured_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graphify_staging_id ON graphify_nodes_staging (id);

-- The view itself
CREATE OR REPLACE VIEW graphify_to_brain_entries AS
SELECT
  'graphify'                                                   AS source,
  g.id                                                         AS entity_id,
  coalesce(g.label, g.id)                                     AS entity_name,
  coalesce(
    g.description,
    g.node_type || ': ' || coalesce(g.label, g.id) ||
    coalesce(' [' || g.source_location || ']', '')
  )                                                            AS content,
  NULL::vector(1536)                                           AS embedding,
  g.captured_at                                                AS created_at,
  g.captured_at                                                AS updated_at,
  encode(
    digest(
      coalesce(g.description,
               g.node_type || ': ' || coalesce(g.label, g.id) ||
               coalesce(' [' || g.source_location || ']', '')),
      'sha256'
    ),
    'hex'
  )                                                            AS content_hash
FROM graphify_nodes_staging g;


-- ============================================================
-- gbrain_to_brain_entries VIEW
-- ============================================================
-- Maps GBrain's content_chunks table (which holds chunk_text + embeddings)
-- to the brain_entries schema. One row per chunk — more granular than pages.
-- Requires: this SQL runs in the same database as GBrain's schema.
--
-- Usage:
--   INSERT INTO brain_entries (source, entity_id, entity_name, content, embedding, created_at, updated_at, content_hash)
--   SELECT source, entity_id, entity_name, content, embedding, created_at, updated_at, content_hash
--   FROM gbrain_to_brain_entries
--   WHERE NOT EXISTS (
--     SELECT 1 FROM brain_entries b WHERE b.content_hash = gbrain_to_brain_entries.content_hash
--   );

CREATE OR REPLACE VIEW gbrain_to_brain_entries AS
SELECT
  'gbrain'                                  AS source,
  p.slug                                    AS entity_id,
  p.title || ' [chunk ' || c.chunk_index::text || ']' AS entity_name,
  c.chunk_text                              AS content,
  c.embedding                               AS embedding,
  p.created_at                              AS created_at,
  p.updated_at                              AS updated_at,
  encode(digest(c.chunk_text, 'sha256'), 'hex') AS content_hash
FROM content_chunks c
JOIN pages p ON p.id = c.page_id;

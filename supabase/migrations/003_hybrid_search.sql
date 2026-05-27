-- Migration: Add full-text search support for hybrid search
-- Adds a tsvector column and a combined hybrid search function

-- Add full-text search column
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_legal_chunks_fts ON legal_chunks USING gin(fts);

-- Hybrid search function: combines vector similarity + full-text keyword matching
-- Returns a blended score: (vector_weight * cosine_similarity) + (keyword_weight * keyword_rank)
CREATE OR REPLACE FUNCTION hybrid_search_legal_chunks(
  query_embedding vector(1536),
  query_text text,
  match_threshold float DEFAULT 0.2,
  match_count int DEFAULT 20,
  filter_act_name text DEFAULT NULL,
  vector_weight float DEFAULT 0.7,
  keyword_weight float DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  act_name TEXT,
  section_number TEXT,
  chapter TEXT,
  similarity float,
  keyword_rank float,
  hybrid_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      lc.id,
      lc.content,
      lc.act_name,
      lc.section_number,
      lc.chapter,
      1 - (lc.embedding <=> query_embedding) AS vector_similarity
    FROM legal_chunks lc
    WHERE
      (filter_act_name IS NULL OR lc.act_name = filter_act_name)
      AND 1 - (lc.embedding <=> query_embedding) > match_threshold
    ORDER BY lc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT
      lc.id,
      ts_rank_cd(lc.fts, plainto_tsquery('english', query_text)) AS kw_rank
    FROM legal_chunks lc
    WHERE
      (filter_act_name IS NULL OR lc.act_name = filter_act_name)
      AND lc.fts @@ plainto_tsquery('english', query_text)
  )
  SELECT
    vr.id,
    vr.content,
    vr.act_name,
    vr.section_number,
    vr.chapter,
    vr.vector_similarity AS similarity,
    COALESCE(kr.kw_rank, 0.0) AS keyword_rank,
    (vector_weight * vr.vector_similarity) + (keyword_weight * COALESCE(kr.kw_rank, 0.0)) AS hybrid_score
  FROM vector_results vr
  LEFT JOIN keyword_results kr ON vr.id = kr.id
  ORDER BY (vector_weight * vr.vector_similarity) + (keyword_weight * COALESCE(kr.kw_rank, 0.0)) DESC
  LIMIT match_count;
END;
$$;

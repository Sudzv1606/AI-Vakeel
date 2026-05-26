-- AI Vakeel Initial Schema Migration
-- Creates sessions table, legal_chunks table with pgvector, 
-- match_legal_chunks RPC function, and required indexes.
-- Requirements: 10.1, 12.1, 12.2, 12.3

-- =============================================================================
-- Sessions table
-- Stores pipeline execution sessions with agent outputs and metadata
-- =============================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  problem_description TEXT NOT NULL,
  original_language TEXT NOT NULL CHECK (original_language IN ('en', 'hi')),
  agent_outputs JSONB NOT NULL DEFAULT '{}',
  error JSONB,
  timing JSONB NOT NULL DEFAULT '{}',
  final_document TEXT,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100)
);

CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_status ON sessions(status);

-- =============================================================================
-- Legal knowledge base (pgvector)
-- Stores legal text chunks as vector embeddings for semantic search
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE legal_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1536),
  act_name TEXT NOT NULL,
  section_number TEXT NOT NULL,
  chapter TEXT NOT NULL,
  token_count INTEGER NOT NULL CHECK (token_count >= 200 AND token_count <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_legal_chunks_embedding ON legal_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_legal_chunks_act ON legal_chunks(act_name);

-- =============================================================================
-- Vector similarity search function
-- Used by Shodhak agent to find relevant legal sections via cosine similarity
-- =============================================================================
CREATE OR REPLACE FUNCTION match_legal_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_act_name text DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  act_name TEXT,
  section_number TEXT,
  chapter TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lc.id,
    lc.content,
    lc.act_name,
    lc.section_number,
    lc.chapter,
    1 - (lc.embedding <=> query_embedding) AS similarity
  FROM legal_chunks lc
  WHERE
    (filter_act_name IS NULL OR lc.act_name = filter_act_name)
    AND 1 - (lc.embedding <=> query_embedding) > match_threshold
  ORDER BY lc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

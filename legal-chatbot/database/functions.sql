-- Function to match laws using vector similarity - ĐÃ CẬP NHẬT THEO SCHEMA MỚI
CREATE OR REPLACE FUNCTION match_laws(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  so_hieu TEXT,
  noi_dung TEXT,
  loai_van_ban TEXT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE SQL
AS $$
  SELECT
    laws.id,
    laws.title,
    laws.so_hieu,
    laws.noi_dung,
    laws.loai_van_ban,
    laws.category,
    1 - (laws.embedding <=> query_embedding) AS similarity
  FROM laws
  WHERE laws.embedding IS NOT NULL
    AND 1 - (laws.embedding <=> query_embedding) > match_threshold
  ORDER BY laws.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to get law statistics
CREATE OR REPLACE FUNCTION get_law_stats()
RETURNS TABLE (
  total_laws BIGINT,
  total_queries BIGINT,
  recent_queries BIGINT
)
LANGUAGE SQL
AS $$
  SELECT
    (SELECT COUNT(*) FROM laws) AS total_laws,
    (SELECT COUNT(*) FROM query_logs) AS total_queries,
    (SELECT COUNT(*) FROM query_logs WHERE created_at >= NOW() - INTERVAL '7 days') AS recent_queries;
$$;

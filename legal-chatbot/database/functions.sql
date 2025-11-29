-- Function to match laws using vector similarity - ĐÃ CẬP NHẬT THEO SCHEMA MỚI
-- Cần drop function cũ trước khi tạo lại để tránh lỗi thay đổi return type
DROP FUNCTION IF EXISTS match_laws(vector, double precision, integer);

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
-- Cần drop function cũ trước khi tạo lại để tránh lỗi thay đổi return type
DROP FUNCTION IF EXISTS get_law_stats();

-- Tạo lại function với kiểu trả về mở rộng
CREATE OR REPLACE FUNCTION get_law_stats()
RETURNS TABLE (
  total_laws BIGINT,
  total_queries BIGINT,
  recent_queries BIGINT,
  active_users BIGINT,
  success_rate NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM laws) AS total_laws,
    (SELECT COUNT(*) FROM chat_messages WHERE role = 'user') AS total_queries,
    (SELECT COUNT(*) FROM chat_messages WHERE role = 'user' AND created_at >= NOW() - INTERVAL '7 days') AS recent_queries,
    (SELECT COUNT(DISTINCT user_id) FROM user_activities WHERE user_id IS NOT NULL AND created_at >= NOW() - INTERVAL '7 days') AS active_users,
    COALESCE(
      (
        SELECT ROUND(
          (COUNT(*) FILTER (WHERE response IS NOT NULL))::NUMERIC 
          / GREATEST(COUNT(*), 1) * 100,
          1
        )
        FROM query_logs
      ),
      0
    ) AS success_rate;
$$;

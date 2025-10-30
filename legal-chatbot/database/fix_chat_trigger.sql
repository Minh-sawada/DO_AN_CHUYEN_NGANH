-- Fix chat session trigger issue
-- Tạo function để tạo session trực tiếp mà không dùng trigger

-- Xóa trigger có vấn đề
DROP TRIGGER IF EXISTS create_chat_session_title_trigger ON chat_sessions;

-- Xóa function có vấn đề
DROP FUNCTION IF EXISTS create_chat_session_title();

-- Tạo function để tạo session mà không cần authentication
CREATE OR REPLACE FUNCTION create_session_without_auth(
  session_id UUID,
  session_title TEXT
)
RETURNS UUID AS $$
BEGIN
  -- Tạo session với user_id null để bypass RLS
  INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
  VALUES (session_id, NULL, session_title, NOW(), NOW());
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo function để lưu message mà không cần authentication
CREATE OR REPLACE FUNCTION save_message_without_auth(
  session_id UUID,
  message_role TEXT,
  message_content TEXT,
  message_sources JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_message_id UUID;
BEGIN
  -- Tạo message mới
  INSERT INTO chat_messages (session_id, role, content, sources, created_at)
  VALUES (session_id, message_role, message_content, message_sources, NOW())
  RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

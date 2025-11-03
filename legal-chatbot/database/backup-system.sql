-- =====================================================
-- COMPLETE BACKUP SYSTEM SETUP FOR SUPABASE
-- Chạy file này trong Supabase SQL Editor
-- =====================================================

-- 1. Tạo các bảng backup
-- =====================================================

-- Bảng backup_logs - theo dõi các lần backup
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('manual', 'scheduled', 'auto')),
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  encryption_key_hash VARCHAR(255), -- Hash của key, không lưu key thật
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'processing')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Bảng backup_settings - cấu hình backup
CREATE TABLE IF NOT EXISTS backup_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_backup_enabled BOOLEAN DEFAULT false,
  backup_frequency VARCHAR(20) DEFAULT 'daily' CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
  retention_days INTEGER DEFAULT 30 CHECK (retention_days > 0),
  encryption_enabled BOOLEAN DEFAULT true,
  max_backup_size_mb INTEGER DEFAULT 100 CHECK (max_backup_size_mb > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bảng backup_files - metadata file backup
CREATE TABLE IF NOT EXISTS backup_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_log_id UUID REFERENCES backup_logs(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL, -- Đường dẫn trong Supabase Storage
  file_type VARCHAR(50) DEFAULT 'json', -- json, sql, zip
  is_encrypted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tạo indexes để tối ưu performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON backup_logs(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_files_backup_log_id ON backup_files(backup_log_id);

-- 3. Tạo RLS policies cho bảo mật
-- =====================================================
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_files ENABLE ROW LEVEL SECURITY;

-- Policy cho backup_logs - chỉ admin mới xem được
CREATE POLICY "Admin can view backup logs" ON backup_logs
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admin can insert backup logs" ON backup_logs
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admin can update backup logs" ON backup_logs
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Policy cho backup_settings - chỉ admin mới quản lý được
CREATE POLICY "Admin can manage backup settings" ON backup_settings
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- Policy cho backup_files - chỉ admin mới xem được
CREATE POLICY "Admin can manage backup files" ON backup_files
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- 4. Tạo functions
-- =====================================================

-- Function để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function để cleanup old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  retention_days INTEGER;
BEGIN
  -- Lấy retention_days từ settings
  SELECT COALESCE(MAX(retention_days), 30) INTO retention_days
  FROM backup_settings;
  
  -- Xóa backup logs cũ hơn retention_days
  DELETE FROM backup_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND status = 'success';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function để get backup statistics
CREATE OR REPLACE FUNCTION get_backup_stats()
RETURNS TABLE (
  total_backups BIGINT,
  successful_backups BIGINT,
  failed_backups BIGINT,
  total_size_mb NUMERIC,
  last_backup_date TIMESTAMP WITH TIME ZONE,
  avg_backup_size_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_backups,
    COUNT(*) FILTER (WHERE status = 'success') as successful_backups,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_backups,
    ROUND(SUM(COALESCE(file_size, 0)) / 1024.0 / 1024.0, 2) as total_size_mb,
    MAX(created_at) as last_backup_date,
    ROUND(AVG(COALESCE(file_size, 0)) / 1024.0 / 1024.0, 2) as avg_backup_size_mb
  FROM backup_logs;
END;
$$ LANGUAGE plpgsql;

-- Function để tạo backup
CREATE OR REPLACE FUNCTION create_backup(
  p_backup_type VARCHAR(50),
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  backup_id UUID;
BEGIN
  INSERT INTO backup_logs (backup_type, file_name, created_by, status)
  VALUES (
    p_backup_type,
    'backup-' || to_char(NOW(), 'YYYY-MM-DD-HH24-MI-SS') || '-' || p_backup_type || '.json',
    p_created_by,
    'pending'
  )
  RETURNING id INTO backup_id;
  
  RETURN backup_id;
END;
$$ LANGUAGE plpgsql;

-- Function để export data
CREATE OR REPLACE FUNCTION export_backup_data()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'laws', (SELECT json_agg(row_to_json(laws)) FROM laws),
    'profiles', (SELECT json_agg(row_to_json(profiles)) FROM profiles),
    'query_logs', (SELECT json_agg(row_to_json(query_logs)) FROM query_logs),
    'chat_messages', (SELECT json_agg(row_to_json(chat_messages)) FROM chat_messages),
    'chat_sessions', (SELECT json_agg(row_to_json(chat_sessions)) FROM chat_sessions),
    'n8n_chat_histories', (SELECT json_agg(row_to_json(n8n_chat_histories)) FROM n8n_chat_histories),
    'backup_logs', (SELECT json_agg(row_to_json(backup_logs)) FROM backup_logs),
    'backup_settings', (SELECT json_agg(row_to_json(backup_settings)) FROM backup_settings),
    'exported_at', NOW(),
    'version', '1.1'  -- Updated version number
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function để kiểm tra tables (cho test script)
CREATE OR REPLACE FUNCTION get_backup_tables()
RETURNS TABLE (table_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT information_schema.tables.table_name::text
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('backup_logs', 'backup_settings', 'backup_files');
END;
$$ LANGUAGE plpgsql;

-- 5. Tạo triggers
-- =====================================================

-- Trigger cho backup_settings
CREATE TRIGGER update_backup_settings_updated_at
  BEFORE UPDATE ON backup_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Tạo Supabase Storage bucket cho backups
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false,
  52428800, -- 50MB limit (52428800 bytes = 50MB) - Giới hạn tối đa của Supabase
  ARRAY['application/json', 'application/zip', 'application/sql']
) ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 52428800,  -- Cập nhật limit lên 50MB nếu bucket đã tồn tại
    allowed_mime_types = ARRAY['application/json', 'application/zip', 'application/sql'];

-- 7. Tạo policy cho storage bucket
-- =====================================================
CREATE POLICY "Admin can manage backup files in storage" ON storage.objects
FOR ALL USING (
  bucket_id = 'backups' AND
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- 8. Insert default backup settings
-- =====================================================
INSERT INTO backup_settings (
  id,
  auto_backup_enabled,
  backup_frequency,
  retention_days,
  encryption_enabled,
  max_backup_size_mb
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  false,
  'daily',
  30,
  true,
  100
) ON CONFLICT (id) DO NOTHING;
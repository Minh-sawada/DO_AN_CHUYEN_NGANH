
-- =====================================================
-- COMPLETE DATABASE SETUP FOR LEGAL CHATBOT
-- Chạy file này trong Supabase SQL Editor
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Bảng laws - Lưu trữ văn bản pháp luật
-- =====================================================
DROP TABLE IF EXISTS laws CASCADE;
CREATE TABLE laws (
    id BIGSERIAL PRIMARY KEY,     -- ID tự tăng
    _id TEXT,                     -- ID từ nguồn dữ liệu gốc
    category TEXT,                -- Loại/danh mục văn bản
    danh_sach_bang TEXT,          -- Danh sách bảng
    link TEXT,                    -- Link tham chiếu
    loai_van_ban TEXT,            -- Loại văn bản
    ngay_ban_hanh TEXT,           -- Ngày ban hành
    ngay_cong_bao TEXT,           -- Ngày công báo
    ngay_hieu_luc TEXT,           -- Ngày hiệu lực
    nguoi_ky TEXT,                -- Người ký văn bản
    noi_ban_hanh TEXT,            -- Nơi ban hành
    noi_dung TEXT,                -- Nội dung văn bản (plain text)
    noi_dung_html TEXT,           -- Nội dung định dạng HTML
    so_cong_bao TEXT,             -- Số công báo
    so_hieu TEXT,                 -- Số hiệu văn bản
    thuoc_tinh_html TEXT,         -- Các thuộc tính HTML
    tinh_trang TEXT,              -- Tình trạng hiệu lực
    title TEXT,                   -- Tiêu đề văn bản
    tom_tat TEXT,                 -- Tóm tắt văn bản
    tom_tat_html TEXT,            -- Tóm tắt định dạng HTML
    van_ban_duoc_dan TEXT,        -- Văn bản được dẫn chiếu

    -- Vector cho tìm kiếm ngữ nghĩa (nếu bạn dùng pgvector)
    embedding VECTOR(1536),

    -- Dấu thời gian hệ thống
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng profiles - Quản lý người dùng
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bảng query_logs - Log truy vấn
-- =====================================================
CREATE TABLE IF NOT EXISTS query_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    query TEXT NOT NULL,
    response TEXT,
    matched_ids UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng backup_logs - Theo dõi các lần backup
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('manual', 'scheduled', 'auto')),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    encryption_key_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'processing')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Bảng backup_settings - Cấu hình backup
-- =====================================================
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

-- 6. Enable extensions
-- =====================================================
DO $$ 
BEGIN
    CREATE EXTENSION IF NOT EXISTS unaccent;
END $$;

-- 7. Tạo các functions
-- =====================================================
-- Function cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function tìm kiếm văn bản
DROP FUNCTION IF EXISTS match_laws(VECTOR(1536), FLOAT, INT);

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
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        laws.id,
        laws.title,
        laws.so_hieu,
        laws.noi_dung,
        laws.loai_van_ban,
        1 - (laws.embedding <=> query_embedding) AS similarity
    FROM laws
    WHERE laws.embedding IS NOT NULL 
    AND 1 - (laws.embedding <=> query_embedding) > match_threshold
    ORDER BY laws.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function cleanup old backups
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    retention_days INTEGER; 
BEGIN
    SELECT COALESCE(MAX(retention_days), 30) INTO retention_days FROM backup_settings;
    
    DELETE FROM backup_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days
    AND status = 'success';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function để export backup data
CREATE OR REPLACE FUNCTION export_backup_data()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'laws', (SELECT json_agg(row_to_json(laws)) FROM laws),
        'profiles', (SELECT json_agg(row_to_json(profiles)) FROM profiles),
        'query_logs', (SELECT json_agg(row_to_json(query_logs)) FROM query_logs),
        'backup_logs', (SELECT json_agg(row_to_json(backup_logs)) FROM backup_logs),
        'backup_settings', (SELECT json_agg(row_to_json(backup_settings)) FROM backup_settings),
        'exported_at', NOW(),
        'version', '1.0'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Tạo triggers
-- =====================================================
-- Xóa triggers cũ nếu tồn tại
DROP TRIGGER IF EXISTS update_laws_updated_at ON laws;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_backup_settings_updated_at ON backup_settings;

-- Tạo lại triggers
CREATE TRIGGER update_laws_updated_at
    BEFORE UPDATE ON laws
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_backup_settings_updated_at
    BEFORE UPDATE ON backup_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_settings ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS Policies
-- =====================================================
-- Drop existing policies first
DROP POLICY IF EXISTS "Laws are viewable by all users" ON laws;
DROP POLICY IF EXISTS "Only admins can insert laws" ON laws;
DROP POLICY IF EXISTS "Only admins can update laws" ON laws;
DROP POLICY IF EXISTS "Only admins can delete laws" ON laws;

-- Policies cho laws
CREATE POLICY "Laws are viewable by all users" ON laws
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert laws" ON laws
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

CREATE POLICY "Only admins can update laws" ON laws
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

CREATE POLICY "Only admins can delete laws" ON laws
    FOR DELETE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Only admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own queries" ON query_logs;
DROP POLICY IF EXISTS "Only admins can view all queries" ON query_logs;
DROP POLICY IF EXISTS "Only admins can manage backups" ON backup_logs;
DROP POLICY IF EXISTS "Only admins can manage backup settings" ON backup_settings;

-- Policies cho profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Only admins can view all profiles" ON profiles
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Policies cho query_logs
CREATE POLICY "Users can view their own queries" ON query_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only admins can view all queries" ON query_logs
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Policies cho backup
CREATE POLICY "Only admins can manage backups" ON backup_logs
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

CREATE POLICY "Only admins can manage backup settings" ON backup_settings
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- 11. Insert default backup settings
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
    true,
    'daily',
    30,
    true,
    100
) ON CONFLICT (id) DO NOTHING;

-- 12. Create storage bucket for backups
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'backups',
    'backups',
    false,
    104857600, -- 100MB limit
    ARRAY['application/json', 'application/zip', 'application/sql']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policy
CREATE POLICY "Only admins can manage backup files" ON storage.objects
    FOR ALL USING (
        bucket_id = 'backups' AND
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- 13. Create views
-- =====================================================
-- Drop existing view first
DROP VIEW IF EXISTS backup_status;

-- Create view
CREATE VIEW backup_status AS
SELECT 
    bl.id,
    bl.backup_type,
    bl.file_name,
    bl.status,
    bl.file_size,
    ROUND(bl.file_size / 1024.0 / 1024.0, 2) as file_size_mb,
    bl.created_at,
    bl.completed_at,
    bl.error_message,
    p.full_name as created_by_name
FROM backup_logs bl
LEFT JOIN profiles p ON bl.created_by = p.id
ORDER BY bl.created_at DESC;

-- =====================================================
-- HOÀN TẤT SETUP
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DATABASE SETUP COMPLETED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '- Laws table with full-text & vector search';
    RAISE NOTICE '- User profiles with RLS';
    RAISE NOTICE '- Query logging system';
    RAISE NOTICE '- Automated backup system';
    RAISE NOTICE '- Storage bucket for backups';
    RAISE NOTICE '========================================';
END $$;

-- 14. Create Indexes (sau khi tất cả bảng đã được tạo)
-- =====================================================
-- Indexes cho laws
CREATE INDEX IF NOT EXISTS idx_laws_loai_van_ban ON laws(loai_van_ban);
CREATE INDEX IF NOT EXISTS idx_laws_category ON laws(category);
CREATE INDEX IF NOT EXISTS idx_laws_so_hieu ON laws(so_hieu);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_laws_title_fts ON laws USING GIN (to_tsvector('simple', COALESCE(title, '')));
CREATE INDEX IF NOT EXISTS idx_laws_noi_dung_fts ON laws USING GIN (to_tsvector('simple', COALESCE(noi_dung, '')));

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_laws_embedding ON laws USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Indexes cho backup
CREATE INDEX IF NOT EXISTS idx_backup_logs_created_at ON backup_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_logs_status ON backup_logs(status);
CREATE INDEX IF NOT EXISTS idx_backup_logs_type ON backup_logs(backup_type);


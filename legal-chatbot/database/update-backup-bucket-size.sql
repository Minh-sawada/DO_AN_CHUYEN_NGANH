-- =====================================================
-- SCRIPT CẬP NHẬT KÍCH THƯỚC BACKUP BUCKET
-- Chạy file này nếu bucket backups đã được tạo với 5MB
-- =====================================================

-- Cập nhật file_size_limit của bucket backups lên 50MB (giới hạn tối đa của Supabase)
UPDATE storage.buckets
SET 
    file_size_limit = 52428800,  -- 50MB (52428800 bytes) - Giới hạn tối đa của Supabase
    allowed_mime_types = ARRAY['application/json', 'application/zip', 'application/sql']
WHERE id = 'backups';

-- Kiểm tra kết quả
DO $$
DECLARE
    current_limit BIGINT;
BEGIN
    SELECT file_size_limit INTO current_limit
    FROM storage.buckets
    WHERE id = 'backups';
    
    IF current_limit IS NULL THEN
        -- Nếu bucket chưa tồn tại, tạo mới
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'backups',
            'backups',
            false,
            52428800, -- 50MB (giới hạn tối đa của Supabase)
            ARRAY['application/json', 'application/zip', 'application/sql']
        );
        RAISE NOTICE '✅ Đã tạo bucket backups với limit 50MB';
    ELSE
        RAISE NOTICE '✅ Đã cập nhật bucket backups:';
        RAISE NOTICE '   - Limit hiện tại: % MB', current_limit / 1024 / 1024;
        IF current_limit < 52428800 THEN
            RAISE NOTICE '   - Đã tăng limit lên 50MB (giới hạn tối đa)';
        ELSE
            RAISE NOTICE '   - Limit đã đủ lớn (50MB - giới hạn tối đa của Supabase)';
        END IF;
    END IF;
END $$;

-- =====================================================
-- HOÀN TẤT
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CẬP NHẬT HOÀN TẤT!';
    RAISE NOTICE 'Bucket backups giờ có limit 50MB (giới hạn tối đa của Supabase)';
    RAISE NOTICE '========================================';
END $$;


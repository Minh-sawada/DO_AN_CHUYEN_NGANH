-- =====================================================
-- MIGRATION: Thêm cột avatar_url vào bảng profiles
-- Chạy file này trong Supabase SQL Editor nếu bảng profiles chưa có cột avatar_url
-- =====================================================

-- Kiểm tra và thêm cột avatar_url
DO $$ 
BEGIN
    -- Kiểm tra xem cột avatar_url đã tồn tại chưa
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN avatar_url TEXT;
        
        RAISE NOTICE '✅ Đã thêm cột avatar_url vào bảng profiles';
    ELSE
        RAISE NOTICE 'ℹ️ Cột avatar_url đã tồn tại, không cần thêm';
    END IF;
END $$;

-- =====================================================
-- HOÀN TẤT
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION HOÀN TẤT!';
    RAISE NOTICE 'Bảng profiles đã có cột avatar_url';
    RAISE NOTICE '========================================';
END $$;


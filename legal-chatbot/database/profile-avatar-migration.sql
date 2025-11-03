-- =====================================================
-- MIGRATION: Thêm avatar_url cho profiles
-- Chạy file này trong Supabase SQL Editor
-- =====================================================

-- 1. Thêm cột avatar_url vào bảng profiles (nếu chưa có)
-- =====================================================
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
        
        RAISE NOTICE 'Đã thêm cột avatar_url vào bảng profiles';
    ELSE
        RAISE NOTICE 'Cột avatar_url đã tồn tại, bỏ qua';
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


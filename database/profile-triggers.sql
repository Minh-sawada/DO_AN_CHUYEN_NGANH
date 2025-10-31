-- =====================================================
-- PROFILE TRIGGERS - Tự động quản lý profiles
-- Chạy file này trong Supabase SQL Editor
-- =====================================================

-- 1. Function tự động tạo profile khi user đăng ký
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function đồng bộ thông tin từ auth.users sang profiles
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Cập nhật full_name trong profiles nếu user metadata thay đổi
    UPDATE public.profiles
    SET 
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, full_name),
        updated_at = NOW()
    WHERE id = NEW.id;
    
    -- Nếu profile chưa tồn tại, tạo mới
    IF NOT FOUND THEN
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            'user'
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, profiles.full_name),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger tự động tạo profile khi user mới đăng ký
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Trigger đồng bộ thông tin user khi user được cập nhật
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data OR OLD.email IS DISTINCT FROM NEW.email)
    EXECUTE FUNCTION public.sync_user_profile();

-- 5. Trigger cập nhật updated_at cho profiles
-- =====================================================
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HOÀN TẤT
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PROFILE TRIGGERS ĐÃ ĐƯỢC TẠO!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Các triggers đã được tạo:';
    RAISE NOTICE '1. on_auth_user_created - Tự động tạo profile khi user đăng ký';
    RAISE NOTICE '2. on_auth_user_updated - Đồng bộ thông tin khi user được cập nhật';
    RAISE NOTICE '3. update_profiles_updated_at - Tự động cập nhật updated_at';
    RAISE NOTICE '========================================';
END $$;


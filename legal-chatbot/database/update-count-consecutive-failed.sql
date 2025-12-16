-- =====================================================
-- Cập nhật function count_recent_failed_logins để đếm LIÊN TIẾP
-- File này cập nhật function để chỉ đếm các lần đăng nhập sai liên tiếp
-- Chạy file này trên Supabase SQL Editor
-- =====================================================

-- Cập nhật function để đếm số lần đăng nhập sai LIÊN TIẾP (từ mới nhất về trước, dừng khi gặp lần thành công)
CREATE OR REPLACE FUNCTION count_recent_failed_logins(p_email TEXT, p_minutes INTEGER DEFAULT 15)
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    failed_count INTEGER;
BEGIN
    SELECT * INTO user_record
    FROM get_user_by_email(p_email);

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Đếm số lần đăng nhập sai LIÊN TIẾP (từ mới nhất về trước, dừng khi gặp lần thành công)
    WITH login_attempts AS (
        SELECT 
            action,
            created_at,
            ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
        FROM user_activities
        WHERE user_id = user_record.user_id
          AND activity_type = 'login'
          AND created_at > NOW() - (p_minutes || ' minutes')::INTERVAL
        ORDER BY created_at DESC
    ),
    consecutive_failed AS (
        SELECT 
            action,
            rn,
            CASE 
                WHEN action = 'user_login_failed' THEN 1
                ELSE 0
            END as is_failed,
            -- Tìm vị trí của lần đăng nhập thành công gần nhất
            MIN(CASE WHEN action = 'user_login_success' THEN rn ELSE NULL END) OVER () as last_success_pos
        FROM login_attempts
    )
    SELECT COUNT(*) INTO failed_count
    FROM consecutive_failed
    WHERE is_failed = 1
      AND (last_success_pos IS NULL OR rn < last_success_pos);

    RETURN COALESCE(failed_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Hướng dẫn:
-- =====================================================
-- 1. Chạy file này trên Supabase SQL Editor
-- 2. Function sẽ được cập nhật để đếm các lần sai LIÊN TIẾP
-- 3. Ví dụ:
--    - Login sai -> sai -> sai -> sai -> sai = 5 lần liên tiếp (sẽ ban)
--    - Login sai -> sai -> thành công -> sai -> sai = 2 lần liên tiếp (không ban)
-- =====================================================


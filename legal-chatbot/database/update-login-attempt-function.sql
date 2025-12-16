-- =====================================================
-- Update log_login_attempt function để thêm failed_attempts tracking
-- File này cập nhật function hiện có trong system-management.sql
-- Chạy file này trên Supabase SQL Editor
-- =====================================================

-- Bước 1: Tạo function đếm failed logins (nếu chưa có)
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

    -- Đếm số lần đăng nhập sai trong khoảng thời gian
    SELECT COUNT(*) INTO failed_count
    FROM user_activities
    WHERE user_id = user_record.user_id
      AND activity_type = 'login'
      AND action = 'user_login_failed'
      AND created_at > NOW() - (p_minutes || ' minutes')::INTERVAL;

    RETURN COALESCE(failed_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bước 2: Cập nhật function log_login_attempt để thêm failed_attempts
CREATE OR REPLACE FUNCTION log_login_attempt(
    p_email TEXT,
    p_success BOOLEAN,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    activity_id UUID;
    result JSON;
    ban_info RECORD;
    failed_attempts_count INTEGER;
BEGIN
    SELECT * INTO user_record
    FROM get_user_by_email(p_email);

    IF NOT FOUND THEN
        RETURN json_build_object(
            'user_exists', FALSE,
            'logged', FALSE,
            'message', 'User not found'
        );
    END IF;

    BEGIN
        activity_id := log_user_activity(
            user_record.user_id,
            'login',
            CASE WHEN p_success THEN 'user_login_success' ELSE 'user_login_failed' END,
            jsonb_build_object(
                'email', user_record.email,
                'success', p_success,
                'error', p_error_message
            ),
            p_ip_address,
            p_user_agent,
            CASE WHEN p_success THEN 'low' ELSE 'medium' END
        );

        -- Đếm số lần đăng nhập sai sau khi đã log (bao gồm cả lần vừa log)
        IF NOT p_success THEN
            SELECT count_recent_failed_logins(p_email, 15) INTO failed_attempts_count;
        ELSE
            -- Nếu đăng nhập thành công, reset failed attempts count
            failed_attempts_count := 0;
        END IF;

        result := json_build_object(
            'user_exists', TRUE,
            'logged', TRUE,
            'activity_id', activity_id,
            'user_id', user_record.user_id,
            'failed_attempts', failed_attempts_count
        );

        SELECT * INTO ban_info
        FROM check_user_ban_status(user_record.email);

        IF FOUND THEN
            result := result || json_build_object(
                'ban_status', json_build_object(
                    'is_banned', ban_info.is_banned,
                    'ban_type', ban_info.ban_type,
                    'reason', ban_info.reason,
                    'banned_until', ban_info.banned_until
                )
            );
        END IF;
    EXCEPTION WHEN others THEN
        result := json_build_object(
            'user_exists', TRUE,
            'logged', FALSE,
            'error', SQLERRM,
            'user_id', user_record.user_id,
            'failed_attempts', COALESCE(failed_attempts_count, 0)
        );

        SELECT * INTO ban_info
        FROM check_user_ban_status(user_record.email);

        IF FOUND THEN
            result := result || json_build_object(
                'ban_status', json_build_object(
                    'is_banned', ban_info.is_banned,
                    'ban_type', ban_info.ban_type,
                    'reason', ban_info.reason,
                    'banned_until', ban_info.banned_until
                )
            );
        END IF;
    END;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Hướng dẫn:
-- 1. Chạy file này trên Supabase SQL Editor
-- 2. Function sẽ được cập nhật với field 'failed_attempts'
-- 3. Nếu có lỗi, kiểm tra xem các dependencies đã có chưa:
--    - get_user_by_email()
--    - log_user_activity()
--    - check_user_ban_status()
--    - Bảng user_activities
-- =====================================================


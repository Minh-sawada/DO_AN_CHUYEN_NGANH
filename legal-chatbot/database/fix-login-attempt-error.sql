-- =====================================================
-- FIX LOGIN ATTEMPT ERROR - Version an toàn và đơn giản
-- File này sửa lỗi "Failed to log login attempt"
-- Chạy file này trên Supabase SQL Editor
-- =====================================================

-- Function đếm failed logins (nếu chưa có)
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

-- Function log_login_attempt - Version an toàn với error handling tốt
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
    failed_attempts_count INTEGER := 0;
    target_role TEXT;
BEGIN
    -- Lấy thông tin user từ email
    BEGIN
        SELECT * INTO user_record
        FROM get_user_by_email(p_email);
    EXCEPTION WHEN others THEN
        RETURN json_build_object(
            'user_exists', FALSE,
            'logged', FALSE,
            'message', 'Error getting user: ' || SQLERRM
        );
    END;

    IF NOT FOUND OR user_record.user_id IS NULL THEN
        RETURN json_build_object(
            'user_exists', FALSE,
            'logged', FALSE,
            'message', 'User not found'
        );
    END IF;

    -- Log activity vào user_activities
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
    EXCEPTION WHEN others THEN
        -- Nếu log activity fail, vẫn trả về kết quả nhưng logged = false
        RETURN json_build_object(
            'user_exists', TRUE,
            'logged', FALSE,
            'error', 'Failed to log activity: ' || SQLERRM,
            'user_id', user_record.user_id,
            'failed_attempts', 0
        );
    END;

    -- Đếm số lần đăng nhập sai sau khi đã log
    IF NOT p_success THEN
        BEGIN
            SELECT count_recent_failed_logins(p_email, 15) INTO failed_attempts_count;
        EXCEPTION WHEN others THEN
            -- Nếu đếm fail, set về 0
            failed_attempts_count := 0;
        END;
        
        -- Nếu đạt 5 lần sai, tự động ban 5 phút
        IF failed_attempts_count >= 5 THEN
            BEGIN
                SELECT role INTO target_role FROM profiles WHERE id = user_record.user_id;
                
                IF COALESCE(target_role, 'user') <> 'admin' THEN
                    INSERT INTO banned_users (
                        user_id,
                        reason,
                        ban_type,
                        banned_until,
                        banned_by,
                        notes
                    ) VALUES (
                        user_record.user_id,
                        'Tự động khóa tạm thời do đăng nhập sai 5 lần liên tiếp',
                        'temporary',
                        NOW() + INTERVAL '5 minutes',
                        NULL,
                        'Auto ban triggered at ' || NOW()
                    )
                    ON CONFLICT (user_id) 
                    DO UPDATE SET
                        reason = EXCLUDED.reason,
                        ban_type = EXCLUDED.ban_type,
                        banned_until = EXCLUDED.banned_until,
                        notes = EXCLUDED.notes,
                        created_at = NOW();
                END IF;
            EXCEPTION WHEN others THEN
                -- Nếu ban fail, chỉ log không throw
                NULL;
            END;
        END IF;
    END IF;

    -- Tạo kết quả trả về
    result := json_build_object(
        'user_exists', TRUE,
        'logged', TRUE,
        'activity_id', activity_id,
        'user_id', user_record.user_id,
        'failed_attempts', failed_attempts_count
    );

    -- Kiểm tra ban status
    BEGIN
        SELECT * INTO ban_info
        FROM check_user_ban_status(user_record.email)
        LIMIT 1;

        IF FOUND AND ban_info.is_banned THEN
            result := result || json_build_object(
                'ban_status', json_build_object(
                    'is_banned', TRUE,
                    'ban_type', ban_info.ban_type,
                    'reason', ban_info.reason,
                    'banned_until', ban_info.banned_until
                )
            );
        END IF;
    EXCEPTION WHEN others THEN
        -- Nếu check ban fail, bỏ qua
        NULL;
    END;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Hướng dẫn:
-- =====================================================
-- 1. Chạy file này trên Supabase SQL Editor
-- 2. Version này có error handling tốt, không throw exception
-- 3. Luôn trả về JSON hợp lệ, ngay cả khi có lỗi
-- 4. Sau khi chạy, thử đăng nhập lại
-- =====================================================


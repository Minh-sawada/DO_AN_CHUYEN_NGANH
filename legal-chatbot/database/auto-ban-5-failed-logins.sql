-- =====================================================
-- Auto-ban 5 phút khi đăng nhập sai 5 lần liên tiếp
-- File này cập nhật function log_login_attempt để tự động ban
-- Chạy file này trên Supabase SQL Editor
-- =====================================================

-- Cập nhật function log_login_attempt để tự động ban 5 phút khi đăng nhập sai 5 lần liên tiếp
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
    target_role TEXT;
BEGIN
    -- Lấy thông tin user từ email
    SELECT * INTO user_record
    FROM get_user_by_email(p_email);

    IF NOT FOUND THEN
        RETURN json_build_object(
            'user_exists', FALSE,
            'logged', FALSE,
            'message', 'User not found'
        );
    END IF;

    -- Kiểm tra ban status trước khi log (để tránh log khi đã bị ban)
    SELECT * INTO ban_info
    FROM check_user_ban_status(user_record.email);

    -- Nếu đã bị ban và chưa hết hạn, trả về ngay
    IF FOUND AND ban_info.is_banned THEN
        RETURN json_build_object(
            'user_exists', TRUE,
            'logged', FALSE,
            'user_id', user_record.user_id,
            'failed_attempts', 0,
            'ban_status', json_build_object(
                'is_banned', TRUE,
                'ban_type', ban_info.ban_type,
                'reason', ban_info.reason,
                'banned_until', ban_info.banned_until
            )
        );
    END IF;

    BEGIN
        -- Log activity vào user_activities
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

        -- Đếm số lần đăng nhập sai LIÊN TIẾP sau khi đã log (bao gồm cả lần vừa log)
        IF NOT p_success THEN
            SELECT count_recent_failed_logins(p_email, 15) INTO failed_attempts_count;
            
            -- Nếu đạt 5 lần sai liên tiếp, tự động ban 5 phút
            IF failed_attempts_count >= 5 THEN
                -- Lấy role để kiểm tra admin
                SELECT role INTO target_role FROM profiles WHERE id = user_record.user_id;
                
                -- Chỉ ban nếu không phải admin
                IF COALESCE(target_role, 'user') <> 'admin' THEN
                    -- Ban trực tiếp với thời gian 5 phút
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
                        'Auto ban triggered at ' || NOW() || ' - 5 consecutive failed logins'
                    )
                    ON CONFLICT (user_id) 
                    DO UPDATE SET
                        reason = EXCLUDED.reason,
                        ban_type = EXCLUDED.ban_type,
                        banned_until = EXCLUDED.banned_until,
                        banned_by = EXCLUDED.banned_by,
                        notes = EXCLUDED.notes,
                        created_at = NOW();
                END IF;
            END IF;
        ELSE
            -- Nếu đăng nhập thành công, reset failed attempts count
            failed_attempts_count := 0;
        END IF;

        -- Tạo kết quả trả về
        result := json_build_object(
            'user_exists', TRUE,
            'logged', TRUE,
            'activity_id', activity_id,
            'user_id', user_record.user_id,
            'failed_attempts', failed_attempts_count
        );

        -- Kiểm tra lại ban status sau khi có thể đã ban
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
        -- Xử lý lỗi khi log activity
        result := json_build_object(
            'user_exists', TRUE,
            'logged', FALSE,
            'error', SQLERRM,
            'user_id', user_record.user_id,
            'failed_attempts', COALESCE(failed_attempts_count, 0)
        );

        -- Vẫn kiểm tra ban status ngay cả khi có lỗi
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
-- =====================================================
-- 1. Đảm bảo đã chạy các file sau theo thứ tự:
--    - system-management.sql (để có dependencies)
--    - login-failed-attempts-tracking.sql hoặc update-login-attempt-function.sql (để có count_recent_failed_logins)
--
-- 2. Chạy file này trên Supabase SQL Editor
--
-- 3. Sau khi chạy, khi đăng nhập sai 5 lần liên tiếp:
--    - Tự động ban 5 phút
--    - Không cho đăng nhập trong 5 phút
--    - Admin không bị ban
--
-- 4. Kiểm tra:
--    - Đăng nhập sai 5 lần liên tiếp với cùng một email
--    - Lần thứ 5 sẽ tự động ban và hiển thị thông báo
-- =====================================================


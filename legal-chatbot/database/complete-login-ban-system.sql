-- =====================================================
-- COMPLETE LOGIN BAN SYSTEM - Tự động ban 5 phút khi đăng nhập sai 5 lần liên tiếp
-- Chạy file này trên Supabase SQL Editor
-- Đảm bảo đã chạy system-management.sql trước
-- =====================================================

-- Bước 1: Tạo/cập nhật function đếm failed logins LIÊN TIẾP
-- =====================================================
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

-- Bước 2: Cập nhật function log_login_attempt với auto-ban logic
-- =====================================================
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
-- HƯỚNG DẪN SỬ DỤNG:
-- =====================================================
-- 1. Đảm bảo đã chạy system-management.sql trước để có:
--    - get_user_by_email()
--    - log_user_activity()
--    - check_user_ban_status()
--    - Bảng user_activities
--    - Bảng banned_users
--    - Bảng profiles
--
-- 2. Chạy file này trên Supabase SQL Editor
--
-- 3. Sau khi chạy, hệ thống sẽ:
--    - Đếm số lần đăng nhập sai LIÊN TIẾP
--    - Tự động ban 5 phút khi đạt 5 lần sai liên tiếp
--    - Admin không bị ban
--    - Kiểm tra ban status trước khi cho phép đăng nhập
--
-- 4. Kiểm tra:
--    - Đăng nhập sai 5 lần liên tiếp với cùng một email
--    - Lần thứ 5 sẽ tự động ban và hiển thị thông báo "Tài khoản bị khóa tạm thời"
--    - Sau 5 phút, có thể đăng nhập lại
--
-- 5. Ví dụ:
--    - Login sai -> sai -> sai -> sai -> sai = 5 lần liên tiếp (BAN 5 phút)
--    - Login sai -> sai -> thành công -> sai -> sai = 2 lần liên tiếp (KHÔNG ban)
-- =====================================================


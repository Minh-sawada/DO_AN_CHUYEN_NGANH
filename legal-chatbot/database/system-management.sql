-- =====================================================
-- SYSTEM MANAGEMENT & SECURITY TABLES
-- Chạy file này trong Supabase SQL Editor
-- =====================================================

-- 1. Bảng user_activities - Log tất cả hoạt động của người dùng
-- =====================================================
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'query', 'upload', 'delete', 'update', 
        'view', 'download', 'export', 'admin_action'
    )),
    action VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Bảng banned_users - Danh sách người dùng bị ban
-- =====================================================
CREATE TABLE IF NOT EXISTS banned_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    ban_type VARCHAR(20) DEFAULT 'temporary' CHECK (ban_type IN ('temporary', 'permanent')),
    banned_until TIMESTAMP WITH TIME ZONE,
    banned_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- 3. Bảng suspicious_activities - Phát hiện hoạt động đáng nghi
-- =====================================================
CREATE TABLE IF NOT EXISTS suspicious_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    pattern_detected VARCHAR(100),
    details JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'false_positive')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bảng rate_limits - Theo dõi rate limiting
-- =====================================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    resource_type VARCHAR(50) NOT NULL, -- 'query', 'login', 'upload', etc.
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_end TIMESTAMP WITH TIME ZONE,
    blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_risk_level ON user_activities(risk_level);
CREATE INDEX IF NOT EXISTS idx_banned_users_user_id ON banned_users(user_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_banned_until ON banned_users(banned_until);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_status ON suspicious_activities(status);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_risk_score ON suspicious_activities(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON rate_limits(user_id, resource_type);

-- RLS Policies
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies cho user_activities: Admin có thể xem tất cả
CREATE POLICY "Admins can view all user activities"
    ON user_activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policies cho banned_users: Admin có thể xem và quản lý
CREATE POLICY "Admins can manage banned users"
    ON banned_users FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policies cho suspicious_activities: Admin có thể xem và quản lý
CREATE POLICY "Admins can manage suspicious activities"
    ON suspicious_activities FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Policies cho rate_limits: Admin có thể xem tất cả
CREATE POLICY "Admins can view rate limits"
    ON rate_limits FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Function để tự động phát hiện suspicious activities
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TRIGGER AS $$
DECLARE
    query_count INTEGER;
    login_count INTEGER;
    risk_score INTEGER := 0;
    pattern_detected VARCHAR(100);
    target_role TEXT;
BEGIN
    -- Kiểm tra nếu là query activity
    IF NEW.activity_type = 'query' THEN
        -- Đếm số queries trong 1 phút qua
        SELECT COUNT(*) INTO query_count
        FROM user_activities
        WHERE user_id = NEW.user_id
        AND activity_type = 'query'
        AND created_at > NOW() - INTERVAL '1 minute';
        
        -- Nếu > 30 queries/phút = suspicious
        IF query_count > 30 THEN
            risk_score := 80;
            pattern_detected := 'excessive_queries';
        ELSIF query_count > 20 THEN
            risk_score := 50;
            pattern_detected := 'high_query_rate';
        END IF;
    END IF;
    
    -- Kiểm tra login attempts
    IF NEW.activity_type = 'login' THEN
        -- Lấy role của user
        SELECT role INTO target_role FROM profiles WHERE id = NEW.user_id;

        SELECT COUNT(*) INTO login_count
        FROM user_activities
        WHERE user_id = NEW.user_id
        AND activity_type = 'login'
        AND created_at > NOW() - INTERVAL '5 minutes';
        
        -- Nếu > 5 login attempts trong 5 phút = suspicious
        IF login_count > 5 THEN
            risk_score := 90;
            pattern_detected := 'brute_force_login';
        END IF;
    END IF;
    
    -- Nếu có risk score, tạo suspicious activity record
    IF risk_score > 0 THEN
        INSERT INTO suspicious_activities (
            user_id,
            activity_type,
            description,
            risk_score,
            pattern_detected,
            details
        ) VALUES (
            NEW.user_id,
            NEW.activity_type,
            'Phát hiện hoạt động đáng nghi: ' || pattern_detected,
            risk_score,
            pattern_detected,
            jsonb_build_object(
                'activity_id', NEW.id,
                'action', NEW.action,
                'details', NEW.details
            )
        );

        -- Nếu phát hiện brute force login thì tự động ban tạm thời
        -- KHÔNG tự động ban nếu user là admin
        IF pattern_detected = 'brute_force_login' 
           AND NEW.user_id IS NOT NULL 
           AND COALESCE(target_role, 'user') <> 'admin' THEN
            -- Auto ban 1 giờ
            PERFORM ban_user(
                NEW.user_id,
                'Tự động khóa tạm thời do đăng nhập quá nhiều lần',
                NULL,
                'temporary',
                1,
                'Auto ban triggered at ' || NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger để tự động detect suspicious activities
DROP TRIGGER IF EXISTS trigger_detect_suspicious ON user_activities;
CREATE TRIGGER trigger_detect_suspicious
    AFTER INSERT ON user_activities
    FOR EACH ROW
    EXECUTE FUNCTION detect_suspicious_activity();

-- Function để check nếu user bị ban
CREATE OR REPLACE FUNCTION is_user_banned(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    ban_record RECORD;
    target_role TEXT;
BEGIN
    -- Admins are never considered banned
    SELECT role INTO target_role FROM profiles WHERE id = check_user_id;
    IF COALESCE(target_role, 'user') = 'admin' THEN
        RETURN FALSE;
    END IF;

    SELECT * INTO ban_record
    FROM banned_users
    WHERE user_id = check_user_id
    AND (
        ban_type = 'permanent'
        OR (ban_type = 'temporary' AND banned_until > NOW())
    )
    ORDER BY created_at DESC
    LIMIT 1;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function để log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type VARCHAR,
    p_action VARCHAR,
    p_details JSONB DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_risk_level VARCHAR DEFAULT 'low'
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
    is_banned BOOLEAN;
BEGIN
    -- Kiểm tra nếu user bị ban
    SELECT is_user_banned(p_user_id) INTO is_banned;
    
    IF is_banned THEN
        RAISE EXCEPTION 'User is banned and cannot perform this action';
    END IF;
    
    -- Insert activity
    INSERT INTO user_activities (
        user_id,
        activity_type,
        action,
        details,
        ip_address,
        user_agent,
        risk_level
    ) VALUES (
        p_user_id,
        p_activity_type,
        p_action,
        p_details,
        p_ip_address,
        p_user_agent,
        p_risk_level
    )
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function để ban user
CREATE OR REPLACE FUNCTION ban_user(
    p_user_id UUID,
    p_reason TEXT,
    p_banned_by UUID DEFAULT NULL,
    p_ban_type VARCHAR DEFAULT 'temporary',
    p_duration_hours INTEGER DEFAULT 24,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    ban_id UUID;
    banned_until TIMESTAMP WITH TIME ZONE;
    target_role TEXT;
BEGIN
    -- KHÔNG cho phép ban admin (kể cả manual hay auto)
    SELECT role INTO target_role FROM profiles WHERE id = p_user_id;
    IF COALESCE(target_role, 'user') = 'admin' THEN
        -- Trả về NULL để biểu thị không thực hiện ban
        RETURN NULL;
    END IF;

    IF p_ban_type = 'temporary' THEN
        banned_until := NOW() + (p_duration_hours || ' hours')::INTERVAL;
    ELSE
        banned_until := NULL;
    END IF;
    
    INSERT INTO banned_users (
        user_id,
        reason,
        ban_type,
        banned_until,
        banned_by,
        notes
    ) VALUES (
        p_user_id,
        p_reason,
        p_ban_type,
        banned_until,
        p_banned_by,
        p_notes
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        reason = EXCLUDED.reason,
        ban_type = EXCLUDED.ban_type,
        banned_until = EXCLUDED.banned_until,
        banned_by = EXCLUDED.banned_by,
        notes = EXCLUDED.notes,
        created_at = NOW()
    RETURNING id INTO ban_id;
    
    RETURN ban_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function để unban user
CREATE OR REPLACE FUNCTION unban_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM banned_users
    WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Lấy thông tin user từ email
CREATE OR REPLACE FUNCTION get_user_by_email(p_email TEXT)
RETURNS TABLE(user_id UUID, email TEXT, role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id AS user_id, 
        u.email::text AS email,
        COALESCE(p.role, 'user')::text AS role
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE LOWER(u.email) = LOWER(p_email)
    ORDER BY u.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Kiểm tra trạng thái ban của user theo email
CREATE OR REPLACE FUNCTION check_user_ban_status(p_email TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    role TEXT,
    is_banned BOOLEAN,
    ban_type VARCHAR,
    reason TEXT,
    banned_until TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
BEGIN
    RETURN QUERY
    WITH user_data AS (
        SELECT 
            gu.user_id,
            gu.email,
            gu.role
        FROM get_user_by_email(p_email) gu
    ),
    ban_data AS (
        SELECT DISTINCT ON (b.user_id)
            b.user_id,
            TRUE AS is_banned,
            b.ban_type,
            b.reason,
            b.banned_until
        FROM banned_users b
        WHERE
            b.ban_type = 'permanent'
            OR (b.ban_type = 'temporary' AND b.banned_until > NOW())
        ORDER BY b.user_id, b.created_at DESC
    )
    SELECT 
        ud.user_id,
        ud.email,
        ud.role,
        COALESCE(bd.is_banned, FALSE) AS is_banned,
        bd.ban_type,
        bd.reason::text,
        bd.banned_until
    FROM user_data ud
    LEFT JOIN ban_data bd ON bd.user_id = ud.user_id;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::uuid,
            NULL::text,
            NULL::text,
            FALSE,
            NULL::varchar,
            NULL::text,
            NULL::timestamptz;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Log login attempt với email (bao gồm trường hợp thất bại)
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

        result := json_build_object(
            'user_exists', TRUE,
            'logged', TRUE,
            'activity_id', activity_id,
            'user_id', user_record.user_id
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
            'user_id', user_record.user_id
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

-- View để xem tổng hợp hoạt động đáng nghi
CREATE OR REPLACE VIEW suspicious_activities_summary AS
SELECT 
    sa.id,
    sa.user_id,
    p.full_name,
    sa.activity_type,
    sa.description,
    sa.risk_score,
    sa.pattern_detected,
    sa.status,
    sa.created_at,
    COUNT(*) OVER (PARTITION BY sa.user_id) as total_suspicious_count
FROM suspicious_activities sa
LEFT JOIN profiles p ON sa.user_id = p.id
ORDER BY sa.risk_score DESC, sa.created_at DESC;

-- 5. Bảng system_logs - ĐÃ XÓA (không cần thiết)
-- Chỉ dùng 2 bảng: query_logs và user_activities
-- system_logs không cần vì user_activities đã đủ cho tất cả hoạt động user


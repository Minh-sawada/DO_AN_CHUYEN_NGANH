-- =====================================================
-- ADD EDITOR ROLE - PHIÊN BẢN KHUYẾN NGHỊ
-- Chỉ thay đổi constraint và policies cần thiết
-- Rất an toàn - không thay đổi dữ liệu hiện có
-- =====================================================

-- BƯỚC 1: Cập nhật constraint (AN TOÀN - chỉ thay đổi rule)
-- =====================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'editor', 'user'));

-- BƯỚC 2: Cập nhật policies cho laws (để editor có thể upload/edit)
-- =====================================================
-- Drop policies cũ
DROP POLICY IF EXISTS "Only admins can insert laws" ON laws;
DROP POLICY IF EXISTS "Only admins can update laws" ON laws;

-- Tạo policies mới cho phép admin và editor
CREATE POLICY "Admins and editors can insert laws" ON laws
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Admins and editors can update laws" ON laws
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('admin', 'editor')
        )
    );

-- Policy delete vẫn chỉ cho admin (không thay đổi)
-- DROP POLICY IF EXISTS "Only admins can delete laws" ON laws;
-- (Giữ nguyên policy delete cũ nếu có, hoặc tạo mới nếu chưa có)

-- BƯỚC 3: Cập nhật policy cho query_logs (để editor xem được)
-- =====================================================
DROP POLICY IF EXISTS "Only admins can view all queries" ON query_logs;

CREATE POLICY "Admins and editors can view all queries" ON query_logs
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE role IN ('admin', 'editor')
        ) OR auth.uid() = user_id
    );

-- =====================================================
-- HOÀN TẤT - RẤT AN TOÀN
-- =====================================================
-- ✅ Không thay đổi dữ liệu hiện có
-- ✅ Tất cả users hiện tại vẫn giữ nguyên role
-- ✅ Chỉ thêm rule validation và policies mới
-- ✅ Có thể rollback dễ dàng

-- Để kiểm tra sau khi chạy:
-- SELECT id, role FROM profiles;  -- Tất cả dữ liệu vẫn nguyên

-- ROLLBACK nếu cần:
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));
-- (Sau đó drop và tạo lại các policies cũ)


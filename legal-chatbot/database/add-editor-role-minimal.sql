-- =====================================================
-- ADD EDITOR ROLE - MINIMAL VERSION (CHỈ CONSTRAINT)
-- Phiên bản tối thiểu - CHỈ thay đổi constraint
-- KHÔNG thay đổi policies, KHÔNG thay đổi dữ liệu
-- =====================================================

-- Bước 1: Drop constraint cũ
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Bước 2: Tạo constraint mới
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'editor', 'user'));

-- =====================================================
-- XONG! Chỉ có 2 dòng code, rất an toàn
-- =====================================================
-- Sau khi chạy, bạn có thể:
-- 1. Set role = 'editor' cho user trong code (không cần SQL)
-- 2. Hoặc dùng Admin Panel UI để thay đổi role
-- 3. Policies sẽ được xử lý ở application level (code)

-- ROLLBACK nếu cần (nếu muốn quay lại):
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));


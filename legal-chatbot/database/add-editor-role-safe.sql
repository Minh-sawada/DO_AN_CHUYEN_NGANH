-- =====================================================
-- ADD EDITOR ROLE - SAFE VERSION (KHÔNG THAY ĐỔI DỮ LIỆU)
-- Chỉ cập nhật constraint để cho phép role 'editor'
-- KHÔNG thay đổi dữ liệu hiện có
-- =====================================================

-- Bước 1: Kiểm tra constraint hiện tại (chỉ để xem, không thay đổi)
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'profiles_role_check';

-- Bước 2: Drop constraint cũ (AN TOÀN - không ảnh hưởng dữ liệu)
-- Constraint chỉ là rule validation, drop nó không xóa dữ liệu
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Bước 3: Tạo constraint mới cho phép 'editor'
-- KHÔNG thay đổi bất kỳ dữ liệu nào, chỉ thêm rule mới
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'editor', 'user'));

-- =====================================================
-- HOÀN TẤT - CHỈ THAY ĐỔI CONSTRAINT, KHÔNG ĐỤNG DỮ LIỆU
-- =====================================================
-- Tất cả users hiện tại vẫn giữ nguyên role của họ
-- Bây giờ bạn có thể set role = 'editor' cho user mới hoặc cập nhật user hiện có

-- Để kiểm tra: SELECT id, role FROM profiles;


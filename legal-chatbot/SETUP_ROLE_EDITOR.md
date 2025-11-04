# Hướng Dẫn Setup Role Editor - Khuyến Nghị

## 🎯 Khuyến Nghị Của Tôi

**Dùng file: `database/add-editor-role-recommended.sql`**

### Tại sao?

1. **Rất an toàn** ✅
   - Chỉ thay đổi **rules** (constraint và policies)
   - **KHÔNG đụng vào dữ liệu** hiện có
   - Tất cả users hiện tại vẫn giữ nguyên role

2. **Đầy đủ chức năng** ✅
   - Editor có thể upload/edit laws ngay
   - RLS policies hoạt động đúng
   - Code đã sẵn sàng, chỉ cần chạy SQL

3. **Có thể rollback** ✅
   - Nếu có vấn đề, rollback dễ dàng

## 📋 Các Bước Thực Hiện

### Bước 1: Backup (Tùy chọn, nhưng khuyến nghị)

```sql
-- Export dữ liệu profiles trước (phòng xa)
SELECT * FROM profiles;
-- Copy kết quả ra file text
```

### Bước 2: Chạy Migration

1. Mở **Supabase Dashboard** → **SQL Editor**
2. Mở file `database/add-editor-role-recommended.sql`
3. Copy toàn bộ nội dung
4. Paste vào SQL Editor
5. Click **Run** hoặc nhấn `Ctrl+Enter`

### Bước 3: Kiểm Tra

```sql
-- Kiểm tra constraint đã được cập nhật
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'profiles_role_check';
-- Kết quả phải có: role IN ('admin', 'editor', 'user')

-- Kiểm tra dữ liệu vẫn nguyên
SELECT id, role, full_name FROM profiles;
-- Tất cả users hiện tại vẫn giữ nguyên role của họ
```

### Bước 4: Test

1. Đăng nhập với tài khoản admin
2. Vào **Admin Panel** → **Quản trị hệ thống** → **Quản lý người dùng**
3. Chọn một user và đổi role thành **"Biên tập viên"**
4. Đăng xuất và đăng nhập lại với user đó
5. Kiểm tra:
   - ✅ Có thể truy cập Admin Panel
   - ✅ Có thể upload laws
   - ✅ Có thể edit laws
   - ❌ Không thể xóa laws (chỉ admin mới xóa được)
   - ❌ Không thấy tab "Quản trị hệ thống" và "Backup"

## 🔄 Rollback (Nếu Cần)

Nếu sau khi chạy migration có vấn đề, rollback như sau:

```sql
-- 1. Rollback constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user'));

-- 2. Rollback policies cho laws
DROP POLICY IF EXISTS "Admins and editors can insert laws" ON laws;
DROP POLICY IF EXISTS "Admins and editors can update laws" ON laws;

CREATE POLICY "Only admins can insert laws" ON laws
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

CREATE POLICY "Only admins can update laws" ON laws
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- 3. Rollback policy cho query_logs
DROP POLICY IF EXISTS "Admins and editors can view all queries" ON query_logs;

CREATE POLICY "Only admins can view all queries" ON query_logs
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
        OR auth.uid() = user_id
    );
```

## ⚠️ Lưu Ý Quan Trọng

1. **Migration này KHÔNG thay đổi dữ liệu**
   - Tất cả users hiện tại vẫn giữ nguyên role
   - Chỉ thêm rule mới để cho phép role 'editor'

2. **Nếu có user đang set role = 'editor' trước khi chạy migration**
   - Database sẽ reject và báo lỗi
   - Sau khi chạy migration, mới có thể set role = 'editor'

3. **Test trên database test trước** (nếu có)
   - Tạo database test trong Supabase
   - Chạy migration trên test
   - Verify mọi thứ OK
   - Sau đó mới chạy trên production

## ✅ Checklist

- [ ] Đã đọc và hiểu migration SQL
- [ ] Đã backup dữ liệu (tùy chọn nhưng khuyến nghị)
- [ ] Đã chạy migration trong Supabase SQL Editor
- [ ] Đã kiểm tra constraint đã được cập nhật
- [ ] Đã kiểm tra dữ liệu vẫn nguyên
- [ ] Đã test tạo editor user và verify quyền

## 🆘 Nếu Có Vấn Đề

1. **Lỗi constraint violation**
   - Kiểm tra xem có user nào đang có role = 'editor' không
   - Nếu có, set về 'user' hoặc 'admin' trước

2. **Policies không hoạt động**
   - Kiểm tra RLS đã được enable chưa: `ALTER TABLE laws ENABLE ROW LEVEL SECURITY;`
   - Kiểm tra user có đúng role không

3. **Rollback nếu cần**
   - Dùng script rollback ở trên
   - Hoặc restore từ backup


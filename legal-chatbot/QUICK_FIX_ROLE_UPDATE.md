# Quick Fix: Không thể cập nhật role

## Vấn đề

Khi cố gắng đổi role của user, gặp lỗi hoặc không thể cập nhật.

## Nguyên nhân có thể

### 1. Chưa chạy SQL migration (Phổ biến nhất)

Database chưa hỗ trợ role 'editor', nên khi cố set role = 'editor' sẽ bị lỗi constraint.

**Giải pháp:**
1. Mở **Supabase Dashboard** → **SQL Editor**
2. Copy nội dung file `database/add-editor-role-recommended.sql`
3. Paste và chạy
4. Refresh trang và thử lại

### 2. Session hết hạn

Session đã expire, cần đăng nhập lại.

**Giải pháp:**
1. Đăng xuất
2. Đăng nhập lại với tài khoản admin
3. Thử lại

### 3. Không có quyền admin

Tài khoản hiện tại không phải admin.

**Giải pháp:**
- Kiểm tra role trong database:
  ```sql
  SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';
  ```
- Nếu không phải admin, cần admin khác set role cho bạn

## Cách kiểm tra nhanh

### Bước 1: Kiểm tra Console

Mở Browser Console (F12) và xem:
- Có error message gì không?
- Error code là gì? (401, 403, 400, 500?)

### Bước 2: Kiểm tra Terminal

Xem terminal chạy dev server:
- Có "Session check:" log không?
- `hasSession` là `true` hay `false`?
- Có error message gì không?

### Bước 3: Kiểm tra Database

Chạy trong Supabase SQL Editor:
```sql
-- Kiểm tra constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'profiles_role_check';

-- Kết quả phải có: role IN ('admin', 'editor', 'user')
-- Nếu chỉ có: role IN ('admin', 'user') → cần chạy migration
```

## Giải pháp nhanh nhất

**Chạy SQL migration:**

```sql
-- File: database/add-editor-role-recommended.sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'editor', 'user'));
```

Sau đó:
1. Restart dev server
2. Hard refresh browser (Ctrl+Shift+R)
3. Đăng nhập lại
4. Thử đổi role

## Nếu vẫn lỗi

Gửi cho tôi:
1. Error message trong Console
2. Error message trong Terminal
3. Response status code (401, 403, 400, 500?)
4. Kết quả của SQL query kiểm tra constraint


# Hướng dẫn Setup Hệ thống Quản trị và Bảo mật

File này hướng dẫn cách setup hệ thống quản trị, logs người dùng, phát hiện hoạt động đáng nghi và chức năng ban user trên Supabase.

## 📋 Mục lục

1. [Chạy SQL Script](#1-chạy-sql-script)
2. [Kiểm tra kết quả](#2-kiểm-tra-kết-quả)
3. [Cấu hình RLS Policies](#3-cấu-hình-rls-policies)
4. [Test chức năng](#4-test-chức-năng)

---

## 1. Chạy SQL Script

### Bước 1: Mở Supabase SQL Editor

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor** ở sidebar trái
4. Click **New query**

### Bước 2: Chạy Script

1. Copy toàn bộ nội dung file `database/system-management.sql`
2. Paste vào SQL Editor
3. Click **Run** hoặc nhấn `Ctrl + Enter` (Windows) / `Cmd + Enter` (Mac)

### Bước 3: Kiểm tra kết quả

Script sẽ tạo:
- ✅ 4 bảng mới: `user_activities`, `banned_users`, `suspicious_activities`, `rate_limits`
- ✅ Các indexes để tối ưu query
- ✅ RLS policies cho bảo mật
- ✅ 3 functions: `detect_suspicious_activity()`, `is_user_banned()`, `log_user_activity()`, `ban_user()`, `unban_user()`
- ✅ 1 trigger tự động phát hiện hoạt động đáng nghi
- ✅ 1 view: `suspicious_activities_summary`

---

## 2. Kiểm tra kết quả

### Kiểm tra bảng đã tạo

Chạy query sau để kiểm tra:

```sql
-- Kiểm tra các bảng đã tạo
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_activities', 'banned_users', 'suspicious_activities', 'rate_limits')
ORDER BY table_name;
```

### Kiểm tra functions đã tạo

```sql
-- Kiểm tra functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'detect_suspicious_activity',
  'is_user_banned',
  'log_user_activity',
  'ban_user',
  'unban_user'
)
ORDER BY routine_name;
```

### Kiểm tra trigger

```sql
-- Kiểm tra trigger
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'trigger_detect_suspicious';
```

---

## 3. Cấu hình RLS Policies

RLS policies đã được tự động tạo trong script, nhưng bạn có thể kiểm tra:

```sql
-- Kiểm tra RLS đã bật
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_activities', 'banned_users', 'suspicious_activities', 'rate_limits');
```

**Lưu ý**: Nếu `rowsecurity = false`, chạy:

```sql
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
```

---

## 4. Test chức năng

### Test 1: Log một hoạt động

Chạy trong SQL Editor:

```sql
-- Test log activity (thay YOUR_USER_ID bằng UUID thực)
SELECT log_user_activity(
  'YOUR_USER_ID'::UUID,
  'query'::VARCHAR,
  'Test query activity'::VARCHAR,
  '{"test": true}'::JSONB,
  '192.168.1.1'::VARCHAR,
  'Mozilla/5.0'::TEXT,
  'low'::VARCHAR
);
```

### Test 2: Test phát hiện suspicious activity

```sql
-- Tạo nhiều query trong 1 phút để trigger suspicious detection
-- (Chạy query này nhiều lần nhanh)
SELECT log_user_activity(
  'YOUR_USER_ID'::UUID,
  'query'::VARCHAR,
  'Rapid query test'::VARCHAR,
  NULL,
  NULL,
  NULL,
  'low'::VARCHAR
);
```

Sau đó kiểm tra bảng `suspicious_activities`:

```sql
SELECT * FROM suspicious_activities ORDER BY created_at DESC LIMIT 5;
```

### Test 3: Ban một user

```sql
-- Ban user (thay YOUR_USER_ID và ADMIN_USER_ID)
SELECT ban_user(
  'YOUR_USER_ID'::UUID,           -- User bị ban
  'Test ban - hoạt động đáng nghi'::TEXT,
  'ADMIN_USER_ID'::UUID,          -- Admin ban user
  'temporary'::VARCHAR,           -- temporary hoặc permanent
  24::INTEGER,                     -- Số giờ ban (nếu temporary)
  'Test ban'::TEXT                -- Notes (optional)
);
```

Kiểm tra:

```sql
SELECT * FROM banned_users WHERE user_id = 'YOUR_USER_ID'::UUID;
```

### Test 4: Unban user

```sql
SELECT unban_user('YOUR_USER_ID'::UUID);
```

### Test 5: Check user bị ban

```sql
-- Kiểm tra user có bị ban không
SELECT is_user_banned('YOUR_USER_ID'::UUID);
```

---

## 5. Sử dụng trong ứng dụng

### Log activity từ frontend/API

```typescript
// Ví dụ: Log khi user query
await fetch('/api/system/log-activity', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: userId,
    activity_type: 'query',
    action: 'Search legal document',
    details: { query: 'luật lao động' },
    risk_level: 'low'
  })
})
```

### Kiểm tra user bị ban trước khi cho phép hành động

```typescript
// Trong API route
const { data: isBanned } = await supabase.rpc('is_user_banned', {
  check_user_id: userId
})

if (isBanned) {
  return NextResponse.json(
    { error: 'User is banned', banned: true },
    { status: 403 }
  )
}
```

---

## 6. Các pattern phát hiện tự động

Hệ thống tự động phát hiện:

### 1. **Excessive Queries** (Quá nhiều queries)
- **Pattern**: > 30 queries trong 1 phút
- **Risk Score**: 80
- **Action**: Tự động tạo suspicious activity

### 2. **High Query Rate** (Tần suất cao)
- **Pattern**: > 20 queries trong 1 phút
- **Risk Score**: 50
- **Action**: Tự động tạo suspicious activity

### 3. **Brute Force Login** (Tấn công đăng nhập)
- **Pattern**: > 5 login attempts trong 5 phút
- **Risk Score**: 90
- **Action**: Tự động tạo suspicious activity

---

## 7. Quản lý trong Admin Panel

Sau khi setup xong:

1. **Đăng nhập** vào Admin Panel
2. Vào tab **"Quản trị hệ thống"**
3. Bạn sẽ thấy 3 tabs:
   - **Logs hoạt động**: Xem tất cả hoạt động của users
   - **Hoạt động đáng nghi**: Xem và xử lý các hoạt động đáng nghi
   - **User bị ban**: Quản lý danh sách user bị ban

### Các chức năng:

#### Ban User:
1. Click **"Ban User"** button
2. Nhập User ID (UUID)
3. Nhập lý do ban
4. Chọn loại ban (Tạm thời/Vĩnh viễn)
5. Nếu tạm thời, nhập số giờ
6. Click **"Ban User"**

#### Unban User:
1. Trong tab **"User bị ban"**
2. Click **"Unban"** button
3. Xác nhận unban

#### Xem Suspicious Activities:
1. Tab **"Hoạt động đáng nghi"**
2. Xem các hoạt động có risk score cao
3. Có thể:
   - Đánh dấu "Đã xem"
   - Ban user trực tiếp
   - Giải quyết vấn đề

---

## 8. Lưu ý quan trọng

### ⚠️ Bảo mật:
- Chỉ admin mới có quyền xem và quản lý
- RLS policies đã được cấu hình tự động
- User bị ban không thể thực hiện actions

### 📊 Performance:
- Indexes đã được tạo để tối ưu query
- Trigger chỉ chạy khi insert vào `user_activities`
- Rate limiting có thể được mở rộng sau

### 🔄 Maintenance:
- Nên xóa `user_activities` cũ định kỳ (ví dụ: > 90 ngày)
- Review `suspicious_activities` định kỳ
- Cleanup `rate_limits` cũ

---

## 9. Troubleshooting

### Lỗi: "Permission denied"
- **Nguyên nhân**: RLS policies chưa đúng hoặc user không phải admin
- **Giải pháp**: Kiểm tra role trong bảng `profiles`, đảm bảo `role = 'admin'`

### Trigger không chạy
- **Nguyên nhân**: Function `detect_suspicious_activity` có lỗi
- **Giải pháp**: Check logs trong Supabase Dashboard → Logs

### Không phát hiện suspicious activity
- **Nguyên nhân**: Pattern threshold quá cao
- **Giải pháp**: Điều chỉnh threshold trong function `detect_suspicious_activity()` trong SQL script

---

## 10. Mở rộng

### Thêm pattern detection mới:

Sửa function `detect_suspicious_activity()` trong SQL script để thêm pattern mới:

```sql
-- Ví dụ: Phát hiện nhiều upload trong thời gian ngắn
IF NEW.activity_type = 'upload' THEN
  SELECT COUNT(*) INTO upload_count
  FROM user_activities
  WHERE user_id = NEW.user_id
  AND activity_type = 'upload'
  AND created_at > NOW() - INTERVAL '10 minutes';
  
  IF upload_count > 10 THEN
    risk_score := 70;
    pattern_detected := 'excessive_uploads';
  END IF;
END IF;
```

---

## ✅ Checklist hoàn thành

Sau khi setup, đảm bảo:

- [ ] Tất cả 4 bảng đã được tạo
- [ ] Tất cả functions đã được tạo
- [ ] Trigger đã được tạo và active
- [ ] RLS policies đã được enable
- [ ] Test log activity thành công
- [ ] Test ban/unban user thành công
- [ ] Test suspicious detection hoạt động
- [ ] Admin Panel tab "Quản trị hệ thống" hiển thị đúng

---

**🎉 Hoàn thành!** Bây giờ bạn có thể quản lý logs, phát hiện và ban users có hoạt động phá hoại!


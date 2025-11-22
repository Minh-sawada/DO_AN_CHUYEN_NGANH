# 🔍 Hướng dẫn Debug Logging

## ✅ Đã thêm logging chi tiết

Tất cả các hoạt động (login, logout, upload) đã được thêm logging chi tiết để debug.

## 📋 Kiểm tra Logging

### 1. **Kiểm tra Console Logs**

Khi bạn login/logout/upload, mở **Browser Console** (F12) và **Server Console** để xem logs:

#### **Login:**
```
📝 Logging login activity for user: [user_id]
📝 Log activity request: { user_id, activity_type: 'login', ... }
📝 Calling log_user_activity RPC: ...
✅ login activity logged successfully: [activity_id]
```

#### **Logout:**
```
📝 Logging logout activity for user: [user_id]
📝 Log activity request: { user_id, activity_type: 'logout', ... }
✅ Logout activity logged successfully: [activity_id]
```

#### **Upload:**
```
Logging upload activity: { userId, fileName, chunksProcessed }
✅ Upload activity logged successfully: [activity_id]
```

### 2. **Kiểm tra Database**

Chạy SQL trong Supabase SQL Editor:

```sql
-- Xem tất cả activities gần đây
SELECT * FROM user_activities 
ORDER BY created_at DESC 
LIMIT 20;

-- Xem login activities
SELECT * FROM user_activities 
WHERE activity_type = 'login' 
ORDER BY created_at DESC;

-- Xem logout activities
SELECT * FROM user_activities 
WHERE activity_type = 'logout' 
ORDER BY created_at DESC;

-- Xem upload activities
SELECT * FROM user_activities 
WHERE activity_type = 'upload' 
ORDER BY created_at DESC;
```

### 3. **Kiểm tra RPC Function**

Đảm bảo RPC function `log_user_activity` đã được tạo:

```sql
-- Kiểm tra function có tồn tại không
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'log_user_activity';

-- Test function trực tiếp
SELECT log_user_activity(
  'YOUR_USER_ID'::UUID,
  'login'::VARCHAR,
  'test_action'::VARCHAR,
  '{"test": true}'::JSONB,
  '127.0.0.1'::VARCHAR,
  'test-agent'::TEXT,
  'low'::VARCHAR
);
```

### 4. **Kiểm tra Bảng user_activities**

Đảm bảo bảng đã được tạo:

```sql
-- Kiểm tra bảng có tồn tại không
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_activities';

-- Xem schema của bảng
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_activities';
```

## 🐛 Các lỗi thường gặp

### **Lỗi 1: "function log_user_activity does not exist"**

**Nguyên nhân:** RPC function chưa được tạo trong database.

**Giải pháp:**
1. Mở Supabase Dashboard → SQL Editor
2. Chạy file `database/system-management.sql`
3. Hoặc chạy script tạo function:

```sql
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
-- ... (xem file database/system-management.sql)
```

### **Lỗi 2: "relation user_activities does not exist"**

**Nguyên nhân:** Bảng `user_activities` chưa được tạo.

**Giải pháp:**
1. Chạy file `database/system-management.sql` trong Supabase SQL Editor
2. Hoặc tạo bảng thủ công (xem file SQL)

### **Lỗi 3: "No user_id found, skipping logging"**

**Nguyên nhân:** Không lấy được `user_id` từ request.

**Giải pháp:**
- Kiểm tra xem user đã đăng nhập chưa
- Kiểm tra cookies có session không
- Xem console logs để biết tại sao không lấy được user_id

### **Lỗi 4: "Missing required fields"**

**Nguyên nhân:** Request thiếu `user_id`, `activity_type`, hoặc `action`.

**Giải pháp:**
- Kiểm tra code gọi API có truyền đủ parameters không
- Xem console logs để biết field nào thiếu

## 🔧 Test Logging

Chạy script test:

```bash
cd legal-chatbot
node scripts/test-logging.js
```

Script sẽ kiểm tra:
- ✅ Database function `log_user_activity`
- ✅ Bảng `user_activities`
- ✅ API `/api/system/log-activity`

## 📊 Xem Logs trong Admin Panel

1. Đăng nhập với quyền admin
2. Vào `/admin`
3. Tab "System Management"
4. Xem "Logs hoạt động"

## ✅ Checklist Debug

- [ ] RPC function `log_user_activity` đã được tạo
- [ ] Bảng `user_activities` đã được tạo
- [ ] Console logs hiển thị khi login/logout/upload
- [ ] Không có lỗi trong console
- [ ] Database có records mới khi thực hiện actions
- [ ] Admin Panel hiển thị logs

## 🆘 Nếu vẫn không hoạt động

1. **Kiểm tra Server Console** (terminal chạy `npm run dev`)
   - Xem có lỗi gì không
   - Xem logs có hiển thị không

2. **Kiểm tra Browser Console** (F12)
   - Xem có lỗi JavaScript không
   - Xem Network tab → Xem request `/api/system/log-activity` có được gọi không

3. **Kiểm tra Database**
   - Chạy SQL queries ở trên
   - Xem có records mới không

4. **Kiểm tra Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - Đảm bảo các biến này đã được set đúng


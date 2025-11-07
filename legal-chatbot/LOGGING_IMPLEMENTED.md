# ✅ Logging đã được thêm vào các API

## 📋 Đã hoàn thành

### 1. ✅ Upload API (`src/app/api/upload-simple/route.ts`)
- **Đã thêm logging** khi user upload file
- **Activity type:** `upload`
- **Action:** `upload_document`
- **Details:** fileName, fileSize, fileType, title, chunksProcessed
- **Logs:** IP address, user agent, risk level

### 2. ✅ Chat API (`src/app/api/chat-enhanced/route.ts`)
- **Đã thêm logging** khi user gửi query
- **Activity type:** `query`
- **Action:** `chat_query`
- **Details:** query (giới hạn 500 ký tự), sourcesCount, searchMethod, matchedIds
- **Logs:** IP address, user agent, risk level

## 🔍 Cách hoạt động

### Upload API
1. User upload file
2. File được xử lý và lưu vào database
3. **Sau khi upload thành công**, hệ thống tự động log activity:
   - Lấy user_id từ authorization header
   - Log vào bảng `user_activities`
   - Không làm gián đoạn flow chính nếu logging fail

### Chat API
1. User gửi query
2. Query được xử lý và tìm kiếm trong database
3. **Sau khi xử lý query thành công**, hệ thống tự động log activity:
   - Lấy user_id từ request body
   - Log vào bảng `user_activities`
   - Không làm gián đoạn flow chính nếu logging fail

## 📊 Xem logs

### 1. Trong Admin Panel
- Truy cập: `/admin`
- Tab "System Management"
- Xem "Logs hoạt động"
- Filter theo:
  - User ID
  - Activity type (upload, query, etc.)
  - Risk level
  - Date range

### 2. Trong Database
```sql
-- Xem tất cả activities
SELECT * FROM user_activities ORDER BY created_at DESC LIMIT 50;

-- Xem upload activities
SELECT * FROM user_activities WHERE activity_type = 'upload' ORDER BY created_at DESC;

-- Xem query activities
SELECT * FROM user_activities WHERE activity_type = 'query' ORDER BY created_at DESC;

-- Xem activities của user cụ thể
SELECT * FROM user_activities WHERE user_id = 'USER_ID' ORDER BY created_at DESC;
```

## 🧪 Test logging

### 1. Test Upload API
```bash
# Upload file với authorization header
curl -X POST http://localhost:3000/api/upload-simple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.txt" \
  -F "title=Test Document"
```

### 2. Test Chat API
```bash
# Gửi query với userId
curl -X POST http://localhost:3000/api/chat-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Luật ngân hàng",
    "userId": "USER_ID"
  }'
```

### 3. Kiểm tra logs
```bash
# Chạy script test
node scripts/test-logging.js
```

## 📝 Lưu ý

1. **Logging không làm gián đoạn flow chính:**
   - Nếu logging fail, chỉ log error vào console
   - Không throw error để tránh ảnh hưởng đến user experience

2. **User ID:**
   - Upload API: Lấy từ authorization header
   - Chat API: Lấy từ request body
   - Nếu không có user_id, logging sẽ bị skip (không log)

3. **Activity Types hợp lệ:**
   - `login`
   - `logout`
   - `query` ✅
   - `upload` ✅
   - `delete`
   - `update`
   - `view`
   - `download`
   - `export`
   - `admin_action`

## 🔄 Tiếp theo

Nếu muốn thêm logging vào các API khác:
1. Import `supabaseAdmin` từ `@/lib/supabase`
2. Lấy `user_id` từ request
3. Gọi `supabaseAdmin.rpc('log_user_activity', {...})` sau khi action thành công
4. Wrap trong try-catch để không làm gián đoạn flow chính

## ✅ Checklist

- [x] Thêm logging vào Upload API
- [x] Thêm logging vào Chat API
- [x] Test logging hoạt động
- [x] Xử lý lỗi logging không làm gián đoạn flow
- [ ] Tạo bảng `system_logs` trong database (nếu cần)
- [ ] Thêm logging vào Auth APIs (login/logout) - có thể làm sau


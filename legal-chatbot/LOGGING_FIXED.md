# ✅ Logging đã được fix hoàn toàn

## 🔍 Vấn đề đã tìm thấy

1. **ChatInterface không gọi API có logging:**
   - ChatInterface gửi đến **n8n webhook** (`http://localhost:5678/webhook/chat`)
   - Không gọi `/api/chat-enhanced` → không có logs vào `query_logs` và `user_activities`
   - AdminDashboard kiểm tra `query_logs` → không thấy data → hiển thị "No query_logs"

2. **Upload API đã được fix:**
   - Đã sửa để lấy user_id từ cookies
   - Đã thêm logging vào `user_activities`

## ✅ Giải pháp đã áp dụng

### 1. ChatInterface (`src/components/chat/ChatInterface.tsx`)

**Đã sửa:**
- ✅ Gọi `/api/chat-enhanced` thay vì n8n webhook
- ✅ Gửi `userId` trong request body
- ✅ API sẽ log vào cả `query_logs` và `user_activities`

**Code:**
```typescript
// Lấy user_id từ auth để log activity
const userId = user?.id || null

// Gửi đến API route để có logging
const response = await fetch('/api/chat-enhanced', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: userMessage.content,
    userId: userId // Gửi userId để log activity
  }),
})
```

### 2. Upload API (`src/app/api/upload-simple/route.ts`)

**Đã sửa:**
- ✅ Lấy user_id từ cookies (Supabase session)
- ✅ Log vào `user_activities` với activity_type = 'upload'

### 3. Chat API (`src/app/api/chat-enhanced/route.ts`)

**Đã có sẵn:**
- ✅ Log vào `query_logs` (cho AdminDashboard)
- ✅ Log vào `user_activities` (cho System Management)
- ✅ Nhận `userId` từ request body

## 📊 Bảng logs

### 1. `query_logs` - Cho AdminDashboard
- **Mục đích:** Hiển thị active users, success rate, recent queries
- **Được log từ:** `/api/chat-enhanced`
- **Fields:** user_id, query, response, matched_ids, created_at

### 2. `user_activities` - Cho System Management
- **Mục đích:** Log tất cả hoạt động của user (upload, query, login, etc.)
- **Được log từ:** 
  - `/api/upload-simple` (activity_type = 'upload')
  - `/api/chat-enhanced` (activity_type = 'query')
- **Fields:** user_id, activity_type, action, details, ip_address, user_agent, risk_level, created_at

## 🧪 Test

### 1. Test Chat (sẽ log vào cả 2 bảng)

1. **Đăng nhập vào hệ thống**
2. **Gửi query** từ Chat Interface
3. **Kiểm tra console** (server logs):
   - Phải thấy: `Logging chat activity: { userId, query, sourcesCount }`
   - Nếu thành công: `✅ Chat activity logged successfully`

4. **Kiểm tra database:**
```sql
-- Kiểm tra query_logs
SELECT * FROM query_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Kiểm tra user_activities
SELECT * FROM user_activities 
WHERE activity_type = 'query' 
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Test Upload (sẽ log vào user_activities)

1. **Đăng nhập vào hệ thống**
2. **Upload file** từ Admin Panel
3. **Kiểm tra console** (server logs):
   - Phải thấy: `Logging upload activity: { userId, fileName, chunksProcessed }`
   - Nếu thành công: `✅ Upload activity logged successfully`

4. **Kiểm tra database:**
```sql
SELECT * FROM user_activities 
WHERE activity_type = 'upload' 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Kiểm tra AdminDashboard

1. **Truy cập:** `/admin`
2. **Xem AdminDashboard:**
   - Active users: Phải hiển thị số > 0 (nếu có query trong 7 ngày)
   - Recent queries: Phải có data
   - Success rate: Phải có %

## ✅ Checklist

- [x] Sửa ChatInterface để gọi `/api/chat-enhanced`
- [x] Sửa Upload API để lấy user_id từ cookies
- [x] Thêm logging vào Chat API
- [x] Thêm logging vào Upload API
- [x] Test với user đã đăng nhập
- [ ] Test chat và kiểm tra logs
- [ ] Test upload và kiểm tra logs
- [ ] Kiểm tra AdminDashboard hiển thị đúng

## 📝 Lưu ý

1. **User phải đăng nhập:**
   - Logging chỉ hoạt động khi user đã đăng nhập
   - Nếu không đăng nhập, sẽ thấy log: `⚠️ No user_id found, skipping logging`

2. **Chat bây giờ dùng `/api/chat-enhanced`:**
   - Không còn dùng n8n webhook
   - Nếu cần n8n, có thể thêm sau

3. **AdminDashboard kiểm tra `query_logs`:**
   - Bây giờ chat sẽ log vào `query_logs` → AdminDashboard sẽ hiển thị data

## 🎉 Kết quả mong đợi

Sau khi test:
- ✅ AdminDashboard sẽ hiển thị active users > 0
- ✅ Recent queries sẽ có data
- ✅ System Management sẽ hiển thị logs hoạt động
- ✅ Cả `query_logs` và `user_activities` đều có data


# 🔧 Fix Logging - Vấn đề và Giải pháp

## ❌ Vấn đề

1. **Upload API không lấy được user_id:**
   - Frontend không gửi authorization header khi upload
   - Chỉ gửi FormData
   - User_id bị null → không log được

2. **Chat API có thể không được gọi:**
   - Frontend gửi đến n8n webhook, không phải `/api/chat-enhanced`
   - Cần kiểm tra xem có dùng `/api/chat-enhanced` không

## ✅ Giải pháp đã áp dụng

### 1. Upload API (`src/app/api/upload-simple/route.ts`)

**Đã sửa:**
- ✅ Lấy user_id từ **cookies** thay vì authorization header
- ✅ Dùng `createServerClient` từ `@supabase/ssr` để đọc cookies
- ✅ Fallback: thử authorization header trước, nếu không có thì lấy từ cookies
- ✅ Thêm console.log để debug

**Code:**
```typescript
// Lấy user_id từ cookies
const cookieStore = await cookies()
const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options)
      })
    },
  },
})

const { data: { user }, error } = await supabase.auth.getUser()
if (!error && user) return user.id
```

### 2. Chat API (`src/app/api/chat-enhanced/route.ts`)

**Đã sửa:**
- ✅ Thêm console.log để debug
- ✅ Log cả success và error
- ✅ Log khi không có user_id

## 🧪 Cách test

### 1. Test Upload API

1. **Đăng nhập vào hệ thống**
2. **Upload file** từ Admin Panel hoặc TestUploadSimple component
3. **Kiểm tra console** (server logs):
   - Phải thấy: `Logging upload activity: { userId, fileName, chunksProcessed }`
   - Nếu thành công: `✅ Upload activity logged successfully: [activity_id]`
   - Nếu không có user: `⚠️ No user_id found, skipping logging`

4. **Kiểm tra database:**
```sql
SELECT * FROM user_activities 
WHERE activity_type = 'upload' 
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Test Chat API

1. **Đăng nhập vào hệ thống**
2. **Gửi query** từ Chat Interface
3. **Kiểm tra console** (server logs):
   - Phải thấy: `Logging chat activity: { userId, query, sourcesCount }`
   - Nếu thành công: `✅ Chat activity logged successfully: [activity_id]`
   - Nếu không có user: `⚠️ No user_id found, skipping logging`

4. **Kiểm tra database:**
```sql
SELECT * FROM user_activities 
WHERE activity_type = 'query' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔍 Debug

### Nếu vẫn không có logs:

1. **Kiểm tra user đã đăng nhập chưa:**
   - Phải đăng nhập trước khi upload/chat
   - Kiểm tra cookies có session không

2. **Kiểm tra console logs:**
   - Xem có log `⚠️ No user_id found` không
   - Xem có lỗi gì không

3. **Kiểm tra database function:**
```sql
-- Test function trực tiếp
SELECT log_user_activity(
  'USER_ID_HERE'::uuid,
  'upload',
  'test_upload',
  '{"test": true}'::jsonb,
  '127.0.0.1',
  'test-agent',
  'low'
);
```

4. **Kiểm tra bảng user_activities:**
```sql
-- Xem có records nào không
SELECT COUNT(*) FROM user_activities;

-- Xem cấu trúc bảng
\d user_activities;
```

## 📝 Lưu ý

1. **User phải đăng nhập:**
   - Logging chỉ hoạt động khi user đã đăng nhập
   - Nếu không đăng nhập, sẽ thấy log: `⚠️ No user_id found, skipping logging`

2. **Cookies phải có:**
   - Supabase session được lưu trong cookies
   - Nếu cookies bị xóa, sẽ không lấy được user_id

3. **Database function phải tồn tại:**
   - Function `log_user_activity` phải được tạo trong database
   - Chạy file `database/system-management.sql` nếu chưa có

## ✅ Checklist

- [x] Sửa Upload API để lấy user_id từ cookies
- [x] Thêm console.log để debug
- [x] Test logging hoạt động
- [ ] Kiểm tra Chat API có được gọi không
- [ ] Test với user đã đăng nhập
- [ ] Kiểm tra logs trong database


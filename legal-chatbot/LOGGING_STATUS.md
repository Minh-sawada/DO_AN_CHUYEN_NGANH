# 📊 Trạng thái hệ thống Logging

## ✅ Đã có sẵn

1. **Bảng `user_activities`** - ✅ Đã tồn tại
2. **Database function `log_user_activity`** - ✅ Đã tồn tại
3. **API `/api/system/log-activity`** - ✅ Đã tồn tại
4. **Function `logSystemEvent` trong `src/lib/logging.ts`** - ✅ Đã tồn tại

## ❌ Vấn đề cần fix

### 1. Bảng `system_logs` chưa được tạo trong database

**Giải pháp:**
Chạy SQL sau trong Supabase SQL Editor:

```sql
-- Tạo bảng system_logs
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warn', 'error')),
    category VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    details JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all system logs"
    ON system_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
```

Hoặc chạy file: `database/system-management.sql` (đã được cập nhật)

### 2. Logging chưa được gọi trong các API

**Các API cần thêm logging:**

#### a. Upload API (`src/app/api/upload-simple/route.ts`)
- Cần log khi upload file
- Activity type: `upload`
- Action: `upload_document`

#### b. Chat API (`src/app/api/chat-enhanced/route.ts`)
- Cần log khi user gửi query
- Activity type: `query`
- Action: `chat_query`

#### c. Auth APIs
- Login: `login` - `user_login`
- Logout: `logout` - `user_logout`

## 📝 Cách thêm logging vào API

### Ví dụ: Thêm logging vào Upload API

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // ... existing code ...
    
    // Lấy user_id từ session hoặc request
    const userId = request.headers.get('user-id') || null
    
    // Sau khi upload thành công, log activity
    if (userId) {
      try {
        await supabaseAdmin.rpc('log_user_activity', {
          p_user_id: userId,
          p_activity_type: 'upload',
          p_action: 'upload_document',
          p_details: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            chunksProcessed: processedChunks
          },
          p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          p_user_agent: request.headers.get('user-agent') || 'unknown',
          p_risk_level: 'low'
        })
      } catch (logError) {
        console.error('Failed to log upload activity:', logError)
        // Không throw - logging không nên làm gián đoạn flow chính
      }
    }
    
    return NextResponse.json({ 
      message: 'Files processed and uploaded successfully', 
      processedChunks 
    }, { status: 200 })
  } catch (error) {
    // ... error handling ...
  }
}
```

### Ví dụ: Thêm logging vào Chat API

```typescript
// Sau khi xử lý query thành công
if (userId) {
  try {
    await supabaseAdmin.rpc('log_user_activity', {
      p_user_id: userId,
      p_activity_type: 'query',
      p_action: 'chat_query',
      p_details: {
        query: query,
        sourcesCount: sources.length,
        searchMethod: localResults && localResults.length > 0 ? 'local' : 'external'
      },
      p_ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      p_user_agent: request.headers.get('user-agent') || 'unknown',
      p_risk_level: 'low'
    })
  } catch (logError) {
    console.error('Failed to log chat activity:', logError)
  }
}
```

## 🔍 Activity Types hợp lệ

Các `activity_type` được phép:
- `login`
- `logout`
- `query`
- `upload`
- `delete`
- `update`
- `view`
- `download`
- `export`
- `admin_action`

## ✅ Kiểm tra logging hoạt động

1. **Chạy script test:**
   ```bash
   node scripts/test-logging.js
   ```

2. **Kiểm tra trong database:**
   ```sql
   SELECT * FROM user_activities ORDER BY created_at DESC LIMIT 10;
   SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 10;
   ```

3. **Kiểm tra trong Admin Panel:**
   - Truy cập: `/admin`
   - Xem tab "System Management"
   - Xem "Logs hoạt động"

## 📋 Checklist

- [ ] Tạo bảng `system_logs` trong database
- [ ] Thêm logging vào Upload API
- [ ] Thêm logging vào Chat API
- [ ] Thêm logging vào Auth APIs (login/logout)
- [ ] Test logging hoạt động
- [ ] Kiểm tra logs trong Admin Panel


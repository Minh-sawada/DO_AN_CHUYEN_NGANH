# 📊 Cấu trúc Logging trong hệ thống

## ✅ Đã đúng cấu trúc

### 1. **Lịch sử Chat** → `query_logs`
- **Mục đích:** Lưu lịch sử các câu hỏi và câu trả lời
- **Được log từ:** `/api/chat-enhanced`
- **Hiển thị ở:** AdminPanel (tab "Query Logs")
- **Fields:**
  - `user_id` - ID người dùng
  - `query` - Câu hỏi
  - `response` - Câu trả lời
  - `matched_ids` - IDs của các văn bản pháp luật khớp
  - `sources_count` - Số lượng nguồn
  - `created_at` - Thời gian

**Code:**
```typescript
// /api/chat-enhanced/route.ts
await supabase.from('query_logs').insert({
  query: query,
  response: response,
  user_id: userId || null,
  sources_count: sources.length
})
```

### 2. **Logs hoạt động người dùng** → `user_activities`
- **Mục đích:** Log tất cả hoạt động của người dùng (upload, query, login, etc.)
- **Được log từ:** 
  - `/api/chat-enhanced` (activity_type = 'query')
  - `/api/upload-simple` (activity_type = 'upload')
- **Hiển thị ở:** SystemManagement (tab "Logs hoạt động")
- **Fields:**
  - `user_id` - ID người dùng
  - `activity_type` - Loại hoạt động ('login', 'logout', 'query', 'upload', etc.)
  - `action` - Hành động cụ thể ('chat_query', 'upload_document', etc.)
  - `details` - Chi tiết (JSONB)
  - `ip_address` - IP address
  - `user_agent` - User agent
  - `risk_level` - Mức độ rủi ro ('low', 'medium', 'high', 'critical')
  - `created_at` - Thời gian

**Code:**
```typescript
// /api/chat-enhanced/route.ts
await supabase.rpc('log_user_activity', {
  p_user_id: userId,
  p_activity_type: 'query',
  p_action: 'chat_query',
  p_details: {...},
  p_ip_address: clientIP,
  p_user_agent: clientUserAgent,
  p_risk_level: 'low'
})

// /api/upload-simple/route.ts
await supabaseAdmin.rpc('log_user_activity', {
  p_user_id: userId,
  p_activity_type: 'upload',
  p_action: 'upload_document',
  p_details: {...},
  p_ip_address: clientIP,
  p_user_agent: clientUserAgent,
  p_risk_level: 'low'
})
```

## 📋 So sánh 2 bảng

| Feature | `query_logs` | `user_activities` |
|---------|-------------|-------------------|
| **Mục đích** | Lịch sử chat | Logs hoạt động người dùng |
| **Hiển thị** | AdminPanel → Query Logs | SystemManagement → Logs hoạt động |
| **Dữ liệu** | Query, Response, Sources | Activity type, Action, Details, IP, User Agent |
| **Dùng cho** | Xem lịch sử chat | Theo dõi hoạt động, phát hiện bất thường |
| **Activity types** | Chỉ 'query' | 'login', 'logout', 'query', 'upload', 'delete', etc. |

## 🎯 Khi nào dùng bảng nào?

### **Dùng `query_logs` khi:**
- ✅ Xem lịch sử chat của user
- ✅ Xem câu hỏi và câu trả lời
- ✅ Xem các văn bản pháp luật được khớp
- ✅ AdminDashboard: Active users, Success rate, Recent queries

### **Dùng `user_activities` khi:**
- ✅ Xem tất cả hoạt động của user (upload, query, login, etc.)
- ✅ Theo dõi IP address, user agent
- ✅ Phát hiện hoạt động đáng nghi (suspicious activities)
- ✅ System Management: Logs hoạt động, Risk level

## 📊 Flow logging

### **Khi user chat:**
```
1. User gửi query
   ↓
2. /api/chat-enhanced xử lý
   ↓
3. Log vào query_logs (lịch sử chat)
   ↓
4. Log vào user_activities (logs hoạt động)
   ↓
5. Trả về response
```

### **Khi user upload:**
```
1. User upload file
   ↓
2. /api/upload-simple xử lý
   ↓
3. Log vào user_activities (logs hoạt động)
   ↓
4. Trả về kết quả
```

## ✅ Checklist

- [x] Chat log vào `query_logs` ✅
- [x] Chat log vào `user_activities` ✅
- [x] Upload log vào `user_activities` ✅
- [x] AdminPanel hiển thị `query_logs` ✅
- [x] SystemManagement hiển thị `user_activities` ✅

## 🎉 Kết luận

**Cấu trúc đã đúng:**
- ✅ **Lịch sử chat** → `query_logs` (AdminPanel)
- ✅ **Logs người dùng** → `user_activities` (SystemManagement)

**Cả hai bảng đều được log khi user chat:**
- `query_logs` → Lưu query, response, matched_ids
- `user_activities` → Lưu activity_type, action, details, IP, user_agent


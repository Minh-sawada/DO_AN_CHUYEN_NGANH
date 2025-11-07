# ✅ Cấu trúc Logging cuối cùng - Chỉ dùng 2 bảng

## 📊 Cấu trúc đơn giản

### **Chỉ dùng 2 bảng:**

1. **`query_logs`** - Lịch sử Chat
   - **Mục đích:** Lưu lịch sử các câu hỏi và câu trả lời
   - **Hiển thị:** AdminPanel → Tab "Query Logs"
   - **Fields:** `user_id`, `query`, `response`, `matched_ids`, `sources_count`, `created_at`

2. **`user_activities`** - Logs hoạt động người dùng
   - **Mục đích:** Log tất cả hoạt động của người dùng
   - **Hiển thị:** SystemManagement → Tab "Logs hoạt động"
   - **Fields:** `user_id`, `activity_type`, `action`, `details`, `ip_address`, `user_agent`, `risk_level`, `created_at`

## ✅ Đã xóa

- ❌ **`system_logs`** - Đã xóa khỏi schema
  - Lý do: `user_activities` đã đủ cho tất cả hoạt động user
  - Function `logSystemEvent` đã được deprecated

## 📋 Mapping hoạt động → Bảng

| Hoạt động | Bảng | Activity Type | Action |
|-----------|------|---------------|--------|
| **Chat** | `query_logs` + `user_activities` | `query` | `chat_query` |
| **Upload** | `user_activities` | `upload` | `upload_document` |
| **Login** | `user_activities` | `login` | `user_login` |
| **Logout** | `user_activities` | `logout` | `user_logout` |

## 🔍 Chi tiết logging

### **1. Chat → Log vào cả 2 bảng**

**`query_logs` (Lịch sử chat):**
```typescript
// /api/chat-enhanced/route.ts
await supabase.from('query_logs').insert({
  query: query,
  response: response,
  user_id: userId || null,
  sources_count: sources.length
})
```

**`user_activities` (Logs hoạt động):**
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
```

### **2. Upload → Chỉ log vào `user_activities`**

```typescript
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

### **3. Login → Chỉ log vào `user_activities`**

```typescript
// AuthProvider.tsx - onAuthStateChange
if (event === 'SIGNED_IN' && session?.user) {
  await fetch('/api/system/log-activity', {
    method: 'POST',
    body: JSON.stringify({
      user_id: session.user.id,
      activity_type: 'login',
      action: 'user_login',
      risk_level: 'low'
    })
  })
}
```

### **4. Logout → Chỉ log vào `user_activities`**

```typescript
// AuthProvider.tsx - signOut()
await fetch('/api/system/log-activity', {
  method: 'POST',
  body: JSON.stringify({
    user_id: user.id,
    activity_type: 'logout',
    action: 'user_logout',
    risk_level: 'low'
  })
})
```

## 📊 Xem logs

### **1. Lịch sử Chat**
- **Bảng:** `query_logs`
- **Hiển thị:** AdminPanel → Tab "Query Logs"
- **Dùng cho:** Xem lịch sử chat, AdminDashboard (active users, success rate)

### **2. Logs hoạt động người dùng**
- **Bảng:** `user_activities`
- **Hiển thị:** SystemManagement → Tab "Logs hoạt động"
- **Dùng cho:** Theo dõi hoạt động, phát hiện bất thường, IP tracking

## ✅ Checklist

- [x] Chỉ dùng 2 bảng: `query_logs` và `user_activities`
- [x] Xóa `system_logs` khỏi schema
- [x] Deprecate `logSystemEvent` function
- [x] Chat log vào cả 2 bảng
- [x] Upload log vào `user_activities`
- [x] Login log vào `user_activities`
- [x] Logout log vào `user_activities`

## 🎉 Kết luận

**Cấu trúc đơn giản và đủ dùng:**
- ✅ **Lịch sử chat** → `query_logs` (AdminPanel)
- ✅ **Logs hoạt động** → `user_activities` (SystemManagement)

**Không cần:**
- ❌ `system_logs` - Đã xóa

**Đủ cho tất cả nhu cầu:**
- ✅ Log user activities (login, logout, upload, query)
- ✅ Theo dõi IP address, user agent
- ✅ Phát hiện hoạt động đáng nghi
- ✅ Lịch sử chat
- ✅ AdminDashboard statistics


# ✅ Cấu trúc Logging đơn giản - Chỉ dùng 2 bảng

## 📊 Cấu trúc logging

### **Chỉ dùng 2 bảng:**

1. **`query_logs`** - Lịch sử Chat
   - Lưu query, response, matched_ids
   - Dùng cho: AdminDashboard (active users, success rate, recent queries)

2. **`user_activities`** - Logs hoạt động người dùng
   - Lưu tất cả hoạt động user (login, logout, upload, query, etc.)
   - Có: IP address, user agent, risk level, activity type
   - Dùng cho: System Management (logs hoạt động, phát hiện bất thường)

## ✅ Đã xóa

- ❌ **`system_logs`** - Đã xóa (không cần thiết)
  - Lý do: `user_activities` đã đủ cho tất cả hoạt động user
  - Không cần thêm bảng phức tạp

## 📋 Mapping hoạt động → Bảng

| Hoạt động | Bảng | Activity Type | Action |
|-----------|------|---------------|--------|
| **Chat** | `query_logs` + `user_activities` | `query` | `chat_query` |
| **Upload** | `user_activities` | `upload` | `upload_document` |
| **Login** | `user_activities` | `login` | `user_login` |
| **Logout** | `user_activities` | `logout` | `user_logout` |

## 🔍 Chi tiết

### **1. Chat → Log vào cả 2 bảng**

**`query_logs`:**
```typescript
await supabase.from('query_logs').insert({
  query: query,
  response: response,
  user_id: userId,
  sources_count: sources.length
})
```

**`user_activities`:**
```typescript
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
await fetch('/api/system/log-activity', {
  method: 'POST',
  body: JSON.stringify({
    user_id: userId,
    activity_type: 'login',
    action: 'user_login',
    risk_level: 'low'
  })
})
```

### **4. Logout → Chỉ log vào `user_activities`**

```typescript
await fetch('/api/system/log-activity', {
  method: 'POST',
  body: JSON.stringify({
    user_id: userId,
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
- **Fields:** query, response, matched_ids, sources_count

### **2. Logs hoạt động người dùng**
- **Bảng:** `user_activities`
- **Hiển thị:** SystemManagement → Tab "Logs hoạt động"
- **Fields:** activity_type, action, details, ip_address, user_agent, risk_level

## ✅ Checklist

- [x] Chỉ dùng 2 bảng: `query_logs` và `user_activities`
- [x] Xóa `system_logs` khỏi schema
- [x] Chat log vào cả 2 bảng
- [x] Upload log vào `user_activities`
- [x] Login log vào `user_activities`
- [x] Logout log vào `user_activities`

## 🎉 Kết luận

**Cấu trúc đơn giản:**
- ✅ **Lịch sử chat** → `query_logs` (AdminPanel)
- ✅ **Logs hoạt động** → `user_activities` (SystemManagement)

**Không cần:**
- ❌ `system_logs` - Đã xóa

**Đủ cho tất cả nhu cầu:**
- ✅ Log user activities (login, logout, upload, query)
- ✅ Theo dõi IP address, user agent
- ✅ Phát hiện hoạt động đáng nghi
- ✅ Lịch sử chat


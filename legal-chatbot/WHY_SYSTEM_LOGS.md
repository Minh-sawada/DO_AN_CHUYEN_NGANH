# 🤔 Tại sao cần bảng `system_logs` khi đã có 2 bảng?

## 📊 So sánh 3 bảng

### 1. **`query_logs`** - Lịch sử Chat
- **Mục đích:** Lưu lịch sử các câu hỏi và câu trả lời
- **Fields:** `user_id`, `query`, `response`, `matched_ids`, `sources_count`, `created_at`
- **Dùng cho:** Xem lịch sử chat, AdminDashboard (active users, success rate)
- **Không có:** IP address, user agent, risk level, activity type

### 2. **`user_activities`** - Logs hoạt động người dùng
- **Mục đích:** Log tất cả hoạt động của người dùng
- **Fields:** `user_id`, `activity_type`, `action`, `details`, `ip_address`, `user_agent`, `risk_level`, `created_at`
- **Dùng cho:** System Management, theo dõi hoạt động, phát hiện bất thường
- **Có:** IP address, user agent, risk level, activity type

### 3. **`system_logs`** - Log hệ thống
- **Mục đích:** Log system events với level (info/warn/error)
- **Fields:** `user_id`, `level` (info/warn/error), `category`, `action`, `details`, `error`, `created_at`
- **Dùng cho:** System errors, warnings, info logs, events không liên quan đến user
- **Có:** Level (info/warn/error), category, error field

## 🔍 Sự khác biệt chính

| Feature | `query_logs` | `user_activities` | `system_logs` |
|---------|-------------|-------------------|---------------|
| **Mục đích** | Lịch sử chat | Hoạt động user | System events |
| **Level** | ❌ | ❌ | ✅ (info/warn/error) |
| **Category** | ❌ | ❌ | ✅ (auth, file_upload, chat, admin, system) |
| **IP/User Agent** | ❌ | ✅ | ❌ |
| **Risk Level** | ❌ | ✅ | ❌ |
| **Error Field** | ❌ | ❌ | ✅ |
| **Activity Type** | ❌ | ✅ | ❌ |

## 💡 Khi nào cần `system_logs`?

### **Cần `system_logs` khi:**
1. ✅ **Log system errors** (không phải user activity)
   - Database errors
   - API errors
   - System warnings

2. ✅ **Log theo level** (info/warn/error)
   - Info: Thông tin hệ thống
   - Warn: Cảnh báo
   - Error: Lỗi hệ thống

3. ✅ **Log theo category** (auth, file_upload, chat, admin, system)
   - Phân loại logs theo module
   - Dễ filter và tìm kiếm

4. ✅ **Log events không liên quan đến user**
   - System startup/shutdown
   - Background jobs
   - Scheduled tasks

### **KHÔNG cần `system_logs` nếu:**
- ❌ Chỉ cần log user activities → Dùng `user_activities`
- ❌ Chỉ cần lịch sử chat → Dùng `query_logs`
- ❌ Không cần level (info/warn/error) → Dùng `user_activities`

## 🎯 Khuyến nghị

### **Option 1: Chỉ dùng 2 bảng** (Đơn giản hơn) ⭐
```
query_logs      → Lịch sử chat
user_activities → Tất cả hoạt động user (login, logout, upload, query, etc.)
```

**Ưu điểm:**
- ✅ Đơn giản, dễ quản lý
- ✅ Đủ cho hầu hết các trường hợp
- ✅ Không cần thêm bảng

**Nhược điểm:**
- ❌ Không có level (info/warn/error)
- ❌ Không có category
- ❌ Không có error field riêng

### **Option 2: Dùng cả 3 bảng** (Đầy đủ hơn)
```
query_logs      → Lịch sử chat
user_activities → Hoạt động user (có IP, user agent, risk level)
system_logs     → System events (có level, category, error)
```

**Ưu điểm:**
- ✅ Phân loại rõ ràng
- ✅ Có level (info/warn/error)
- ✅ Có category
- ✅ Có error field

**Nhược điểm:**
- ❌ Phức tạp hơn
- ❌ Cần quản lý 3 bảng
- ❌ Có thể trùng lặp với `user_activities`

## 📝 Ví dụ sử dụng

### **Dùng `user_activities` cho:**
```typescript
// User login
await log_user_activity({
  activity_type: 'login',
  action: 'user_login',
  ip_address: '...',
  user_agent: '...',
  risk_level: 'low'
})

// User upload
await log_user_activity({
  activity_type: 'upload',
  action: 'upload_document',
  ip_address: '...',
  user_agent: '...',
  risk_level: 'low'
})
```

### **Dùng `system_logs` cho:**
```typescript
// System error
await logSystemEvent({
  level: LogLevel.ERROR,
  category: LogCategory.SYSTEM,
  action: 'database_connection_failed',
  error: 'Connection timeout'
})

// System warning
await logSystemEvent({
  level: LogLevel.WARN,
  category: LogCategory.FILE_UPLOAD,
  action: 'large_file_uploaded',
  details: { fileSize: 10000000 }
})

// System info
await logSystemEvent({
  level: LogLevel.INFO,
  category: LogCategory.SYSTEM,
  action: 'backup_completed',
  details: { backupSize: 5000000 }
})
```

## ✅ Kết luận

**Hiện tại:**
- ✅ `query_logs` - Đã dùng cho lịch sử chat
- ✅ `user_activities` - Đã dùng cho hoạt động user (login, logout, upload, query)
- ⚠️ `system_logs` - **CHƯA CẦN THIẾT** nếu chỉ cần log user activities

**Khuyến nghị:**
- **Nếu chỉ cần log user activities:** Dùng `user_activities` là đủ
- **Nếu cần log system errors/warnings:** Thêm `system_logs`
- **Nếu muốn đơn giản:** Bỏ `system_logs`, chỉ dùng 2 bảng

**Có thể xóa `system_logs` nếu:**
- Không cần log system errors
- Không cần level (info/warn/error)
- Không cần category
- Chỉ cần log user activities


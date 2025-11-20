# ✅ Logging cho Login/Logout đã được thêm

## 🔍 Vấn đề

- **Login/Logout không được log vào `user_activities`**
- System Management không thấy logs hoạt động login/logout

## ✅ Giải pháp đã áp dụng

### 1. **Login Logging** (`src/components/auth/AuthProvider.tsx`)

**Đã thêm:**
- ✅ Log khi `SIGNED_IN` event xảy ra
- ✅ Activity type: `login`
- ✅ Action: `user_login`
- ✅ Log vào `user_activities` qua API `/api/system/log-activity`

**Code:**
```typescript
// Trong onAuthStateChange
if (event === 'SIGNED_IN' && session?.user) {
  console.log('User signed in, logging activity...')
  await logActivity(session.user.id, 'login', 'user_login')
}
```

### 2. **Logout Logging** (`src/components/auth/AuthProvider.tsx`)

**Đã thêm:**
- ✅ Log trong `signOut()` function **trước khi** gọi `supabase.auth.signOut()`
- ✅ Activity type: `logout`
- ✅ Action: `user_logout`
- ✅ Log vào `user_activities` qua API `/api/system/log-activity`

**Code:**
```typescript
const signOut = async () => {
  // Log logout activity trước khi sign out
  if (user?.id) {
    try {
      await fetch('/api/system/log-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          activity_type: 'logout',
          action: 'user_logout',
          details: {
            timestamp: new Date().toISOString(),
            event: 'logout'
          },
          risk_level: 'low'
        })
      })
    } catch (error) {
      console.error('Failed to log logout activity:', error)
    }
  }
  
  await supabase.auth.signOut()
}
```

## 📊 Flow logging

### **Khi user login:**
```
1. User nhập email/password
   ↓
2. supabase.auth.signInWithPassword()
   ↓
3. SIGNED_IN event được trigger
   ↓
4. onAuthStateChange listener
   ↓
5. Log vào user_activities (activity_type='login')
   ↓
6. Session được set
```

### **Khi user logout:**
```
1. User click "Đăng xuất"
   ↓
2. signOut() function được gọi
   ↓
3. Log vào user_activities (activity_type='logout')
   ↓
4. supabase.auth.signOut()
   ↓
5. SIGNED_OUT event được trigger
   ↓
6. Session được clear
```

## 🧪 Test

### 1. Test Login

1. **Đăng nhập vào hệ thống**
2. **Kiểm tra console** (browser console):
   - Phải thấy: `User signed in, logging activity...`
3. **Kiểm tra database:**
```sql
SELECT * FROM user_activities 
WHERE activity_type = 'login' 
ORDER BY created_at DESC 
LIMIT 10;
```

### 2. Test Logout

1. **Đăng nhập vào hệ thống**
2. **Click "Đăng xuất"**
3. **Kiểm tra console** (browser console):
   - Phải thấy: Log request được gửi
4. **Kiểm tra database:**
```sql
SELECT * FROM user_activities 
WHERE activity_type = 'logout' 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Kiểm tra System Management

1. **Truy cập:** `/admin` → System Management
2. **Tab "Logs hoạt động"**
3. **Filter theo activity_type:**
   - Chọn `login` → Phải thấy logs đăng nhập
   - Chọn `logout` → Phải thấy logs đăng xuất

## ✅ Checklist

- [x] Thêm logging cho login (SIGNED_IN event)
- [x] Thêm logging cho logout (signOut function)
- [x] Log vào user_activities qua API
- [x] Test với user đã đăng nhập
- [ ] Test login và kiểm tra logs
- [ ] Test logout và kiểm tra logs
- [ ] Kiểm tra System Management hiển thị logs

## 📝 Lưu ý

1. **Login logging:**
   - Log khi SIGNED_IN event xảy ra
   - Có thể log nhiều lần nếu user refresh page (token refresh)

2. **Logout logging:**
   - Log **trước khi** signOut() để có user_id
   - Nếu không có user_id, sẽ không log

3. **IP Address và User Agent:**
   - API `/api/system/log-activity` tự động lấy từ request headers
   - Không cần truyền từ client

## 🎉 Kết quả mong đợi

Sau khi test:
- ✅ Login được log vào `user_activities`
- ✅ Logout được log vào `user_activities`
- ✅ System Management hiển thị logs login/logout
- ✅ Có thể filter theo activity_type='login' hoặc 'logout'


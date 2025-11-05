# Troubleshooting: Lỗi "Unauthorized - Please login first"

## Nguyên nhân có thể

1. **Session hết hạn** - Session đã expire
2. **Cookies không được gửi** - Browser không gửi cookies
3. **Middleware chặn request** - Middleware check session trước API route

## Cách kiểm tra

### Bước 1: Kiểm tra Console Logs

Mở Browser Console (F12) và xem logs khi click đổi role:
- Có thấy "Sending request with session"?
- Response status là gì? (401, 403, hay 200?)

### Bước 2: Kiểm tra Session

Trong Browser Console, chạy:
```javascript
// Kiểm tra session
const { data: { session } } = await supabase.auth.getSession()
console.log('Current session:', session)
```

### Bước 3: Kiểm tra Cookies

Trong Browser DevTools:
- Application → Cookies → xem có cookies từ Supabase không
- Cookies có tên như `sb-xxx-auth-token` hoặc tương tự

### Bước 4: Kiểm tra Server Logs

Trong terminal chạy dev server, xem có logs:
- "Session check:" với thông tin session
- "Session error:" nếu có lỗi

## Giải pháp

### Giải pháp 1: Refresh Session

1. **Đăng xuất hoàn toàn:**
   - Click đăng xuất
   - Clear browser cache
   - Clear cookies của site

2. **Đăng nhập lại:**
   - Đăng nhập với tài khoản admin
   - Đảm bảo đăng nhập thành công

3. **Thử lại:**
   - Vào Admin Panel → Quản trị hệ thống → Quản lý người dùng
   - Thử đổi role

### Giải pháp 2: Kiểm tra Role

Đảm bảo bạn đang đăng nhập với tài khoản có role = 'admin':

```sql
-- Chạy trong Supabase SQL Editor
SELECT id, email, role FROM profiles WHERE role = 'admin';
```

### Giải pháp 3: Kiểm tra Environment Variables

Đảm bảo `.env.local` có đầy đủ:
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

Sau đó restart dev server:
```bash
npm run dev
```

### Giải pháp 4: Bypass Middleware (Tạm thời để test)

Nếu vẫn lỗi, có thể middleware đang chặn. Tạm thời comment middleware check:

```typescript
// Trong middleware.ts, comment phần này:
// if (req.nextUrl.pathname.startsWith('/api/admin')) {
//   ...
// }
```

Sau đó test lại. Nếu OK thì vấn đề là ở middleware.

## Debug Steps

1. **Mở Browser Console**
2. **Click đổi role của một user**
3. **Xem logs:**
   - Client-side logs: "Sending request with session"
   - Server-side logs: "Session check:"
4. **Kiểm tra response:**
   - Status code?
   - Error message?

## Nếu vẫn lỗi

Gửi cho tôi:
1. Console logs (client-side)
2. Terminal logs (server-side)
3. Response status code và error message
4. Thông tin session (có hay không, user ID)

## Quick Fix

Nếu cần fix nhanh, thử:

1. **Hard refresh:** `Ctrl + Shift + R`
2. **Clear cache và cookies**
3. **Đăng nhập lại**
4. **Restart dev server:** `npm run dev`


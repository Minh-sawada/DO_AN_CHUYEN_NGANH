# 🔐 Thiết Lập Chức Năng Tự Động Khóa Tài Khoản

## 1. Chạy lại script `system-management.sql`

Để cập nhật các function mới (auto ban, log login attempt), mở Supabase SQL Editor và chạy file:

```
database/system-management.sql
```

Lưu ý: script idempotent, có thể chạy lại bất cứ lúc nào.

## 2. Tính năng mới

- Tự động khóa tạm thời (1h) nếu đăng nhập sai quá 5 lần trong 5 phút
- API kiểm tra trạng thái khóa (`/api/auth/check-ban`)
- Ghi log cho tất cả lần đăng nhập (thành công/thất bại)
- Admin có thể xem và mở khóa trong tab **Admin → System Management → User bị ban**

## 3. Thông báo cho người dùng

Khi bị khóa, form đăng nhập sẽ báo:

> “Tài khoản bị khóa tạm thời do đăng nhập sai quá nhiều lần. Mở khóa sau …”

Admin cũng có thể khóa thủ công trong Admin Panel.

## 4. Kiểm tra

1. Cố đăng nhập sai >5 lần trong 5 phút → tài khoản sẽ bị khóa.
2. Vào `/admin` → tab **Hỗ Trợ** hoặc **System Management** để xem user bị ban và thao tác mở khóa.



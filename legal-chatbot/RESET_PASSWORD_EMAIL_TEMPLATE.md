# Hướng dẫn cấu hình Email Template Reset Password

## Bước 1: Vào Supabase Dashboard

1. Đăng nhập vào [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **Authentication** → **Email Templates**
4. Chọn tab **"Reset password"**

## Bước 2: Cấu hình Subject

**Subject heading:**
```
Đặt lại mật khẩu cho tài khoản của bạn
```

## Bước 3: Cấu hình Message Body

Copy template dưới đây vào phần **Message body** (tab Source):

**LƯU Ý QUAN TRỌNG:** Sử dụng `{{ .ConfirmationURL }}` để Supabase tự động xử lý authentication flow. 

```html
<h2>Đặt lại mật khẩu</h2>

<p>Xin chào,</p>

<p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>

<p>Nhấp vào link bên dưới để đặt lại mật khẩu:</p>

<p><a href="{{ .ConfirmationURL }}">Đặt lại mật khẩu</a></p>

<p>Link này sẽ hết hạn sau <strong>1 giờ</strong>.</p>

<p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">

<p style="color: #666; font-size: 12px;">
  Đây là email tự động, vui lòng không trả lời email này.
</p>
```

**Giải thích:**
- `{{ .ConfirmationURL }}` sẽ tự động chứa code hoặc token_hash tùy theo cấu hình Supabase
- Ứng dụng sẽ tự động xử lý và redirect đến trang reset password
- Không cần customize URL thủ công

## Bước 4: Cấu hình Redirect URL

1. Vào **Authentication** → **URL Configuration**
2. Trong phần **Redirect URLs**, thêm:
   ```
   http://localhost:3000/reset-password
   ```
   (hoặc domain production của bạn)

3. Trong phần **Site URL**, đặt:
   ```
   http://localhost:3000
   ```
   (hoặc domain production của bạn)

## Bước 5: Test

1. Nhấp vào tab **Preview** để xem email preview
2. Test bằng cách:
   - Vào trang login
   - Click "Quên mật khẩu?"
   - Nhập email
   - Kiểm tra email và click link

## Template nâng cao (có styling đẹp hơn)

Nếu muốn email đẹp hơn, có thể dùng template này:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Đặt lại mật khẩu</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Xin chào,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình tại <strong>Legal Chatbot</strong>.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 30px;">
      Nhấp vào nút bên dưới để đặt lại mật khẩu:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Đặt lại mật khẩu
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 30px; margin-bottom: 10px;">
      <strong>Lưu ý:</strong> Link này sẽ hết hạn sau <strong>1 giờ</strong>.
    </p>
    
    <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
      Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.
    </p>
    
    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
      <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
        Đây là email tự động, vui lòng không trả lời email này.<br>
        © Legal Chatbot - Hệ thống tư vấn pháp luật
      </p>
    </div>
  </div>

</body>
</html>
```

## Lưu ý quan trọng

1. **Redirect URL**: Phải khớp với URL trong code (`/reset-password`)
2. **Token trong URL**: Supabase sẽ tự động thêm token vào URL dạng:
   ```
   http://yourdomain.com/reset-password#access_token=xxx&type=recovery
   ```
3. **Production**: Nhớ cập nhật URL khi deploy lên production
4. **SMTP**: Nên setup SMTP custom cho production (không dùng built-in email service)

## Troubleshooting

- **Link không hoạt động**: Kiểm tra Redirect URLs trong Supabase Settings
- **Token expired**: Link chỉ có hiệu lực 1 giờ, yêu cầu lại email mới
- **Email không đến**: Kiểm tra spam folder, hoặc setup SMTP custom


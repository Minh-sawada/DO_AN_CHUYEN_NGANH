# 🔧 Hướng dẫn cập nhật Supabase

## Bước 1: Lấy thông tin từ Supabase

### 1.1. Truy cập Supabase Dashboard
- Vào: https://supabase.com/dashboard
- Đăng nhập tài khoản của bạn

### 1.2. Chọn project
- Click vào project mà bạn đã tạo

### 1.3. Vào Settings > API
- Click **Settings** ở sidebar bên trái
- Click **API** trong menu Settings

### 1.4. Copy các thông tin sau:

```
Project URL: https://your-project-id.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Bước 2: Cập nhật file .env.local

### 2.1. Mở file .env.local
- Trong VS Code, mở file `.env.local` trong thư mục `legal-chatbot`

### 2.2. Thay thế các giá trị:

```env
# Thay thế dòng này:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url

# Bằng URL thực tế của bạn:
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
```

```env
# Thay thế dòng này:
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Bằng anon key thực tế:
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5MjU5MjAwMCwiZXhwIjoyMDA4MTY4MDAwfQ.example
```

```env
# Thay thế dòng này:
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Bằng service role key thực tế:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjkyNTkyMDAwLCJleHAiOjIwMDgxNjgwMDB9.example
```

## Bước 3: Ví dụ file .env.local hoàn chỉnh

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5MjU5MjAwMCwiZXhwIjoyMDA4MTY4MDAwfQ.example
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjkyNTkyMDAwLCJleHAiOjIwMDgxNjgwMDB9.example

# OpenAI Configuration
OPENAI_API_KEY=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

# n8n Webhook URL (optional)
N8N_WEBHOOK_URL=your_n8n_webhook_url

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Bước 4: Setup Database

### 4.1. Vào SQL Editor
- Trong Supabase Dashboard, click **SQL Editor** ở sidebar

### 4.2. Chạy schema.sql
- Mở file `database/schema.sql` trong VS Code
- Copy toàn bộ nội dung
- Paste vào SQL Editor
- Click **Run** để chạy

### 4.3. Chạy functions.sql
- Mở file `database/functions.sql` trong VS Code
- Copy toàn bộ nội dung
- Paste vào SQL Editor
- Click **Run** để chạy

## Bước 5: Test

### 5.1. Chạy ứng dụng
```bash
cd legal-chatbot
npm run dev
```

### 5.2. Truy cập ứng dụng
- Mở browser: http://localhost:3000
- Đăng ký tài khoản mới
- Test đăng nhập/đăng xuất

### 5.3. Tạo admin user
- Vào Supabase Dashboard > **Authentication** > **Users**
- Tìm user vừa tạo, copy **User ID**
- Vào **SQL Editor**, chạy:
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id-here';
```

### 5.4. Test admin panel
- Truy cập http://localhost:3000/admin
- Upload file PDF/Word test
- Test chat với tài liệu đã upload

## ❗ Lưu ý quan trọng:

1. **URL phải có https://** - không được thiếu
2. **Keys phải đầy đủ** - không được cắt ngắn
3. **Không có khoảng trắng** thừa ở đầu/cuối
4. **Lưu file** sau khi chỉnh sửa

## 🆘 Nếu vẫn lỗi:

1. Kiểm tra lại URL có đúng format không
2. Kiểm tra keys có đầy đủ không
3. Restart terminal: `Ctrl+C` rồi `npm run dev` lại
4. Xóa folder `.next` và chạy lại

## ✅ Kết quả mong đợi:

Sau khi cập nhật đúng, bạn sẽ thấy:
- Không còn lỗi "Invalid supabaseUrl"
- Ứng dụng chạy thành công tại http://localhost:3000
- Có thể đăng ký/đăng nhập
- Admin panel hoạt động
- Chat interface hiển thị đẹp

# Hướng dẫn Setup Legal Chatbot

## 🚀 Bước 1: Cập nhật Environment Variables

Mở file `.env.local` và cập nhật các thông tin sau:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI Configuration (đã có sẵn)
OPENAI_API_KEY=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

# n8n Webhook URL (tùy chọn)
N8N_WEBHOOK_URL=your_n8n_webhook_url

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Lấy thông tin Supabase:
1. Vào [Supabase Dashboard](https://supabase.com/dashboard)
2. Chọn project của bạn
3. Vào **Settings** > **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## 🗄️ Bước 2: Setup Database

### 2.1. Kích hoạt pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2.2. Chạy schema SQL:
Copy và chạy nội dung file `database/schema.sql` trong SQL Editor của Supabase.

### 2.3. Chạy functions SQL:
Copy và chạy nội dung file `database/functions.sql` trong SQL Editor của Supabase.

## 🏃‍♂️ Bước 3: Chạy ứng dụng

```bash
# Cài đặt dependencies (nếu chưa)
npm install

# Chạy development server
npm run dev
```

Ứng dụng sẽ chạy tại: http://localhost:3000

## 👤 Bước 4: Tạo Admin User

1. Truy cập http://localhost:3000
2. Đăng ký tài khoản mới
3. Vào Supabase Dashboard > **Authentication** > **Users**
4. Tìm user vừa tạo và copy User ID
5. Vào SQL Editor và chạy:
```sql
UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id-here';
```

## 📁 Bước 5: Upload tài liệu pháp luật

1. Đăng nhập với tài khoản admin
2. Truy cập http://localhost:3000/admin
3. Upload file PDF hoặc Word (.docx, .doc)
4. Hệ thống sẽ tự động:
   - Extract text từ file
   - Chia thành chunks
   - Tạo embeddings
   - Lưu vào database

## 🤖 Bước 6: Test Chat

1. Truy cập trang chủ http://localhost:3000
2. Đăng nhập
3. Hỏi câu hỏi về pháp luật
4. AI sẽ tìm kiếm và trả lời dựa trên tài liệu đã upload

## 🔗 Bước 7: Tích hợp n8n (Tùy chọn)

Nếu bạn muốn sử dụng n8n AI agent:

1. Tạo webhook trong n8n
2. Cập nhật `N8N_WEBHOOK_URL` trong `.env.local`
3. Webhook endpoint: `http://localhost:3000/api/webhook`

### Test webhook:
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Luật giao thông đường bộ",
    "userId": "optional-user-id",
    "sessionId": "optional-session-id"
  }'
```

## 🐳 Bước 8: Deploy với Docker (Tùy chọn)

```bash
# Build Docker image
npm run docker:build

# Chạy container
npm run docker:run
```

## 📊 Bước 9: Monitoring và Analytics

- **Admin Panel**: http://localhost:3000/admin
  - Xem thống kê hệ thống
  - Quản lý tài liệu pháp luật
  - Theo dõi lịch sử truy vấn

## 🔧 Troubleshooting

### Lỗi "Invalid supabaseUrl":
- Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` trong `.env.local`
- URL phải có format: `https://your-project-id.supabase.co`

### Lỗi "Vector search failed":
- Kiểm tra pgvector extension đã được kích hoạt
- Chạy lại `database/functions.sql`

### Lỗi "No laws found":
- Upload ít nhất một file PDF/Word trong Admin Panel
- Kiểm tra file có text content

### Lỗi "OpenAI API error":
- Kiểm tra `OPENAI_API_KEY` trong `.env.local`
- Đảm bảo API key còn hạn sử dụng

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Console logs trong browser (F12)
2. Terminal logs khi chạy `npm run dev`
3. Supabase Dashboard > Logs
4. OpenAI API usage dashboard

---

**🎉 Chúc mừng! Bạn đã setup thành công Legal Chatbot!**

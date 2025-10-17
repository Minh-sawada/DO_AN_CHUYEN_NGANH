# Legal Chatbot - Hệ thống Hỏi đáp Pháp luật

Hệ thống chatbot thông minh sử dụng AI để trả lời các câu hỏi về pháp luật Việt Nam. Ứng dụng được xây dựng với Next.js, Supabase, và OpenAI.

## 🚀 Tính năng chính

- **Chat Interface**: Giao diện chat thân thiện để hỏi đáp về pháp luật
- **Vector Search**: Tìm kiếm thông minh dựa trên embedding từ OpenAI
- **Document Upload**: Upload và xử lý file PDF/Word cho admin
- **Authentication**: Hệ thống đăng nhập/đăng ký với Supabase Auth
- **Admin Panel**: Trang quản trị để upload tài liệu và theo dõi hệ thống
- **n8n Integration**: Webhook endpoint để tích hợp với n8n workflows

## 🛠️ Công nghệ sử dụng

- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: TailwindCSS, shadcn/ui
- **Database**: Supabase (PostgreSQL + pgvector)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-3.5-turbo, text-embedding-3-small
- **File Processing**: pdf-parse, mammoth
- **Vector Search**: pgvector với HNSW index

## 📋 Yêu cầu hệ thống

- Node.js 18+
- npm hoặc yarn
- Tài khoản Supabase
- API key OpenAI
- Tài khoản n8n (tùy chọn)

## ⚙️ Cài đặt

### 1. Clone repository

```bash
git clone <repository-url>
cd legal-chatbot
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình môi trường

Tạo file `.env.local` từ `env.example`:

```bash
cp env.example .env.local
```

Cập nhật các giá trị trong `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# n8n Webhook URL (optional)
N8N_WEBHOOK_URL=your_n8n_webhook_url

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Thiết lập Supabase

1. Tạo project mới trên [Supabase](https://supabase.com)
2. Kích hoạt pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Chạy các file SQL trong thư mục `database/`:
   - `database/schema.sql` - Tạo tables và RLS policies
   - `database/functions.sql` - Tạo functions cho vector search

### 5. Chạy ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

## 📁 Cấu trúc thư mục

```
legal-chatbot/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── chat/      # Chat endpoint
│   │   │   ├── upload/    # File upload endpoint
│   │   │   └── webhook/   # n8n webhook
│   │   ├── admin/         # Admin page
│   │   └── page.tsx       # Home page
│   ├── components/
│   │   ├── auth/          # Authentication components
│   │   ├── chat/          # Chat interface
│   │   ├── admin/         # Admin components
│   │   ├── layout/        # Layout components
│   │   └── ui/            # UI components (shadcn/ui)
│   └── lib/
│       └── supabase.ts    # Supabase client
├── database/
│   ├── schema.sql         # Database schema
│   └── functions.sql      # SQL functions
└── README.md
```

## 🔧 Sử dụng

### 1. Đăng ký/Đăng nhập

- Truy cập trang chủ để đăng ký tài khoản mới
- Đăng nhập với email và mật khẩu

### 2. Chat với AI

- Nhập câu hỏi về pháp luật vào ô chat
- AI sẽ tìm kiếm trong cơ sở dữ liệu và trả lời
- Kết quả bao gồm trích dẫn nguồn pháp luật

### 3. Quản trị (Admin)

- Chỉ user có role "admin" mới truy cập được
- Upload file PDF/Word để thêm vào cơ sở dữ liệu
- Xem thống kê và lịch sử truy vấn
- Quản lý văn bản pháp luật

### 4. Tích hợp n8n

Sử dụng webhook endpoint `/api/webhook` để tích hợp với n8n:

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Luật giao thông đường bộ",
    "userId": "user-id-optional",
    "sessionId": "session-id-optional"
  }'
```

## 📊 Database Schema

### Tables

- **laws**: Lưu trữ văn bản pháp luật và embedding
- **profiles**: Thông tin người dùng
- **query_logs**: Lịch sử truy vấn

### Vector Search

Sử dụng pgvector với HNSW index để tìm kiếm nhanh:

```sql
CREATE INDEX ON laws USING hnsw (embedding vector_cosine_ops);
```

## 🔒 Bảo mật

- Row Level Security (RLS) được bật cho tất cả tables
- Chỉ admin mới có thể upload/xóa văn bản pháp luật
- User chỉ có thể xem query logs của chính mình
- API keys được bảo vệ ở server-side

## 🚀 Deployment

### Vercel (Recommended)

1. Push code lên GitHub
2. Kết nối repository với Vercel
3. Thêm environment variables
4. Deploy

### Docker

```bash
# Build image
docker build -t legal-chatbot .

# Run container
docker run -p 3000:3000 legal-chatbot
```

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ qua email.

---

**Lưu ý**: Đây là một ứng dụng demo. Trong môi trường production, cần thêm các biện pháp bảo mật và tối ưu hóa khác.
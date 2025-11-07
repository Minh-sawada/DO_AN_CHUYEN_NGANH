# 🔗 Mối liên hệ giữa Logging và n8n

## 🤔 N8n là gì?

**n8n** là một công cụ **workflow automation** (tự động hóa quy trình) cho phép:
- Tạo workflows (quy trình) bằng giao diện kéo thả
- Kết nối các service khác nhau (OpenAI, Supabase, etc.)
- Xử lý AI, embedding, vector search
- Tự động hóa các tác vụ phức tạp

## 📊 So sánh: n8n vs API Route

### **n8n Workflow** (`/webhook/chat`)
```
Frontend → n8n Webhook → OpenAI (embedding) → Supabase (vector search) → OpenAI (GPT) → Response
```

**Ưu điểm:**
- ✅ Dễ cấu hình bằng giao diện
- ✅ Có thể thay đổi workflow mà không cần code
- ✅ Tích hợp nhiều service dễ dàng
- ✅ Có thể xem logs trong n8n dashboard

**Nhược điểm:**
- ❌ **KHÔNG log vào database của chúng ta** (query_logs, user_activities)
- ❌ Phụ thuộc vào n8n server (phải chạy riêng)
- ❌ Khó debug khi có lỗi
- ❌ Không có logging cho AdminDashboard

### **API Route** (`/api/chat-enhanced`)
```
Frontend → Next.js API → Supabase (search) → OpenAI (GPT) → Logging → Response
```

**Ưu điểm:**
- ✅ **Log vào database** (query_logs, user_activities)
- ✅ AdminDashboard có thể xem logs
- ✅ System Management có thể theo dõi hoạt động
- ✅ Không phụ thuộc service bên ngoài
- ✅ Dễ debug và maintain

**Nhược điểm:**
- ❌ Phải code để thay đổi
- ❌ Không có giao diện kéo thả

## 🔍 Vấn đề hiện tại

### **Trước khi fix:**
```
ChatInterface → n8n Webhook → ❌ KHÔNG LOG → AdminDashboard không có data
```

### **Sau khi fix:**
```
ChatInterface → /api/chat-enhanced → ✅ LOG → AdminDashboard có data
```

## 💡 Giải pháp: Dùng cả hai

Có thể dùng **cả n8n và logging** bằng cách:

### **Option 1: Gọi n8n từ API Route** (Khuyến nghị)

```typescript
// /api/chat-enhanced/route.ts
export async function POST(request: NextRequest) {
  // 1. Lấy query và userId
  const { query, userId } = await request.json()
  
  // 2. Gọi n8n webhook để xử lý AI
  const n8nResponse = await fetch(process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, messages })
  })
  const data = await n8nResponse.json()
  
  // 3. Log vào database
  await supabase.from('query_logs').insert({...})
  await supabase.rpc('log_user_activity', {...})
  
  // 4. Trả về response
  return NextResponse.json(data)
}
```

**Ưu điểm:**
- ✅ Có cả n8n workflow (AI processing)
- ✅ Có cả logging (database)
- ✅ AdminDashboard có data
- ✅ System Management có logs

### **Option 2: Gọi API Route từ n8n**

Trong n8n workflow, thêm node gọi API route để log:

```json
{
  "name": "Log Activity",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "http://localhost:3000/api/system/log-activity",
    "method": "POST",
    "body": {
      "user_id": "={{ $json.userId }}",
      "activity_type": "query",
      "action": "chat_query",
      "details": "={{ $json }}"
    }
  }
}
```

**Ưu điểm:**
- ✅ Giữ nguyên n8n workflow
- ✅ Thêm logging vào n8n

**Nhược điểm:**
- ❌ Phải sửa n8n workflow
- ❌ Phụ thuộc vào Next.js server

## 🎯 Khuyến nghị

### **Nếu muốn dùng n8n:**
1. **Giữ n8n workflow** cho AI processing
2. **Gọi n8n từ API Route** (`/api/chat-enhanced`)
3. **Log sau khi nhận response từ n8n**

### **Nếu không cần n8n:**
1. **Dùng API Route trực tiếp** (`/api/chat-enhanced`)
2. **Xử lý AI trong API Route**
3. **Log vào database**

## 📝 Code mẫu: Tích hợp n8n + Logging

```typescript
// /api/chat-enhanced/route.ts
export async function POST(request: NextRequest) {
  try {
    const { query, userId } = await request.json()
    
    // Option 1: Gọi n8n nếu có
    let response, sources
    if (process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK) {
      const n8nResponse = await fetch(process.env.NEXT_PUBLIC_N8N_CHAT_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, messages: [] })
      })
      const n8nData = await n8nResponse.json()
      response = n8nData.response
      sources = n8nData.sources
    } else {
      // Option 2: Xử lý trực tiếp trong API
      // ... code xử lý AI ...
    }
    
    // Log vào query_logs
    await supabase.from('query_logs').insert({
      query,
      response,
      user_id: userId,
      sources_count: sources?.length || 0
    })
    
    // Log vào user_activities
    if (userId) {
      await supabase.rpc('log_user_activity', {
        p_user_id: userId,
        p_activity_type: 'query',
        p_action: 'chat_query',
        p_details: { query, sourcesCount: sources?.length || 0 },
        p_ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        p_user_agent: request.headers.get('user-agent') || 'unknown',
        p_risk_level: 'low'
      })
    }
    
    return NextResponse.json({ response, sources })
  } catch (error) {
    // Error handling
  }
}
```

## ✅ Kết luận

**Logging và n8n KHÔNG liên quan trực tiếp**, nhưng:
- **n8n** = Xử lý AI, workflow automation
- **Logging** = Ghi lại hoạt động vào database

**Có thể dùng cả hai:**
- n8n xử lý AI
- API Route log vào database
- Frontend gọi API Route (không gọi n8n trực tiếp)

**Hiện tại:**
- ✅ Đã fix: Frontend gọi `/api/chat-enhanced` → có logging
- ⚠️ Nếu muốn dùng n8n: Cần sửa `/api/chat-enhanced` để gọi n8n trước, sau đó log


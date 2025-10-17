# Hướng dẫn Setup n8n cho Legal Chatbot

## 🚀 **Bước 1: Cài đặt n8n**

### **Cách 1: Cài đặt globally**
```bash
npm install -g n8n
n8n
```

### **Cách 2: Chạy với npx**
```bash
npx n8n
```

### **Cách 3: Docker**
```bash
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
```

## 🔧 **Bước 2: Import Workflows**

### **Upload Workflow:**
1. Mở n8n tại `http://localhost:5678`
2. Click **"Import from File"**
3. Chọn file `n8n-workflows/upload-workflow.json`
4. Click **"Import"**

### **Chat Workflow:**
1. Click **"Import from File"**
2. Chọn file `n8n-workflows/chat-workflow.json`
3. Click **"Import"**

## ⚙️ **Bước 3: Cấu hình Credentials**

### **OpenAI Credentials:**
1. Vào **Settings** → **Credentials**
2. Click **"Add Credential"**
3. Chọn **"OpenAI"**
4. Nhập API Key: `sk-your-openai-key-here`
5. Click **"Save"**

### **Supabase Credentials:**
1. Click **"Add Credential"**
2. Chọn **"Supabase"**
3. Nhập:
   - **Host**: `https://ohbtiifdbixjxeqbnkrq.supabase.co`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
4. Click **"Save"**

## 🔗 **Bước 4: Cấu hình Webhooks**

### **Upload Webhook:**
1. Mở **Upload Workflow**
2. Click node **"Upload Webhook"**
3. Copy **Webhook URL**: `http://localhost:5678/webhook/upload`
4. Click **"Activate"**

### **Chat Webhook:**
1. Mở **Chat Workflow**
2. Click node **"Chat Webhook"**
3. Copy **Webhook URL**: `http://localhost:5678/webhook/chat`
4. Click **"Activate"**

## 🌐 **Bước 5: Cập nhật Environment Variables**

Thêm vào `.env.local`:
```env
# n8n Webhooks
NEXT_PUBLIC_N8N_UPLOAD_WEBHOOK=http://localhost:5678/webhook/upload
NEXT_PUBLIC_N8N_CHAT_WEBHOOK=http://localhost:5678/webhook/chat
```

## 🧪 **Bước 6: Test**

### **Test Upload:**
1. Vào `http://localhost:3000/admin`
2. Click tab **"Upload File"**
3. Chọn file và upload
4. Kiểm tra n8n logs

### **Test Chat:**
1. Vào `http://localhost:3000`
2. Hỏi câu hỏi về pháp luật
3. Kiểm tra n8n logs

## 🔍 **Debug**

### **Kiểm tra n8n logs:**
1. Mở n8n dashboard
2. Click **"Executions"**
3. Xem chi tiết execution

### **Kiểm tra webhook URLs:**
- Upload: `http://localhost:5678/webhook/upload`
- Chat: `http://localhost:5678/webhook/chat`

## 📝 **Lưu ý**

1. **n8n phải chạy trước** khi test
2. **Workflows phải được activate**
3. **Credentials phải được cấu hình đúng**
4. **Database phải có function `match_laws`**

## 🚨 **Troubleshooting**

### **Lỗi 404:**
- Kiểm tra webhook URL
- Kiểm tra workflow đã activate chưa

### **Lỗi 500:**
- Kiểm tra credentials
- Kiểm tra database connection
- Kiểm tra OpenAI API key

### **Lỗi CORS:**
- Thêm CORS headers trong n8n
- Hoặc dùng proxy

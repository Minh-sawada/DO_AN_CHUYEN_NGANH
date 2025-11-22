# 🚀 Quick Deploy Guide - Vercel (5 Phút)

## Bước 1: Push Code Lên GitHub (2 phút)

```powershell
# Nếu chưa có git repo
git init
git add .
git commit -m "Ready for deployment"

# Tạo repo mới trên GitHub.com, sau đó:
git remote add origin https://github.com/YOUR_USERNAME/legal-chatbot.git
git branch -M main
git push -u origin main
```

## Bước 2: Deploy Lên Vercel (3 phút)

1. **Vào:** https://vercel.com
2. **Sign Up** với GitHub
3. **Import Project:**
   - Click **Add New** → **Project**
   - Chọn repo `legal-chatbot`
   - Click **Import**

4. **Thêm Environment Variables:**
   - Scroll xuống **Environment Variables**
   - Thêm từng biến:
     ```
     NEXT_PUBLIC_SUPABASE_URL = (copy từ .env.local)
     NEXT_PUBLIC_SUPABASE_ANON_KEY = (copy từ .env.local)
     SUPABASE_SERVICE_ROLE_KEY = (copy từ .env.local)
     OPENAI_API_KEY = (copy từ .env.local)
     ```
   - **Lưu ý:** KHÔNG có dấu cách quanh dấu `=`

5. **Click Deploy!**
   - Đợi 2-3 phút
   - Xong! Link: `https://legal-chatbot.vercel.app`

## Bước 3: Cấu Hình Supabase (1 phút)

1. Vào **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Thêm vào **Redirect URLs:**
   ```
   https://legal-chatbot.vercel.app
   https://legal-chatbot.vercel.app/**
   ```
3. Thêm vào **Site URL:**
   ```
   https://legal-chatbot.vercel.app
   ```

## ✅ Xong!

Bạn bè có thể truy cập: `https://legal-chatbot.vercel.app`

---

## 🔄 Auto Deploy

Mỗi khi bạn push code:
```powershell
git add .
git commit -m "Update feature"
git push
```

Vercel sẽ tự động deploy lại trong 2-3 phút!

---

## 📝 Checklist

- [ ] Code đã push lên GitHub
- [ ] Đã thêm tất cả environment variables trong Vercel
- [ ] Đã cấu hình Supabase URLs
- [ ] Test app trên Vercel link
- [ ] Share link cho bạn bè!

---

## 🆘 Nếu Gặp Lỗi

### Build Failed
- Xem logs trong Vercel dashboard
- Test build local: `npm run build`

### Environment Variable Missing
- Kiểm tra đã thêm trong Vercel Settings → Environment Variables
- Đảm bảo tên biến đúng (case-sensitive)

### Supabase Connection Error
- Kiểm tra Supabase URLs đã được thêm vào Redirect URLs chưa
- Kiểm tra API keys đúng chưa


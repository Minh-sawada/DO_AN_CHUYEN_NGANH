# Hướng Dẫn Deploy Miễn Phí Lên Hosting

## 🎯 Tổng Quan

Có nhiều nền tảng miễn phí để deploy Next.js app. Dưới đây là các options tốt nhất:

## ⭐ Option 1: Vercel (Khuyến Nghị Nhất) - 100% Miễn Phí

### Tại sao chọn Vercel?
- ✅ **Tạo bởi team Next.js** - Tích hợp hoàn hảo
- ✅ **Miễn phí 100%** cho personal projects
- ✅ **Deploy tự động** từ GitHub
- ✅ **HTTPS tự động**
- ✅ **CDN toàn cầu** - Nhanh ở mọi nơi
- ✅ **Custom domain** miễn phí
- ✅ **Không giới hạn bandwidth** (reasonable use)

### Cách Deploy:

#### Bước 1: Push code lên GitHub

```powershell
# Nếu chưa có git repo
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Tạo repo trên GitHub, sau đó:
git remote add origin https://github.com/your-username/legal-chatbot.git
git push -u origin main
```

#### Bước 2: Deploy lên Vercel

1. **Đăng ký Vercel:**
   - Vào https://vercel.com
   - Click **Sign Up**
   - Chọn **Continue with GitHub** (dễ nhất)

2. **Import Project:**
   - Click **Add New** → **Project**
   - Chọn repository `legal-chatbot`
   - Vercel tự động detect Next.js

3. **Cấu hình Environment Variables:**
   - Trong phần **Environment Variables**, thêm:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     OPENAI_API_KEY=your_openai_key
     ```
   - **Lưu ý:** KHÔNG commit file `.env.local` lên GitHub!

4. **Deploy:**
   - Click **Deploy**
   - Đợi 2-3 phút
   - Xong! Bạn sẽ có link như: `https://legal-chatbot.vercel.app`

#### Bước 3: Cấu hình Custom Domain (Tùy chọn)

1. Vào **Settings** → **Domains**
2. Thêm domain của bạn (ví dụ: `legal-chatbot.com`)
3. Làm theo hướng dẫn để setup DNS

### Auto Deploy

Mỗi khi bạn push code lên GitHub, Vercel sẽ tự động deploy lại!

---

## Option 2: Netlify - Miễn Phí

### Ưu điểm:
- ✅ Miễn phí 100GB bandwidth/tháng
- ✅ Deploy tự động từ GitHub
- ✅ HTTPS tự động
- ✅ Custom domain miễn phí

### Cách Deploy:

1. **Đăng ký:** https://app.netlify.com
2. **New site from Git** → Chọn GitHub → Chọn repo
3. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`
4. **Environment variables:** Thêm các biến môi trường
5. **Deploy!**

---

## Option 3: Railway - Miễn Phí ($5 Credit/Tháng)

### Ưu điểm:
- ✅ $5 credit miễn phí mỗi tháng (đủ cho app nhỏ)
- ✅ Dễ setup
- ✅ Hỗ trợ database

### Cách Deploy:

1. **Đăng ký:** https://railway.app (dùng GitHub)
2. **New Project** → **Deploy from GitHub repo**
3. **Chọn repo** → Railway tự động detect
4. **Add Environment Variables**
5. **Deploy!**

---

## Option 4: Render - Miễn Phí (Có Giới Hạn)

### Ưu điểm:
- ✅ Miễn phí với giới hạn
- ✅ Auto deploy từ GitHub
- ✅ HTTPS tự động

### Nhược điểm:
- ⚠️ App sẽ "sleep" sau 15 phút không dùng (free tier)
- ⚠️ Lần đầu load sau khi sleep sẽ chậm (~30s)

### Cách Deploy:

1. **Đăng ký:** https://render.com
2. **New** → **Web Service**
3. **Connect GitHub** → Chọn repo
4. **Settings:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. **Environment Variables:** Thêm các biến
6. **Deploy!**

---

## Option 5: Fly.io - Miễn Phí

### Ưu điểm:
- ✅ Miễn phí với giới hạn hợp lý
- ✅ Global edge network
- ✅ Dễ scale

### Cách Deploy:

1. **Cài Fly CLI:**
   ```powershell
   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Login:**
   ```powershell
   fly auth login
   ```

3. **Init project:**
   ```powershell
   fly launch
   ```

4. **Deploy:**
   ```powershell
   fly deploy
   ```

---

## So Sánh Các Nền Tảng

| Platform | Miễn Phí | Auto Deploy | Sleep Mode | Custom Domain | Tốc Độ |
|----------|----------|-------------|------------|---------------|--------|
| **Vercel** | ✅ 100% | ✅ | ❌ | ✅ | ⚡⚡⚡ |
| **Netlify** | ✅ 100GB/mo | ✅ | ❌ | ✅ | ⚡⚡⚡ |
| **Railway** | ✅ $5/mo | ✅ | ❌ | ✅ | ⚡⚡ |
| **Render** | ✅ | ✅ | ⚠️ Có | ✅ | ⚡ |
| **Fly.io** | ✅ | ✅ | ❌ | ✅ | ⚡⚡ |

## 🎯 Khuyến Nghị

**Chọn Vercel** vì:
1. Tích hợp tốt nhất với Next.js
2. Miễn phí hoàn toàn
3. Nhanh nhất
4. Dễ setup nhất
5. Auto deploy từ GitHub

## 📝 Checklist Trước Khi Deploy

### 1. Kiểm tra Environment Variables

Đảm bảo các biến này có trong `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
N8N_WEBHOOK_URL=... (nếu có)
```

### 2. Kiểm tra .gitignore

Đảm bảo `.env.local` đã được ignore:
```gitignore
.env.local
.env*.local
```

### 3. Update Supabase Settings

Vào Supabase Dashboard → **Authentication** → **URL Configuration**:
- Thêm domain Vercel vào **Redirect URLs**
- Thêm domain Vercel vào **Site URL**

Ví dụ:
```
https://legal-chatbot.vercel.app
https://legal-chatbot.vercel.app/**
```

### 4. Test Local Build

```powershell
npm run build
npm start
```

Nếu build thành công, deploy sẽ OK!

## 🚀 Quick Start với Vercel

```powershell
# 1. Push code lên GitHub
git add .
git commit -m "Ready for deployment"
git push

# 2. Vào https://vercel.com
# 3. Import GitHub repo
# 4. Add environment variables
# 5. Deploy!
```

## 🔒 Bảo Mật

### ⚠️ QUAN TRỌNG: Không commit secrets!

- ❌ KHÔNG commit `.env.local`
- ❌ KHÔNG commit API keys trong code
- ✅ Chỉ thêm environment variables trong Vercel dashboard
- ✅ Sử dụng `.gitignore` để bảo vệ secrets

## 📊 Monitoring

Sau khi deploy, bạn có thể:
- Xem logs trong Vercel dashboard
- Monitor performance
- Xem analytics
- Setup alerts

## 🆘 Troubleshooting

### Lỗi: "Environment variable not found"
- Kiểm tra đã thêm env vars trong Vercel dashboard chưa
- Đảm bảo tên biến đúng (case-sensitive)

### Lỗi: "Build failed"
- Xem logs trong Vercel để biết lỗi cụ thể
- Test build local trước: `npm run build`

### Lỗi: "Supabase connection failed"
- Kiểm tra Supabase URL và keys
- Kiểm tra Supabase đã allow domain Vercel chưa

### App chạy chậm
- Vercel free tier đủ nhanh cho hầu hết apps
- Nếu cần, upgrade lên Pro ($20/tháng)

## 💡 Tips

1. **Sử dụng Vercel Preview:** Mỗi PR sẽ có preview URL riêng
2. **Analytics:** Bật Vercel Analytics để xem traffic
3. **Edge Functions:** Sử dụng Edge Functions cho API routes nhanh hơn
4. **Image Optimization:** Vercel tự động optimize images

## 📚 Tài Liệu Tham Khảo

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Supabase Production: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs

---

**Kết luận:** Vercel là lựa chọn tốt nhất cho Next.js app. Miễn phí, nhanh, dễ dùng!


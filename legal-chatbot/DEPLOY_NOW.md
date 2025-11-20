# 🚀 Deploy Ngay Bây Giờ - 3 Bước

## ✅ Bước 1: Code đã push lên GitHub
**Done!** Code đã ở: https://github.com/Minh-sawada/DO_AN_CHUYEN_NGANH

## 📝 Bước 2: Deploy Lên Vercel (3 phút)

### 2.1. Đăng ký Vercel
1. Vào: **https://vercel.com**
2. Click **Sign Up**
3. Chọn **Continue with GitHub**
4. Authorize Vercel truy cập GitHub

### 2.2. Import Project
1. Click **Add New** → **Project**
2. Tìm repo: **DO_AN_CHUYEN_NGANH**
3. Click **Import**

### 2.3. Cấu Hình Project
1. **Root Directory:** Chọn `legal-chatbot` (nếu có option)
2. **Framework Preset:** Next.js (tự động detect)
3. **Build Command:** `npm run build` (tự động)
4. **Output Directory:** `.next` (tự động)

### 2.4. Thêm Environment Variables ⚠️ QUAN TRỌNG

Scroll xuống phần **Environment Variables**, thêm:

```
NEXT_PUBLIC_SUPABASE_URL
= (copy từ .env.local của bạn)

NEXT_PUBLIC_SUPABASE_ANON_KEY
= (copy từ .env.local của bạn)

SUPABASE_SERVICE_ROLE_KEY
= (copy từ .env.local của bạn)

OPENAI_API_KEY
= (copy từ .env.local của bạn)
```

**Lưu ý:**
- Mỗi biến thêm riêng một dòng
- KHÔNG có dấu cách quanh dấu `=`
- Copy chính xác từ `.env.local`

### 2.5. Deploy!
1. Click **Deploy**
2. Đợi 2-3 phút
3. Xong! Bạn sẽ có link: `https://do-an-chuyen-nganh.vercel.app`

---

## ⚙️ Bước 3: Cấu Hình Supabase (1 phút)

### 3.1. Vào Supabase Dashboard
1. Vào: **https://supabase.com/dashboard**
2. Chọn project của bạn
3. Vào **Authentication** → **URL Configuration**

### 3.2. Thêm Vercel URLs
Trong **Redirect URLs**, thêm:
```
https://do-an-chuyen-nganh.vercel.app
https://do-an-chuyen-nganh.vercel.app/**
```

Trong **Site URL**, thay bằng:
```
https://do-an-chuyen-nganh.vercel.app
```

### 3.3. Save
Click **Save** để lưu

---

## ✅ Xong!

Bạn bè có thể truy cập:
```
https://do-an-chuyen-nganh.vercel.app
```

---

## 🔄 Auto Deploy

Từ giờ, mỗi khi bạn push code:
```powershell
git add .
git commit -m "Update"
git push origin Kietpro
```

Vercel sẽ tự động deploy lại trong 2-3 phút!

---

## 📊 Xem Logs & Status

- Vào **Vercel Dashboard** → Chọn project
- Xem **Deployments** để xem lịch sử deploy
- Xem **Logs** nếu có lỗi

---

## 🆘 Nếu Gặp Lỗi

### Build Failed
- Vào **Deployments** → Click vào deployment failed
- Xem **Build Logs** để biết lỗi cụ thể
- Thường là thiếu environment variable

### Environment Variable Missing
- Vào **Settings** → **Environment Variables**
- Kiểm tra đã thêm đủ chưa
- Đảm bảo tên biến đúng (case-sensitive)

### Supabase Connection Error
- Kiểm tra Supabase URLs đã được thêm vào Redirect URLs chưa
- Kiểm tra API keys đúng chưa
- Test lại trên Vercel

---

## 🎉 Thành Công!

Sau khi deploy xong, bạn sẽ có:
- ✅ Link public để share cho bạn bè
- ✅ HTTPS tự động
- ✅ Auto deploy khi push code
- ✅ CDN toàn cầu - nhanh ở mọi nơi

**Chúc bạn deploy thành công! 🚀**


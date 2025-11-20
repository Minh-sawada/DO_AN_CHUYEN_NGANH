# Hướng Dẫn Chia Sẻ Ứng Dụng Local Cho Bạn Bè

## ⚠️ Lưu Ý Quan Trọng

IP `10.15.87.114` là **IP local/private**, chỉ hoạt động trong mạng LAN của bạn.

### ✅ Bạn bè CÓ THỂ truy cập nếu:
- Cùng kết nối WiFi/router với bạn
- Cùng mạng LAN (ví dụ: cùng phòng lab, cùng công ty)

### ❌ Bạn bè KHÔNG THỂ truy cập nếu:
- Ở nhà khác
- Dùng mạng khác (4G, WiFi khác)
- Ở xa

## Cách 1: Chia Sẻ Trong Mạng LAN (Cùng WiFi)

### Bước 1: Chạy Next.js với IP

Thay vì chạy `npm run dev`, chạy:

```powershell
# Windows PowerShell
$env:HOSTNAME="0.0.0.0"; npm run dev
```

Hoặc tạo file `.env.local`:
```env
HOSTNAME=0.0.0.0
```

Sau đó chạy:
```powershell
npm run dev
```

### Bước 2: Kiểm tra Firewall

Windows Firewall có thể chặn kết nối. Cho phép Node.js qua Firewall:

1. Mở **Windows Defender Firewall**
2. Click **Allow an app or feature through Windows Defender Firewall**
3. Tìm **Node.js** và check cả **Private** và **Public**
4. Nếu không có, click **Allow another app** → Chọn Node.js

Hoặc tạm thời tắt Firewall (chỉ khi test, không khuyến nghị cho production)

### Bước 3: Lấy IP của máy bạn

```powershell
# PowerShell
ipconfig
```

Tìm **IPv4 Address** (ví dụ: `10.15.87.114`)

### Bước 4: Chia sẻ link

Gửi cho bạn bè:
```
http://10.15.87.114:3000
```

**Lưu ý:** Dùng `http://` không phải `https://` (trừ khi bạn đã setup HTTPS cho IP)

## Cách 2: Dùng ngrok (Cho Truy Cập Từ Xa) ⭐

Ngrok tạo tunnel công khai để bạn bè truy cập từ bất kỳ đâu.

### Bước 1: Cài ngrok

1. Tải ngrok: https://ngrok.com/download
2. Giải nén và đặt vào thư mục dễ truy cập
3. Hoặc dùng Chocolatey: `choco install ngrok`

### Bước 2: Đăng ký tài khoản (miễn phí)

1. Vào https://ngrok.com/signup
2. Lấy **authtoken** từ dashboard

### Bước 3: Setup ngrok

```powershell
# Chạy lệnh này một lần để setup
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Bước 4: Chạy ngrok

Mở terminal mới và chạy:

```powershell
ngrok http 3000
```

Bạn sẽ nhận được link như:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3000
```

### Bước 5: Chia sẻ link ngrok

Gửi link `https://abc123.ngrok-free.app` cho bạn bè.

**Lưu ý:**
- Link ngrok miễn phí sẽ thay đổi mỗi lần restart
- Có thể mua plan để có link cố định
- Link miễn phí có giới hạn số request

## Cách 3: Dùng Cloudflare Tunnel (Miễn Phí, Link Cố Định)

### Bước 1: Cài cloudflared

```powershell
# Tải từ: https://github.com/cloudflare/cloudflared/releases
# Hoặc dùng Chocolatey
choco install cloudflared
```

### Bước 2: Chạy tunnel

```powershell
cloudflared tunnel --url http://localhost:3000
```

Bạn sẽ nhận được link như:
```
https://random-subdomain.trycloudflare.com
```

### Bước 3: Chia sẻ link

Gửi link Cloudflare cho bạn bè.

**Ưu điểm:**
- ✅ Miễn phí
- ✅ Link cố định (không đổi mỗi lần restart)
- ✅ HTTPS tự động

## Cách 4: Deploy Lên Vercel (Khuyến Nghị Cho Production)

### Bước 1: Push code lên GitHub

```powershell
git add .
git commit -m "Ready for deployment"
git push
```

### Bước 2: Deploy lên Vercel

1. Vào https://vercel.com
2. Sign up với GitHub
3. Import repository
4. Deploy

Bạn sẽ nhận được link như:
```
https://your-app.vercel.app
```

**Ưu điểm:**
- ✅ Miễn phí
- ✅ Link cố định
- ✅ HTTPS tự động
- ✅ Tự động deploy khi push code

## So Sánh Các Cách

| Cách | Miễn Phí | Link Cố Định | Truy Cập Từ Xa | Độ Khó |
|------|----------|--------------|----------------|--------|
| LAN (IP local) | ✅ | ✅ | ❌ | Dễ |
| ngrok | ✅ | ❌ (free) | ✅ | Dễ |
| Cloudflare Tunnel | ✅ | ✅ | ✅ | Trung bình |
| Vercel | ✅ | ✅ | ✅ | Dễ |

## Troubleshooting

### Lỗi: "Connection refused"

**Nguyên nhân:** Next.js chưa bind với `0.0.0.0`

**Giải pháp:**
```powershell
$env:HOSTNAME="0.0.0.0"; npm run dev
```

### Lỗi: "Firewall blocking"

**Giải pháp:** Cho phép Node.js qua Windows Firewall (xem Bước 2 ở trên)

### Lỗi: "This site can't be reached"

**Nguyên nhân:** 
- Bạn bè không cùng mạng LAN
- IP không đúng

**Giải pháp:** Dùng ngrok hoặc Cloudflare Tunnel

### Lỗi: "Certificate error" (HTTPS)

**Giải pháp:** Dùng `http://` thay vì `https://` cho IP local

## Khuyến Nghị

- **Test trong mạng LAN:** Dùng IP local `http://10.15.87.114:3000`
- **Chia sẻ với bạn bè xa:** Dùng ngrok hoặc Cloudflare Tunnel
- **Production:** Deploy lên Vercel

## Script Nhanh

Tạo file `dev-network.ps1`:

```powershell
# Chạy Next.js với network access
$env:HOSTNAME="0.0.0.0"
npm run dev
```

Chạy:
```powershell
.\dev-network.ps1
```


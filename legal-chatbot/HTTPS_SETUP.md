# Hướng dẫn thiết lập HTTPS cho Development

## Vấn đề
Trình duyệt không cho phép truy cập microphone trên HTTP (không bảo mật). Cần HTTPS để sử dụng microphone.

## Giải pháp 1: Dùng localhost (Đơn giản nhất)

Thay vì dùng IP `10.15.87.114:3000`, dùng:
```
http://localhost:3000
```

Một số trình duyệt cho phép HTTP trên localhost cho microphone.

## Giải pháp 2: Thiết lập HTTPS với mkcert (Khuyến nghị)

### Bước 1: Cài đặt mkcert

**Windows (với Chocolatey):**
```powershell
choco install mkcert
```

**Hoặc tải từ:**
https://github.com/FiloSottile/mkcert/releases

### Bước 2: Tạo certificate
```powershell
cd legal-chatbot
mkcert -install
mkcert localhost 10.15.87.114
```

Sẽ tạo 2 file:
- `localhost+1.pem` (certificate)
- `localhost+1-key.pem` (private key)

### Bước 3: Chạy với HTTPS

Sử dụng script `dev:https` trong package.json

## Giải pháp 3: Dùng Next.js với custom HTTPS server

Đã có script `dev:https` trong package.json


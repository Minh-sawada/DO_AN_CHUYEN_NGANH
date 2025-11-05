# Hướng dẫn thiết lập HTTPS cho Development

## Vấn đề
Trình duyệt không cho phép truy cập microphone trên HTTP (không bảo mật). Cần HTTPS để sử dụng microphone.

## Giải pháp 1: Dùng localhost (Đơn giản nhất - KHUYẾN NGHỊ)

Thay vì dùng IP `10.15.87.114:3000`, dùng:
```
http://localhost:3000
```

Một số trình duyệt cho phép HTTP trên localhost cho microphone.

## Giải pháp 2: HTTPS tự động với devcert (KHÔNG CẦN CÀI GÌ)

### Cách sử dụng:

1. **Cài đặt package (đã có trong package.json):**
   ```powershell
   npm install
   ```

2. **Chạy với HTTPS:**
   ```powershell
   npm run dev:https
   ```

3. **Lần đầu tiên:**
   - Script sẽ tự động tạo certificate
   - Có thể yêu cầu quyền admin để cài đặt root CA
   - Chấp nhận khi được hỏi

4. **Truy cập:**
   ```
   https://localhost:3000
   ```

**Lưu ý:** Certificate chỉ hoạt động với `localhost`, không với IP `10.15.87.114`

### Ưu điểm:
- ✅ Không cần cài mkcert hay openssl
- ✅ Tự động trust certificate
- ✅ Không có cảnh báo "Not secure"
- ✅ Tự động tạo khi chạy lần đầu

## Giải pháp 3: Thiết lập HTTPS với mkcert (Nếu cần IP)

Nếu cần dùng với IP `10.15.87.114`:

1. Cài mkcert: https://github.com/FiloSottile/mkcert/releases
2. Chạy: `mkcert -install && mkcert localhost 10.15.87.114`
3. Copy 2 file `.pem` vào thư mục `legal-chatbot/`


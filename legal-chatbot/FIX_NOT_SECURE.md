# 🔐 Hướng dẫn xóa cảnh báo "Không bảo mật" (Not secure)

## Vấn đề
Trình duyệt vẫn hiển thị cảnh báo "Không bảo mật" dù đã cài mkcert và tạo certificate.

## Nguyên nhân
1. **Trình duyệt đang cache certificate cũ**
2. **Chrome/Edge chưa trust CA của mkcert**
3. **Cache SSL/TLS chưa được xóa**

## Giải pháp

### Bước 1: Xóa cache SSL/TLS của trình duyệt

#### Chrome/Edge (Khuyến nghị):
1. **Nhấn `Ctrl + Shift + Delete`**
2. Chọn **"Cached images and files"**
3. Chọn **"All time"** (Tất cả thời gian)
4. Click **"Clear data"** (Xóa dữ liệu)
5. **Đóng tất cả tab** của trang web
6. **Mở tab mới** và truy cập: `https://10.15.87.114:3000`
7. **Nhấn `Ctrl + Shift + R`** để hard refresh

### Bước 2: Import CA của mkcert vào Chrome/Edge (Nếu cần)

1. **Tìm đường dẫn CA của mkcert:**
   ```powershell
   .\tools\mkcert.exe -CAROOT
   ```
   Kết quả: `C:\Users\KIET\AppData\Local\mkcert`

2. **Import CA vào Chrome/Edge:**
   - Mở Chrome/Edge
   - Truy cập: `chrome://settings/certificates` (hoặc `edge://settings/certificates`)
   - Click tab **"Authorities"** (Cơ quan cấp chứng chỉ)
   - Click **"Import"** (Nhập)
   - Tìm file: `C:\Users\KIET\AppData\Local\mkcert\rootCA.pem`
   - Chọn file và click **"Open"**
   - **Quan trọng:** Đánh dấu **"Trust this certificate for identifying websites"**
   - Click **"OK"**

3. **Restart trình duyệt**

### Bước 3: Xóa certificate cũ (Nếu có)

1. Mở: `chrome://settings/certificates` (hoặc `edge://settings/certificates`)
2. Tab **"Authorities"**
3. Tìm và **xóa certificate cũ** (nếu có)
4. Tab **"Your certificates"**
5. **Xóa certificate cũ** (nếu có)

### Bước 4: Kiểm tra certificate

1. Truy cập: `https://10.15.87.114:3000`
2. **Click vào icon khóa** ở thanh địa chỉ
3. Click **"Certificate"** (hoặc "Chi tiết về chứng chỉ")
4. Kiểm tra:
   - **Issued by:** Phải có **"mkcert"** trong tên
   - **Valid from:** Phải là ngày hôm nay
   - **Valid to:** Phải là 7/2/2028

### Bước 5: Nếu vẫn không được

#### Option 1: Restart máy tính
```powershell
# Restart máy tính để đảm bảo CA được load vào hệ thống
Restart-Computer
```

#### Option 2: Thử trình duyệt khác
- Thử **Chrome** nếu đang dùng Edge
- Thử **Edge** nếu đang dùng Chrome
- Thử **Firefox** (cần cấu hình thêm)

#### Option 3: Xóa và tạo lại certificate
```powershell
cd legal-chatbot
Remove-Item localhost+1.pem, localhost+1-key.pem -Force
npm run generate-cert
npm run dev:https
```

#### Option 4: Kiểm tra CA đã được cài đúng chưa
```powershell
# Kiểm tra CA của mkcert
.\tools\mkcert.exe -CAROOT

# Kiểm tra CA đã được cài vào hệ thống chưa
# Mở: certmgr.msc
# Tìm trong: Trusted Root Certification Authorities > Certificates
# Phải có certificate "mkcert development CA"
```

## Lưu ý đặc biệt

### Nếu dùng IP address (10.15.87.114)
- Mkcert hỗ trợ IP address, nhưng một số trình duyệt có thể vẫn cảnh báo
- Thử dùng **localhost** thay vì IP: `https://localhost:3000`
- Hoặc thêm domain vào file hosts: `C:\Windows\System32\drivers\etc\hosts`

### Nếu dùng Firefox
Firefox có thể cần cấu hình thêm:
1. Mở Firefox
2. Truy cập: `about:config`
3. Tìm: `security.enterprise_roots.enabled`
4. Đặt giá trị: `true`
5. Restart Firefox

## Script tự động xóa cache

Chạy script để xóa cache tự động:
```powershell
cd legal-chatbot
.\scripts\clear-browser-cache.ps1
```

## Kiểm tra nhanh

Sau khi làm các bước trên:
1. ✅ Certificate được tạo bằng mkcert
2. ✅ CA đã được cài vào hệ thống
3. ✅ CA đã được import vào Chrome/Edge
4. ✅ Cache đã được xóa
5. ✅ Trình duyệt đã được restart
6. ✅ Hard refresh trang web (`Ctrl + Shift + R`)

Nếu vẫn còn cảnh báo, hãy thử restart máy tính!


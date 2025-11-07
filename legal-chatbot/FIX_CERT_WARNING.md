# Hướng dẫn xóa cảnh báo "Not secure" sau khi cài mkcert

## Vấn đề
Sau khi cài mkcert và tạo certificate mới, trình duyệt vẫn hiển thị cảnh báo "Not secure".

## Nguyên nhân
1. **Trình duyệt đang cache certificate cũ**
2. **Server đang chạy với certificate cũ** (cần restart)
3. **Chưa hard refresh trang web**

## Giải pháp

### Bước 1: Dừng server (nếu đang chạy)
```powershell
# Tìm và dừng process Node.js
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

### Bước 2: Xóa cache trình duyệt

#### Chrome/Edge:
1. Nhấn `Ctrl + Shift + Delete`
2. Chọn "Cached images and files"
3. Chọn "All time"
4. Click "Clear data"
5. Hoặc nhấn `Ctrl + Shift + R` để hard refresh

#### Firefox:
1. Nhấn `Ctrl + Shift + Delete`
2. Chọn "Cache"
3. Chọn "Everything"
4. Click "Clear Now"
5. Hoặc nhấn `Ctrl + F5` để hard refresh

### Bước 3: Xóa certificate cũ trong trình duyệt (nếu cần)

#### Chrome/Edge:
1. Mở `chrome://settings/certificates` (hoặc `edge://settings/certificates`)
2. Tab "Authorities"
3. Tìm và xóa certificate cũ (nếu có)
4. Tab "Your certificates"
5. Xóa certificate cũ (nếu có)

#### Firefox:
1. Mở `about:preferences#privacy`
2. Click "View Certificates"
3. Tab "Authorities"
4. Tìm và xóa certificate cũ (nếu có)

### Bước 4: Restart server với certificate mới
```powershell
cd legal-chatbot
npm run dev:https
```

### Bước 5: Truy cập lại trang web
1. Đóng tất cả tab của trang web
2. Mở tab mới
3. Truy cập: `https://10.15.87.114:3000`
4. Nhấn `Ctrl + Shift + R` để hard refresh

## Kiểm tra certificate

### Xem thông tin certificate trong trình duyệt:
1. Click vào icon khóa ở thanh địa chỉ
2. Click "Certificate"
3. Kiểm tra:
   - **Issued by**: Phải có "mkcert" trong tên
   - **Valid from**: Phải là ngày hôm nay
   - **Valid to**: Phải là 7/2/2028

### Kiểm tra bằng lệnh:
```powershell
# Xem thông tin certificate
openssl x509 -in localhost+1.pem -text -noout | Select-String "Issuer"
```

Nếu thấy "mkcert" trong Issuer thì certificate đã đúng!

## Lưu ý đặc biệt cho Firefox

Nếu bạn dùng **Firefox**, mkcert đã báo:
```
Note: Firefox support is not available on your platform.
```

Firefox có thể vẫn hiển thị cảnh báo. Để fix:

1. Mở Firefox
2. Truy cập: `about:config`
3. Tìm: `security.enterprise_roots.enabled`
4. Đặt giá trị: `true`
5. Restart Firefox

Hoặc cài đặt CA vào Firefox thủ công:
```powershell
# Tìm đường dẫn CA của mkcert
.\tools\mkcert.exe -CAROOT

# Copy đường dẫn và import vào Firefox
# Firefox > Settings > Privacy & Security > Certificates > View Certificates > Authorities > Import
```

## Nếu vẫn không được

1. **Kiểm tra lại certificate đã được tạo bằng mkcert:**
   ```powershell
   npm run generate-cert
   ```
   Phải thấy: "✅ Phát hiện mkcert - sử dụng mkcert để tạo certificate chuyên nghiệp!"

2. **Kiểm tra CA đã được cài:**
   ```powershell
   .\tools\mkcert.exe -CAROOT
   ```
   Phải hiển thị đường dẫn thư mục CA

3. **Xóa hoàn toàn và tạo lại:**
   ```powershell
   Remove-Item localhost+1.pem, localhost+1-key.pem -Force
   npm run generate-cert
   ```

4. **Restart máy tính** (để đảm bảo CA được load vào hệ thống)


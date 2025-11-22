# Hướng dẫn cài đặt mkcert trên Windows

## Cách 1: Tải trực tiếp từ GitHub (Đơn giản nhất) ⭐

### Bước 1: Tải mkcert
1. Mở trình duyệt, truy cập: **https://github.com/FiloSottile/mkcert/releases**
2. Tải file **`mkcert-v1.4.4-windows-amd64.exe`** (hoặc phiên bản mới nhất)
3. Đổi tên file thành **`mkcert.exe`**

### Bước 2: Cài đặt mkcert vào hệ thống

**Tùy chọn A: Đặt vào thư mục có sẵn trong PATH**
```powershell
# Copy file vào System32 (cần quyền Admin)
Copy-Item mkcert.exe C:\Windows\System32\mkcert.exe
```

**Tùy chọn B: Tạo thư mục riêng và thêm vào PATH**
```powershell
# Tạo thư mục
New-Item -ItemType Directory -Path C:\Tools -Force

# Copy mkcert vào đó
Copy-Item mkcert.exe C:\Tools\mkcert.exe

# Thêm vào PATH (chạy PowerShell với quyền Admin)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Tools", [EnvironmentVariableTarget]::Machine)
```

### Bước 3: Cài đặt CA vào hệ thống
```powershell
# Chạy PowerShell với quyền Admin, sau đó:
mkcert -install
```

### Bước 4: Tạo certificate
```powershell
cd legal-chatbot
npm run generate-cert
```

---

## Cách 2: Cài đặt bằng Chocolatey (Nếu bạn có Chocolatey)

### Bước 1: Cài Chocolatey (nếu chưa có)
Mở PowerShell với quyền Admin và chạy:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### Bước 2: Cài mkcert
```powershell
choco install mkcert
```

### Bước 3: Cài đặt CA vào hệ thống
```powershell
mkcert -install
```

### Bước 4: Tạo certificate
```powershell
cd legal-chatbot
npm run generate-cert
```

---

## Cách 3: Cài đặt bằng Scoop (Nếu bạn có Scoop)

### Bước 1: Cài Scoop (nếu chưa có)
Mở PowerShell và chạy:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### Bước 2: Cài mkcert
```powershell
scoop install mkcert
```

### Bước 3: Cài đặt CA vào hệ thống
```powershell
mkcert -install
```

### Bước 4: Tạo certificate
```powershell
cd legal-chatbot
npm run generate-cert
```

---

## Kiểm tra cài đặt

Sau khi cài xong, kiểm tra bằng lệnh:
```powershell
mkcert -version
```

Nếu hiển thị version thì đã cài thành công! ✅

---

## Sau khi cài xong

1. Chạy: `mkcert -install` (cần quyền Admin)
2. Chạy: `npm run generate-cert` trong thư mục `legal-chatbot`
3. Chạy: `npm run dev:https`

Certificate sẽ được tạo và **KHÔNG CÓ cảnh báo "Not secure"** trong trình duyệt! 🎉


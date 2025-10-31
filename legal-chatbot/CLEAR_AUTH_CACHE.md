# Hướng dẫn xóa cache authentication

## Cách 1: Dùng Browser Console (Nhanh nhất)

1. Mở trang web
2. Nhấn F12 để mở DevTools
3. Vào tab **Console**
4. Gõ lệnh sau và nhấn Enter:
```javascript
localStorage.clear()
sessionStorage.clear()
location.reload()
```

## Cách 2: Clear thủ công

1. Mở DevTools (F12)
2. Vào tab **Application** (hoặc **Storage**)
3. Chọn **Local Storage** → Click vào domain của bạn
4. Click chuột phải → **Clear**
5. Làm tương tự với **Session Storage**
6. Refresh trang (F5)

## Cách 3: Clear tất cả browser data

1. Nhấn `Ctrl + Shift + Delete`
2. Chọn "Cached images and files" và "Cookies and other site data"
3. Chọn "All time"
4. Click "Clear data"

Sau đó refresh trang và đăng nhập lại.


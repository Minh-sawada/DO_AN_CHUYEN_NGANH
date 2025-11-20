# Script để xóa cache SSL/TLS của trình duyệt trên Windows

Write-Host "🔐 Hướng dẫn xóa cache SSL/TLS của trình duyệt" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra Chrome/Edge cache
$chromeCache = "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
$edgeCache = "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"

Write-Host "📝 CÁCH XÓA CACHE SSL/TLS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. CHROME/EDGE (Khuyến nghị):" -ForegroundColor Green
Write-Host "   a. Nhấn Ctrl + Shift + Delete"
Write-Host "   b. Chọn 'Cached images and files'"
Write-Host "   c. Chọn 'All time'"
Write-Host "   d. Click 'Clear data'"
Write-Host "   e. Đóng tất cả tab của trang web"
Write-Host "   f. Mở tab mới và truy cập lại: https://10.15.87.114:3000"
Write-Host "   g. Nhấn Ctrl + Shift + R để hard refresh"
Write-Host ""
Write-Host "2. XÓA CACHE THỦ CÔNG (Nếu cách 1 không được):" -ForegroundColor Green
Write-Host "   a. Đóng Chrome/Edge hoàn toàn"
Write-Host "   b. Xóa thư mục cache:"
if (Test-Path $chromeCache) {
    Write-Host "      Chrome: $chromeCache" -ForegroundColor Yellow
}
if (Test-Path $edgeCache) {
    Write-Host "      Edge: $edgeCache" -ForegroundColor Yellow
}
Write-Host "   c. Mở lại trình duyệt"
Write-Host ""
Write-Host "3. XÓA CERTIFICATE CŨ TRONG TRÌNH DUYỆT:" -ForegroundColor Green
Write-Host "   Chrome/Edge:"
Write-Host "   a. Mở: chrome://settings/certificates (hoặc edge://settings/certificates)"
Write-Host "   b. Tab 'Authorities'"
Write-Host "   c. Tìm và xóa certificate cũ (nếu có)"
Write-Host "   d. Tab 'Your certificates'"
Write-Host "   e. Xóa certificate cũ (nếu có)"
Write-Host ""
Write-Host "4. KIỂM TRA CERTIFICATE:" -ForegroundColor Green
Write-Host "   a. Click vào icon khóa ở thanh địa chỉ"
Write-Host "   b. Click 'Certificate'"
Write-Host "   c. Kiểm tra 'Issued by' phải có 'mkcert'"
Write-Host ""
Write-Host "5. NẾU VẪN KHÔNG ĐƯỢC:" -ForegroundColor Red
Write-Host "   a. Restart máy tính"
Write-Host "   b. Hoặc thử trình duyệt khác (Chrome/Edge/Firefox)"
Write-Host ""

# Kiểm tra xem có muốn xóa cache tự động không
$response = Read-Host "Bạn có muốn xóa cache Chrome/Edge tự động? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host ""
    Write-Host "⚠️  Đang xóa cache..." -ForegroundColor Yellow
    
    # Đóng Chrome/Edge
    Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "msedge" -Force -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 2
    
    # Xóa cache
    if (Test-Path $chromeCache) {
        Remove-Item "$chromeCache\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Đã xóa cache Chrome" -ForegroundColor Green
    }
    
    if (Test-Path $edgeCache) {
        Remove-Item "$edgeCache\*" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✅ Đã xóa cache Edge" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "✅ Hoàn tất! Mở lại trình duyệt và truy cập: https://10.15.87.114:3000" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "ℹ️  Bạn có thể xóa cache thủ công theo hướng dẫn trên" -ForegroundColor Cyan
}


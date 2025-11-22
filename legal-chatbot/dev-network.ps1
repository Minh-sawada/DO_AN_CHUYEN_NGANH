# Script để chạy Next.js với network access
# Cho phép bạn bè trong cùng mạng LAN truy cập

Write-Host "🚀 Starting Next.js with network access..." -ForegroundColor Green
Write-Host "📡 Your app will be accessible at:" -ForegroundColor Cyan
Write-Host "   http://10.15.87.114:3000" -ForegroundColor Yellow
Write-Host "   http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  Make sure Windows Firewall allows Node.js!" -ForegroundColor Red
Write-Host ""

# Chạy Next.js với hostname 0.0.0.0 để cho phép truy cập từ mạng LAN
$env:HOSTNAME = "0.0.0.0"
npm run dev


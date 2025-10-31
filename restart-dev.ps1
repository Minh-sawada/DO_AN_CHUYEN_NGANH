# Script restart dev server với clear cache
Write-Host "🛑 Đang dừng các process Next.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "🧹 Đang xóa cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue
Write-Host "✅ Đã xóa cache" -ForegroundColor Green

Write-Host ""
Write-Host "🔍 Kiểm tra .env.local..." -ForegroundColor Yellow
if (Test-Path .env.local) {
    $content = Get-Content .env.local -Raw
    if ($content -match 'SUPABASE_SERVICE_ROLE_KEY=') {
        Write-Host "✅ .env.local có SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Green
    } else {
        Write-Host "❌ .env.local THIẾU SUPABASE_SERVICE_ROLE_KEY!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ File .env.local không tồn tại!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Đang khởi động dev server..." -ForegroundColor Green
npm run dev


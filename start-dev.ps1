# Jalankan PHP API Server + Vite React Dev Server bersamaan
Write-Host "Menjalankan PHP API Server di http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe" -ArgumentList "-S", "127.0.0.1:8000" -WorkingDirectory $PSScriptRoot
Write-Host "Menjalankan Vite React Dev Server di http://localhost:5173 ..." -ForegroundColor Green
npm run dev

@echo off
echo ========================================
echo   TikTok Live Dashboard - Hizli Baslatma
echo ========================================
echo.

cd backend

echo [1/3] npm paketleri kontrol ediliyor...
if not exist "node_modules" (
    echo npm install calistiriliyor...
    call npm install
) else (
    echo node_modules zaten mevcut!
)

echo.
echo [2/3] Server baslatiliyor...
start cmd /k "title TikTok Dashboard Server && npm start"

timeout /t 2 >nul

echo.
echo [3/3] Dashboard aciliyor...
start "" "..\frontend\index.html"

echo.
echo ========================================
echo   BASARILI!
echo ========================================
echo.
echo - Server: http://localhost:3001
echo - Dashboard: Tarayicida acildi
echo.
echo Kapatmak icin server penceresini kapatabilirsiniz.
echo.
pause

@echo off
cd /d "C:\Users\lenovo\Desktop\new app\satisfaction-unity-main"
echo Starting wrangler...
start /B "" cmd /c "npx wrangler pages dev . --port 8788 > %TEMP%\wrangler.log 2>&1"
echo Waiting 25 seconds for server to start...
timeout /t 25 /nobreak >nul
echo.
echo ============================================================
echo === TEST 1: POST /api/migrate {action: test_connection} ===
echo ============================================================
curl -s -X POST http://127.0.0.1:8788/api/migrate -H "Content-Type: application/json" -H "Authorization: Bearer SU-Migrate-2026-8472-Abdulla" -d "{\"action\":\"test_connection\"}"
echo.
echo.
echo ============================================================
echo === TEST 2: POST /api/migrate {action: debug_test} ===
echo ============================================================
curl -s -X POST http://127.0.0.1:8788/api/migrate -H "Content-Type: application/json" -H "Authorization: Bearer SU-Migrate-2026-8472-Abdulla" -d "{\"action\":\"debug_test\"}"
echo.
echo.
echo ============================================================
echo === WRANGLER STARTUP LOG ===
echo ============================================================
more +0 %TEMP%\wrangler.log
echo.
echo ============================================================
echo === CLEANUP ===
echo ============================================================
echo Killing wrangler...
del /q %TEMP%\kill-wrangler.bat 2>nul
echo @echo off > %TEMP%\kill-wrangler.bat
echo taskkill /f /im wrangler.exe ^>nul 2^>^&1 >> %TEMP%\kill-wrangler.bat
call %TEMP%\kill-wrangler.bat
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "127.0.0.1:8788.*LISTENING"') do taskkill /f /pid %%p >nul 2>&1
echo Done.
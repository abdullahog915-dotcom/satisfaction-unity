@echo off
start /b cmd /c "cd /d C:\Users\lenovo\Desktop\new app\satisfaction-unity-main && npx wrangler pages dev . --port 8788 > %TEMP%\wrangler.log 2>&1"
exit /b 0
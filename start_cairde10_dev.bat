@echo off
REM Start Cairde10 dev environment (frontend + OCR proxy) in two CMD windows

REM Change to your project folder on the Desktop
cd /d "%USERPROFILE%\Desktop\cairde10"

REM Optional: run this once after you first set up or after getting a new ZIP
REM npm install

REM Start Vite dev server
start "Cairde10 Vite Dev" cmd /k "npm run dev"

REM Start Vision proxy (Google Cloud Vision gateway)
start "Cairde10 Vision Proxy" cmd /k "node vision-proxy.cjs"

echo.
echo Cairde10 dev environment starting...
echo - Frontend: http://localhost:5173  (or whatever Vite shows)
echo - Proxy:    http://localhost:4000
echo.
echo You can close this window now. Use the two new CMD windows to stop servers.

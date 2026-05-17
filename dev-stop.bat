@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo A encerrar Luna dev (portas 39281 e 5173)...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":39281 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

taskkill /FI "WINDOWTITLE eq Luna Server*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Luna Vite*" /F >nul 2>&1

echo Concluido.
timeout /t 2 >nul

endlocal

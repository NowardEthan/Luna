@echo off
setlocal EnableExtensions
title Luna v1 — Dev (Electron)

cd /d "%~dp0"

set "VENV_PY=%~dp0backend\.venv\Scripts\python.exe"
set "NODE_ENV=development"
set "LUNA_USE_SERVER=1"

if not exist "%VENV_PY%" (
  echo.
  echo [ERRO] Ambiente Python nao encontrado:
  echo   %VENV_PY%
  echo.
  echo Corre primeiro:  npm run server:install
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0node_modules\electron\cli.js" (
  echo.
  echo [ERRO] Dependencias em falta. Corre:  npm install
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Luna v1 — APP NATIVO (Electron)
echo   Servidor + Vite + Electron (1 janela)
echo   Fecha esta janela para parar tudo
echo ========================================
echo.

call npm run dev
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERRO] Dev terminou com codigo %EXIT_CODE%
  pause
)

endlocal
exit /b %EXIT_CODE%

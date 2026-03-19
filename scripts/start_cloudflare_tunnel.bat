@echo off
setlocal

powershell -ExecutionPolicy Bypass -File "%~dp0start_cloudflare_tunnel.ps1"
if errorlevel 1 (
  echo.
  echo Falha ao iniciar o tunel Cloudflare.
  exit /b 1
)

endlocal

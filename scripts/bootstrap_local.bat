@echo off
setlocal

powershell -ExecutionPolicy Bypass -File "%~dp0bootstrap_local.ps1"
if errorlevel 1 (
  echo.
  echo Falha no bootstrap local. Verifique a mensagem acima.
  exit /b 1
)

echo.
echo Ambiente pronto. Abra: http://localhost:3000
endlocal

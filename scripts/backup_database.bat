@echo off
setlocal enabledelayedexpansion

REM Backup diario do banco society_db
REM Configure credenciais e caminhos antes de usar em producao.

set DB_HOST=localhost
set DB_PORT=3306
set DB_NAME=society_db
set DB_USER=root
set DB_PASS=root

set MYSQLDUMP_EXE=C:\Program Files\MariaDB 12.2\bin\mysqldump.exe
if not exist "%MYSQLDUMP_EXE%" set MYSQLDUMP_EXE=mysqldump

set BACKUP_DIR=%~dp0backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set NOW=%%i
set BACKUP_FILE=%BACKUP_DIR%\society_db_%NOW%.sql

"%MYSQLDUMP_EXE%" -h %DB_HOST% -P %DB_PORT% -u %DB_USER% -p%DB_PASS% %DB_NAME% > "%BACKUP_FILE%"
if errorlevel 1 (
  echo Falha ao gerar backup.
  exit /b 1
)

echo Backup gerado em: %BACKUP_FILE%

REM Exemplo de envio para nuvem (descomente e configure):
REM rclone copy "%BACKUP_FILE%" remote:quadra-backups/

REM Exemplo de envio por email (PowerShell SMTP):
REM powershell -NoProfile -Command "Send-MailMessage -From 'origem@dominio.com' -To 'destino@dominio.com' -Subject 'Backup DB' -Body 'Backup diario' -Attachments '%BACKUP_FILE%' -SmtpServer 'smtp.dominio.com' -Port 587 -UseSsl -Credential (Get-Credential)"

endlocal

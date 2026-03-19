$ErrorActionPreference = 'Stop'

function Resolve-Binary([string[]] $candidates) {
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }
  return $null
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$schemaFile = Join-Path $projectRoot 'database\001_init.sql'

if (-not (Test-Path $schemaFile)) {
  throw "Schema nao encontrado em $schemaFile"
}

$mysql = Resolve-Binary @(
  'C:\Program Files\MariaDB 12.2\bin\mysql.exe',
  'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
)
if (-not $mysql) {
  throw 'mysql.exe nao encontrado. Instale MariaDB/MySQL client.'
}

$dbHost = if ($env:QUADRA_DB_HOST) { $env:QUADRA_DB_HOST } else { '127.0.0.1' }
$dbPort = if ($env:QUADRA_DB_PORT) { [int]$env:QUADRA_DB_PORT } else { 3306 }
$dbRootUser = if ($env:QUADRA_DB_ROOT_USER) { $env:QUADRA_DB_ROOT_USER } else { 'root' }
$dbRootPass = if ($env:QUADRA_DB_ROOT_PASS) { $env:QUADRA_DB_ROOT_PASS } else { 'root' }
$dbName = if ($env:QUADRA_DB_NAME) { $env:QUADRA_DB_NAME } else { 'society_db' }
$dbAppUser = if ($env:QUADRA_DB_APP_USER) { $env:QUADRA_DB_APP_USER } else { 'society_user' }
$dbAppPass = if ($env:QUADRA_DB_APP_PASS) { $env:QUADRA_DB_APP_PASS } else { 'society_pass' }

$safeAppUser = $dbAppUser.Replace("'", "''")
$safeAppPass = $dbAppPass.Replace("'", "''")
$bootstrapSql = @"
CREATE DATABASE IF NOT EXISTS $dbName;
CREATE USER IF NOT EXISTS '$safeAppUser'@'localhost' IDENTIFIED BY '$safeAppPass';
CREATE USER IF NOT EXISTS '$safeAppUser'@'127.0.0.1' IDENTIFIED BY '$safeAppPass';
GRANT ALL PRIVILEGES ON $dbName.* TO '$safeAppUser'@'localhost';
GRANT ALL PRIVILEGES ON $dbName.* TO '$safeAppUser'@'127.0.0.1';
FLUSH PRIVILEGES;
"@

Write-Output 'Garantindo database e usuario da aplicacao...'
& $mysql -h $dbHost -P $dbPort -u $dbRootUser "-p$dbRootPass" -e $bootstrapSql
if ($LASTEXITCODE -ne 0) {
  throw 'Falha ao preparar database/usuario.'
}

Write-Output 'Aplicando schema idempotente...'
Get-Content -Raw $schemaFile | & $mysql -h $dbHost -P $dbPort -u $dbRootUser "-p$dbRootPass"
if ($LASTEXITCODE -ne 0) {
  throw 'Falha ao aplicar schema.'
}

Write-Output 'Schema aplicado com sucesso.'

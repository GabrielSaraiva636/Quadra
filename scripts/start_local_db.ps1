$ErrorActionPreference = 'Stop'

function Resolve-Binary([string[]] $candidates) {
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }
  return $null
}

$dbPort = if ($env:QUADRA_DB_PORT) { [int]$env:QUADRA_DB_PORT } else { 3306 }
$dbRootUser = if ($env:QUADRA_DB_ROOT_USER) { $env:QUADRA_DB_ROOT_USER } else { 'root' }
$dbRootPass = if ($env:QUADRA_DB_ROOT_PASS) { $env:QUADRA_DB_ROOT_PASS } else { 'root' }
$dataDir = if ($env:QUADRA_DB_DATADIR) { $env:QUADRA_DB_DATADIR } else { 'C:\mariadb-data' }
$defaults = Join-Path $dataDir 'my.ini'

$mysqld = Resolve-Binary @(
  'C:\Program Files\MariaDB 12.2\bin\mysqld.exe',
  'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
)
$mysql = Resolve-Binary @(
  'C:\Program Files\MariaDB 12.2\bin\mysql.exe',
  'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe'
)
$installDb = Resolve-Binary @(
  'C:\Program Files\MariaDB 12.2\bin\mariadb-install-db.exe',
  'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql_install_db.exe'
)

if (-not $mysqld) { throw 'mysqld.exe nao encontrado. Instale MariaDB/MySQL.' }
if (-not $mysql) { throw 'mysql.exe nao encontrado. Instale MariaDB/MySQL client.' }

if (-not (Test-Path $defaults)) {
  if (-not $installDb) {
    throw "Arquivo $defaults nao encontrado e utilitario de inicializacao nao disponivel."
  }

  if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
  }

  Write-Output "Inicializando datadir em $dataDir ..."
  & $installDb -d $dataDir -p $dbRootPass -P $dbPort -s
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao inicializar o datadir do MariaDB.'
  }
}

$isListening = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq $dbPort } |
  Select-Object -First 1

if ($isListening) {
  try {
    & $mysql -h 127.0.0.1 -P $dbPort -u $dbRootUser "-p$dbRootPass" -e "SELECT 1 AS ok;" | Out-Null
    Write-Output "MariaDB ja esta rodando na porta $dbPort."
    exit 0
  } catch {
    throw "Existe processo ouvindo porta $dbPort, mas conexao MySQL falhou."
  }
}

$proc = Start-Process -FilePath $mysqld -ArgumentList "--defaults-file=$defaults" -PassThru

$ok = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  try {
    & $mysql -h 127.0.0.1 -P $dbPort -u $dbRootUser "-p$dbRootPass" -e "SELECT 1 AS ok;" | Out-Null
    $ok = $true
    break
  } catch {
  }
}

if (-not $ok) {
  throw 'MariaDB nao respondeu no tempo esperado.'
}

Write-Output "MariaDB iniciado com sucesso. PID=$($proc.Id) PORT=$dbPort"

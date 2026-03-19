$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$out = Join-Path $projectRoot 'backend_server.out'
$err = Join-Path $projectRoot 'backend_server.err'
$port = 3000

if (-not (Test-Path (Join-Path $backendRoot '.env'))) {
  Copy-Item (Join-Path $backendRoot '.env.example') (Join-Path $backendRoot '.env')
  Write-Output 'Arquivo backend/.env criado a partir do .env.example'
}

if (-not (Test-Path (Join-Path $backendRoot 'node_modules'))) {
  Write-Output 'Instalando dependencias do backend...'
  npm --prefix $backendRoot install
  if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao instalar dependencias do backend.'
  }
}

$listener = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -eq $port } |
  Select-Object -First 1

if ($listener) {
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:$port/api/health" -Method Get -TimeoutSec 3
    if ($health.ok -eq $true) {
      Write-Output "API ja esta rodando na porta $port (PID=$($listener.OwningProcess))."
      exit 0
    }
  } catch {
    throw "Porta $port ocupada por PID $($listener.OwningProcess), mas /api/health nao respondeu."
  }
}

$proc = Start-Process -FilePath 'npm.cmd' `
  -ArgumentList "--prefix `"$backendRoot`" start" `
  -WorkingDirectory $projectRoot `
  -PassThru `
  -RedirectStandardOutput $out `
  -RedirectStandardError $err

$ok = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 1
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:$port/api/health" -Method Get -TimeoutSec 3
    if ($health.ok -eq $true) {
      $ok = $true
      break
    }
  } catch {
  }
}

if ($ok) {
  Write-Output "API iniciada com sucesso. PID=$($proc.Id) PORT=$port"
} else {
  Write-Output 'API nao respondeu em /api/health. Veja backend_server.err'
  exit 1
}

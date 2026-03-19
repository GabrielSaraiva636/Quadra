$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiPort = 3000
$apiUrl = "http://localhost:$apiPort"

function Resolve-CloudflaredPath {
  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Path) {
    return $cmd.Path
  }

  $candidates = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe",
    'C:\Program Files\Cloudflare\Cloudflared\cloudflared.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Test-ApiHealth {
  param(
    [string]$Url
  )

  try {
    $health = Invoke-RestMethod -Uri "$Url/api/health" -Method Get -TimeoutSec 3
    return $health.ok -eq $true
  } catch {
    return $false
  }
}

$cloudflaredPath = Resolve-CloudflaredPath

if (-not $cloudflaredPath) {
  Write-Output 'cloudflared nao encontrado no sistema.'
  Write-Output 'Instale com: winget install Cloudflare.cloudflared'
  exit 1
}

if (-not (Test-ApiHealth -Url $apiUrl)) {
  Write-Output "API nao encontrada em $apiUrl. Iniciando stack local..."
  & "$projectRoot\scripts\bootstrap_local.ps1"
}

if (-not (Test-ApiHealth -Url $apiUrl)) {
  throw "API continua indisponivel em $apiUrl."
}

Write-Output ''
Write-Output 'Iniciando tunel publico gratuito (trycloudflare)...'
Write-Output 'Quando a URL aparecer, compartilhe esse link.'
Write-Output 'Mantenha este terminal aberto para o site continuar no ar.'
Write-Output 'Para parar, pressione Ctrl+C.'
Write-Output ''

& $cloudflaredPath tunnel --url $apiUrl

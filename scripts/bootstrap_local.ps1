$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
  Write-Output '==> Iniciando banco local...'
  & "$projectRoot\scripts\start_local_db.ps1"

  Write-Output '==> Garantindo schema e usuario da aplicacao...'
  & "$projectRoot\scripts\init_database.ps1"

  Write-Output '==> Iniciando API...'
  & "$projectRoot\scripts\start_api.ps1"

  Write-Output '==> Executando smoke test...'
  & "$projectRoot\scripts\smoke_test.ps1"

  Write-Output ''
  Write-Output 'Sistema pronto para uso.'
  Write-Output 'URL: http://localhost:3000'
  Write-Output 'Login: admin@society.local'
  Write-Output 'Senha: admin123'
} finally {
  Pop-Location
}

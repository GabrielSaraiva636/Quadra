$ErrorActionPreference = 'Stop'

$base = if ($env:QUADRA_API_BASE_URL) { $env:QUADRA_API_BASE_URL } else { 'http://localhost:3000/api' }
$adminUser = if ($env:QUADRA_ADMIN_USER) { $env:QUADRA_ADMIN_USER } else { 'admin@society.local' }
$adminPass = if ($env:QUADRA_ADMIN_PASS) { $env:QUADRA_ADMIN_PASS } else { 'admin123' }

Write-Output 'Teste: health...'
$health = Invoke-RestMethod -Uri "$base/health" -Method Get -TimeoutSec 5
if (-not $health.ok) { throw 'Healthcheck falhou.' }

Write-Output 'Teste: login admin...'
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body (
  @{ identifier = $adminUser; password = $adminPass } | ConvertTo-Json
)
if (-not $login.token) { throw 'Login nao retornou token.' }

$headers = @{ Authorization = "Bearer $($login.token)" }

Write-Output 'Teste: auth/me...'
$me = Invoke-RestMethod -Uri "$base/auth/me" -Method Get -Headers $headers -TimeoutSec 5
if (-not $me.id) { throw 'Endpoint /auth/me sem dados validos.' }

Write-Output 'Teste: endpoints principais...'
[void](Invoke-RestMethod -Uri "$base/games" -Method Get -Headers $headers -TimeoutSec 5)
[void](Invoke-RestMethod -Uri "$base/products" -Method Get -Headers $headers -TimeoutSec 5)
[void](Invoke-RestMethod -Uri "$base/payments" -Method Get -Headers $headers -TimeoutSec 5)
[void](Invoke-RestMethod -Uri "$base/cash-register/today" -Method Get -Headers $headers -TimeoutSec 5)
[void](Invoke-RestMethod -Uri "$base/indicators/monthly?month=$([DateTime]::Now.Month)&year=$([DateTime]::Now.Year)" -Method Get -Headers $headers -TimeoutSec 5)

Write-Output 'Smoke test: OK'

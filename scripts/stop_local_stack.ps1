$ErrorActionPreference = 'Continue'

$apiListener = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 3000 } | Select-Object -First 1
if ($apiListener) {
  Stop-Process -Id $apiListener.OwningProcess -Force
  Write-Output "API parada (PID=$($apiListener.OwningProcess))."
} else {
  Write-Output 'API ja estava parada.'
}

$mysqlProcs = @(Get-Process -Name mysqld -ErrorAction SilentlyContinue) + @(Get-Process -Name mariadbd -ErrorAction SilentlyContinue)
if ($mysqlProcs) {
  $mysqlProcs | ForEach-Object { Stop-Process -Id $_.Id -Force }
  Write-Output 'MariaDB parado.'
} else {
  Write-Output 'MariaDB ja estava parado.'
}

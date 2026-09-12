$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot "Start-LoreBible-Test.ps1"
$candidatePorts = 3001..3010

function Get-VerifiedLoreBibleListenerPid {
  param([int]$Port)

  try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 1
    if ($health.status -ne "ok" -or $health.capabilities.selectedModelGenerationTest -ne $true) { return $null }
    $listener = netstat.exe -ano 2>$null | Select-String -Pattern ":$Port\s+.*LISTENING" | Select-Object -First 1
    if ($null -eq $listener) { return $null }
    $parts = ([string]$listener).Trim() -split "\s+"
    $listenerPid = 0
    if (-not [int]::TryParse($parts[-1], [ref]$listenerPid)) { return $null }
    return $listenerPid
  } catch {
    return $null
  }
}

foreach ($port in $candidatePorts) {
  $listenerPid = Get-VerifiedLoreBibleListenerPid -Port $port
  if ($null -eq $listenerPid) { continue }
  Stop-Process -Id $listenerPid -Force -ErrorAction Stop
}

$deadline = (Get-Date).AddSeconds(10)
do {
  $remaining = @($candidatePorts | Where-Object { $null -ne (Get-VerifiedLoreBibleListenerPid -Port $_) })
  if ($remaining.Count -eq 0) { break }
  Start-Sleep -Milliseconds 250
} while ((Get-Date) -lt $deadline)

& $launcher

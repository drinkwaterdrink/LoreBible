$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
$testPort = 3001
$env:PORT = "$testPort"
Set-Location -LiteralPath $appRoot

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  throw "Bun was not found on PATH. Install Bun 1.3.14 or add it to PATH before launching LoreBible Test."
}

$healthUri = "http://127.0.0.1:$testPort/api/health"
$appUri = "http://localhost:$testPort"
$healthy = $false
try {
  $probe = Invoke-WebRequest -Uri $healthUri -UseBasicParsing -TimeoutSec 1
  $healthy = $probe.StatusCode -eq 200
} catch {
  $healthy = $false
}

if (-not $healthy) {
  $localBase = $env:LOCALAPPDATA
  if ([string]::IsNullOrWhiteSpace($localBase)) { $localBase = Join-Path $env:USERPROFILE "AppData\Local" }
  $logRoot = Join-Path $localBase "LoreBible\test-logs"
  New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
  $stdoutPath = Join-Path $logRoot "launcher.out.log"
  $stderrPath = Join-Path $logRoot "launcher.err.log"
  Start-Process -FilePath "bun" -ArgumentList @("run", "dev") -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath

  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 500
    try {
      $probe = Invoke-WebRequest -Uri $healthUri -UseBasicParsing -TimeoutSec 1
      $healthy = $probe.StatusCode -eq 200
    } catch {
      $healthy = $false
    }
  } while (-not $healthy -and (Get-Date) -lt $deadline)
}

if (-not $healthy) {
  throw "LoreBible Test did not become healthy within 30 seconds. See %LOCALAPPDATA%\LoreBible\test-logs."
}

Start-Process $appUri

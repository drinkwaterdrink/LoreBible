$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
$expectedVersion = "0.45"
$candidatePorts = 3001..3010
Set-Location -LiteralPath $appRoot

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  throw "Bun was not found on PATH. Install Bun 1.3.14 or add it to PATH before launching LoreBible Test."
}

function Get-LoreBibleHealth {
  param([int]$Port)

  try {
    $probe = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 1
    if ($probe.StatusCode -ne 200) { return $null }
    return ($probe.Content | ConvertFrom-Json)
  } catch {
    return $null
  }
}

function Test-LoreBibleHealth {
  param([int]$Port)

  $payload = Get-LoreBibleHealth -Port $Port
  return $null -ne $payload -and $payload.status -eq "ok" -and $payload.version -eq $expectedVersion -and $payload.capabilities.selectedModelGenerationTest -eq $true -and $payload.capabilities.connectionModelMetadata -eq $true
}

function Test-LoreBiblePortAvailable {
  param([int]$Port)

  try {
    $netstatListeners = @(netstat.exe -ano 2>$null | Select-String -Pattern ":$Port\s+.*LISTENING")
    if ($netstatListeners.Count -gt 0) { return $false }
  } catch {
    # Continue with the PowerShell/TCP checks below when netstat is unavailable.
  }

  try {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop)
    return $listeners.Count -eq 0
  } catch {
    try {
      $client = [System.Net.Sockets.TcpClient]::new()
      $client.Connect("127.0.0.1", $Port)
      $client.Dispose()
      return $false
    } catch {
      return $true
    }
  }
}

$selectedPort = $null
foreach ($candidate in $candidatePorts) {
  if (Test-LoreBibleHealth -Port $candidate) {
    $selectedPort = $candidate
    break
  }

  if (Test-LoreBiblePortAvailable -Port $candidate) {
    $selectedPort = $candidate
    break
  }
}

if ($null -eq $selectedPort) {
  throw "No available LoreBible test port was found in the range $($candidatePorts[0])-$($candidatePorts[-1])."
}

$testPort = $selectedPort
$env:PORT = "$testPort"
$healthUri = "http://127.0.0.1:$testPort/api/health"
$appUri = "http://localhost:$testPort"
$healthy = Test-LoreBibleHealth -Port $testPort

if (-not $healthy) {
  $localBase = $env:LOCALAPPDATA
  if ([string]::IsNullOrWhiteSpace($localBase)) { $localBase = Join-Path $env:USERPROFILE "AppData\Local" }
  $logRoot = Join-Path $localBase "LoreBible\test-logs"
  New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
  $logStamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $stdoutPath = Join-Path $logRoot "launcher-$logStamp-$PID.out.log"
  $stderrPath = Join-Path $logRoot "launcher-$logStamp-$PID.err.log"
  Start-Process -FilePath "bun" -ArgumentList @("run", "dev") -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath

  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 500
    $healthy = Test-LoreBibleHealth -Port $testPort
  } while (-not $healthy -and (Get-Date) -lt $deadline)
}

if (-not $healthy) {
  throw "LoreBible Test did not become healthy at v$expectedVersion within 30 seconds on port $testPort. See %LOCALAPPDATA%\LoreBible\test-logs."
}

Start-Process $appUri

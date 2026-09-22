$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $appRoot "package.json") -Raw | ConvertFrom-Json
$expectedVersion = ([string]$package.version) -replace "\.0$", ""
Set-Location -LiteralPath $appRoot

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
  throw "Bun was not found on PATH. Install Bun 1.3.14 or add it to PATH before launching Lore Bible."
}

# Ensure we are on the active UI overhaul branch if git is available
try {
  $currentBranch = (git branch --show-current 2>$null).Trim()
  if ($currentBranch -and $currentBranch -ne "Test-3-UI-Overhaul") {
    Write-Host "Switching from $currentBranch to Test-3-UI-Overhaul..."
    git switch Test-3-UI-Overhaul 2>$null
  }
} catch {}

function Stop-ExistingLoreBible {
  param([int]$Port = 3000)

  $candidatePorts = @($Port) + @(3001..3010)

  # 1. Terminate any process currently listening on target port or test candidate ports
  foreach ($p in $candidatePorts) {
    try {
      $listeners = @(netstat.exe -ano 2>$null | Select-String -Pattern ":$p\s+.*LISTENING")
      foreach ($line in $listeners) {
        $parts = ([string]$line).Trim() -split "\s+"
        $listenerPid = 0
        if ([int]::TryParse($parts[-1], [ref]$listenerPid) -and $listenerPid -gt 0 -and $listenerPid -ne $PID) {
          try {
            Stop-Process -Id $listenerPid -Force -ErrorAction SilentlyContinue
          } catch {}
        }
      }
    } catch {}
  }

  # 2. Terminate any bun process running in this repository directory
  try {
    $bunProcesses = Get-CimInstance Win32_Process -Filter "name = 'bun.exe'" -ErrorAction SilentlyContinue
    foreach ($proc in $bunProcesses) {
      if ($proc.ProcessId -ne $PID -and ($proc.CommandLine -match [regex]::Escape($appRoot) -or $proc.WorkingDirectory -match [regex]::Escape($appRoot))) {
        try {
          Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
        } catch {}
      }
    }
  } catch {}


  # 3. Wait up to 3 seconds for port to clear
  $deadline = (Get-Date).AddSeconds(3)
  do {
    $stillListening = @(netstat.exe -ano 2>$null | Select-String -Pattern ":$Port\s+.*LISTENING")
    if ($stillListening.Count -eq 0) { break }
    Start-Sleep -Milliseconds 200
  } while ((Get-Date) -lt $deadline)
}

# Reset any existing running instance so we always open a fresh, latest build
Stop-ExistingLoreBible -Port 3000

$healthUri = "http://127.0.0.1:3000/api/health"
$healthy = $false
function Test-LoreBibleHealth {
  try {
    $probe = Invoke-WebRequest -Uri $healthUri -UseBasicParsing -TimeoutSec 1
    if ($probe.StatusCode -ne 200) { return $false }
    $payload = $probe.Content | ConvertFrom-Json
    return $payload.status -eq "ok" -and $payload.version -eq $expectedVersion -and $payload.capabilities.selectedModelGenerationTest -eq $true -and $payload.capabilities.connectionModelMetadata -eq $true
  } catch {
    return $false
  }
}

$localBase = $env:LOCALAPPDATA
if ([string]::IsNullOrWhiteSpace($localBase)) { $localBase = Join-Path $env:USERPROFILE "AppData\Local" }
$logRoot = Join-Path $localBase "LoreBible\logs"
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$stdoutPath = Join-Path $logRoot "launcher.out.log"
$stderrPath = Join-Path $logRoot "launcher.err.log"
Start-Process -FilePath "bun" -ArgumentList @("run", "dev") -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath

$deadline = (Get-Date).AddSeconds(30)
do {
  Start-Sleep -Milliseconds 500
  $healthy = Test-LoreBibleHealth
} while (-not $healthy -and (Get-Date) -lt $deadline)

if (-not $healthy) {
  throw "Lore Bible did not become healthy at v$expectedVersion within 30 seconds. A previous server may still own port 3000; close that process and relaunch. See the local launcher log under %LOCALAPPDATA%\LoreBible\logs."
}

Start-Process "http://localhost:3000"


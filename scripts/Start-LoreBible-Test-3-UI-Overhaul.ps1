$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $appRoot

# Specifically switch to and synchronize Test-3-UI-Overhaul branch without native stderr exceptions
$oldEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"

Write-Host "Checking for updates on branch Test-3-UI-Overhaul..." -ForegroundColor Cyan
git.exe fetch origin Test-3-UI-Overhaul 2>$null
git.exe switch Test-3-UI-Overhaul 2>$null

$localHead = (git.exe rev-parse HEAD 2>$null)
$remoteHead = (git.exe rev-parse origin/Test-3-UI-Overhaul 2>$null)

if ($localHead -and $remoteHead -and $localHead -ne $remoteHead) {
  Write-Host "Synchronizing Test-3-UI-Overhaul with latest origin commits..." -ForegroundColor Cyan
  git.exe pull --ff-only origin Test-3-UI-Overhaul 2>$null
} else {
  Write-Host "Branch Test-3-UI-Overhaul is up to date." -ForegroundColor Green
}

$ErrorActionPreference = $oldEap

# The branch-specific shortcut launches the primary reset launcher to close previous instances and open the latest build
& (Join-Path $PSScriptRoot "Start-LoreBible.ps1")

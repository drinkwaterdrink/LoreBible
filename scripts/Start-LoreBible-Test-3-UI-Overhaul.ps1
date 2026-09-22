$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $appRoot

# Specifically switch to and synchronize Test-3-UI-Overhaul branch
try {
  git fetch origin Test-3-UI-Overhaul 2>$null
  git switch Test-3-UI-Overhaul 2>$null
  $localHead = (git rev-parse HEAD 2>$null).Trim()
  $remoteHead = (git rev-parse origin/Test-3-UI-Overhaul 2>$null).Trim()
  if ($localHead -and $remoteHead -and $localHead -ne $remoteHead) {
    Write-Host "Synchronizing Test-3-UI-Overhaul with latest origin commits..."
    git pull origin Test-3-UI-Overhaul 2>$null
  }
} catch {
  Write-Warning "Could not synchronize with origin/Test-3-UI-Overhaul: $_"
}

# The branch-specific shortcut launches the primary reset launcher to close previous instances and open the latest build
& (Join-Path $PSScriptRoot "Start-LoreBible.ps1")

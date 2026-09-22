$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot "Start-LoreBible-Test-3-UI-Overhaul.ps1"

# Collect all desktop paths (primary user desktop and OneDrive desktop if present)
$desktopLocations = @(
  [Environment]::GetFolderPath("Desktop"),
  (Join-Path $env:USERPROFILE "OneDrive\Desktop"),
  (Join-Path $env:USERPROFILE "Desktop")
) | Where-Object { Test-Path $_ } | Select-Object -Unique

$shell = New-Object -ComObject WScript.Shell
$shortcutNames = @(
  "Lore Bible Test-3-UI-Overhaul.lnk",
  "Lore Bible (Test-3-UI-Overhaul).lnk"
)

$installedPaths = @()

foreach ($desktop in $desktopLocations) {
  foreach ($name in $shortcutNames) {
    $shortcutPath = Join-Path $desktop $name
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = (Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe")
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
    $shortcut.WorkingDirectory = $appRoot
    $shortcut.Description = "Reset and launch Lore Bible from the Test-3-UI-Overhaul branch"
    $shortcut.Save()
    $installedPaths += $shortcutPath
  }
}

Write-Output ($installedPaths | Select-Object -Unique)

$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot "Start-LoreBible.ps1"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Lore Bible.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = (Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe")
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
$shortcut.WorkingDirectory = $appRoot
$shortcut.Description = "Launch Lore Bible Scenario Studio (Resets and opens latest)"
$shortcut.Save()

$branchShortcutPath = Join-Path $desktop "Lore Bible (Test-3-UI-Overhaul).lnk"
$branchShortcut = $shell.CreateShortcut($branchShortcutPath)
$branchShortcut.TargetPath = (Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe")
$branchShortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
$branchShortcut.WorkingDirectory = $appRoot
$branchShortcut.Description = "Launch Lore Bible Scenario Studio (Test-3-UI-Overhaul)"
$branchShortcut.Save()

Write-Output $shortcutPath


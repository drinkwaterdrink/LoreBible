$ErrorActionPreference = "Stop"
$appRoot = Split-Path -Parent $PSScriptRoot
$restartLauncher = Join-Path $PSScriptRoot "Restart-LoreBible-Test.ps1"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "LoreBible Test.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$restartLauncher`""
$shortcut.WorkingDirectory = $appRoot
$shortcut.Description = "Restart and open the current LoreBible test branch"
$shortcut.Save()

Write-Output $shortcutPath

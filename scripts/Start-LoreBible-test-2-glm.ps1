$ErrorActionPreference = "Stop"
$appRoot = "C:\Users\trent\Downloads\LoreBible-main\.worktrees\m07-artifact-ir"
Set-Location -LiteralPath $appRoot
git fetch origin test-2-glm
git switch test-2-glm
$localHead = git rev-parse HEAD
$remoteHead = git rev-parse origin/test-2-glm
if ($localHead -ne $remoteHead) {
  throw "test-2-glm is not synchronized with origin/test-2-glm. Resolve this before launching."
}
& (Join-Path $PSScriptRoot "Start-LoreBible.ps1")
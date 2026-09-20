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
# The branch-specific shortcut must use the isolated test launcher and its
# reset path. The fixed-port production launcher can leave a stale process
# behind and open the browser against an older server instance.
& (Join-Path $PSScriptRoot "Restart-LoreBible-Test.ps1")

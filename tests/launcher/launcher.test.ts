import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(process.cwd());

test("launcher starts from its own repository path and polls health without credentials", async () => {
  const launcher = await readFile(join(root, "scripts", "Start-LoreBible.ps1"), "utf8");
  expect(launcher).toContain("$appRoot = Split-Path -Parent $PSScriptRoot");
  expect(launcher).toContain("/api/health");
  expect(launcher).toContain("Start-Process \"http://localhost:3000\"");
  expect(launcher).toContain('$expectedVersion = ([string]$package.version) -replace "\\.0$", ""');
  expect(launcher).toContain('selectedModelGenerationTest');
  expect(launcher).not.toContain("GEMINI_API_KEY");
});

test("shortcut installer targets the launcher and does not pass a provider secret", async () => {
  const installer = await readFile(join(root, "scripts", "Install-LoreBibleShortcut.ps1"), "utf8");
  expect(installer).toContain("Lore Bible.lnk");
  expect(installer).toContain("Start-LoreBible.ps1");
  expect(installer).toContain("-NoProfile -ExecutionPolicy Bypass -File");
  expect(installer).not.toContain("apiKey");
});

test("test launcher uses an isolated port and the server accepts a configured port", async () => {
  const launcher = await readFile(join(root, "scripts", "Start-LoreBible-Test.ps1"), "utf8");
  const server = await readFile(join(root, "server.ts"), "utf8");

  expect(launcher).toContain('$candidatePorts = 3001..3010');
  expect(launcher).toContain('$testPort = $selectedPort');
  expect(launcher).toContain('$env:PORT = "$testPort"');
  expect(launcher).toContain('http://localhost:$testPort');
  expect(launcher).toContain('LoreBible\\test-logs');
  expect(launcher).toContain('$expectedVersion = ([string]$package.version) -replace "\\.0$", ""');
  expect(launcher).toContain('selectedModelGenerationTest');
  expect(server).toContain("process.env.PORT");
  expect(server).not.toContain("const PORT = 3000;");
  expect(launcher).not.toContain("GEMINI_API_KEY");
});

test("test restart shortcut stops healthy LoreBible listeners on isolated test ports", async () => {
  const restart = await readFile(join(root, "scripts", "Restart-LoreBible-Test.ps1"), "utf8");
  const installer = await readFile(join(root, "scripts", "Install-LoreBibleTestShortcut.ps1"), "utf8");

  expect(restart).toContain("3001..3010");
  expect(restart).toContain("/api/health");
  expect(restart).toContain('$health.status -ne "ok"');
  expect(restart).not.toContain("selectedModelGenerationTest");
  expect(restart).toContain("Stop-Process -Id $listenerPid");
  expect(restart).toContain("Start-LoreBible-Test.ps1");
  expect(restart).not.toContain("3000");
  expect(installer).toContain("LoreBible Test.lnk");
  expect(installer).toContain("Restart-LoreBible-Test.ps1");
  expect(installer).not.toContain("apiKey");
});

test("test launcher selects a free fallback port when an older server owns 3001", async () => {
  const launcher = await readFile(join(root, "scripts", "Start-LoreBible-Test.ps1"), "utf8");

  expect(launcher).toContain("$candidatePorts = 3001..3010");
  expect(launcher).toContain("function Test-LoreBiblePortAvailable");
  expect(launcher).toContain("netstat.exe -ano");
  expect(launcher).toContain("$selectedPort");
  expect(launcher).toContain('$testPort = $selectedPort');
  expect(launcher).toContain('http://127.0.0.1:$testPort/api/health');
  expect(launcher).toContain('$logStamp = Get-Date -Format');
  expect(launcher).toContain('launcher-$logStamp-$PID.out.log');
});

test("test-2-glm shortcut runs the reset path before opening the current branch", async () => {
  const launcher = await readFile(join(root, "scripts", "Start-LoreBible-test-2-glm.ps1"), "utf8");
  const installer = await readFile(join(root, "scripts", "Install-LoreBible-test-2-glm-Shortcut.ps1"), "utf8");

  expect(launcher).toContain("Restart-LoreBible-Test.ps1");
  expect(launcher).not.toContain("Start-LoreBible.ps1");
  expect(installer).toContain("Start-LoreBible-test-2-glm.ps1");
  expect(installer).toContain("Reset");
});

test("test reset recognizes older healthy LoreBible servers without requiring new capabilities", async () => {
  const restart = await readFile(join(root, "scripts", "Restart-LoreBible-Test.ps1"), "utf8");

  expect(restart).toContain('$health.status -ne "ok"');
  expect(restart).toContain("$health.capabilities");
  expect(restart).toContain("$health.version");
  expect(restart).not.toContain("$health.capabilities.selectedModelGenerationTest -ne $true");
});

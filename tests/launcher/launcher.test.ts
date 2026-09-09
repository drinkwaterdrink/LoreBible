import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(process.cwd());

test("launcher starts from its own repository path and polls health without credentials", async () => {
  const launcher = await readFile(join(root, "scripts", "Start-LoreBible.ps1"), "utf8");
  expect(launcher).toContain("$appRoot = Split-Path -Parent $PSScriptRoot");
  expect(launcher).toContain("/api/health");
  expect(launcher).toContain("Start-Process \"http://localhost:3000\"");
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

  expect(launcher).toContain('$testPort = 3001');
  expect(launcher).toContain('$env:PORT = "$testPort"');
  expect(launcher).toContain('http://localhost:$testPort');
  expect(launcher).toContain('LoreBible\\test-logs');
  expect(server).toContain("process.env.PORT");
  expect(server).not.toContain("const PORT = 3000;");
  expect(launcher).not.toContain("GEMINI_API_KEY");
});

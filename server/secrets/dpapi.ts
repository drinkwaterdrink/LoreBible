import { spawn } from "node:child_process";
import type { SecretProtector } from "./types.js";

function encodedScript(script: string): string { return Buffer.from(script, "utf16le").toString("base64"); }
function runPowerShell(script: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedScript(script)], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stderr.trim() || `PowerShell exited with ${code}`)));
    child.stdin.end(input, "utf8");
  });
}
export function createWindowsDpapiProtector(): SecretProtector {
  if (process.platform !== "win32") throw new Error("Persistent API-key storage requires Windows DPAPI.");
  return {
    protect: (plaintext) => runPowerShell(`Add-Type -AssemblyName System.Security;$plain=[Console]::In.ReadToEnd();$bytes=[Text.Encoding]::UTF8.GetBytes($plain);$protected=[System.Security.Cryptography.ProtectedData]::Protect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($protected))`, plaintext),
    unprotect: (ciphertext) => runPowerShell(`Add-Type -AssemblyName System.Security;$cipher=[Console]::In.ReadToEnd();$bytes=[Convert]::FromBase64String($cipher);$plain=[System.Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain))`, ciphertext),
  };
}

import { expect, test } from "bun:test";
import { createWindowsDpapiProtector } from "../../server/secrets/dpapi";

test("DPAPI round-trips a secret for the current Windows user", async () => {
  if (process.platform !== "win32") return;
  const protector = createWindowsDpapiProtector();
  const cipher = await protector.protect("sk-test-never-log");
  expect(cipher).not.toContain("sk-test-never-log");
  expect(await protector.unprotect(cipher)).toBe("sk-test-never-log");
});

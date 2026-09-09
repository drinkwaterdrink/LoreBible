import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("GitHub Actions enforces the pinned Windows release gate", () => {
  const workflow = readFileSync(resolve(import.meta.dir, "../../.github/workflows/quality.yml"), "utf8");

  expect(workflow).toContain("windows-latest");
  expect(workflow).toContain('bun-version: "1.3.14"');
  expect(workflow).toContain("bun install --frozen-lockfile");
  expect(workflow).toContain("bun test");
  expect(workflow).toContain("bun run typecheck");
  expect(workflow).toContain("bun run build");
});

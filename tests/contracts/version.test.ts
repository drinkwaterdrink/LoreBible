import { expect, test } from "bun:test";
import packageJson from "../../package.json";
import { APP_VERSION } from "../../src/version";

test("display version matches the SemVer package release", () => {
  expect(APP_VERSION).toBe("0.32");
  expect(packageJson.version).toBe(`${APP_VERSION}.0`);
});

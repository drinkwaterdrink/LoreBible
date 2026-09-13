import { expect, test } from "bun:test";
import { parseNativeLumiverseCharxModulesV1, parseNativeLumiverseWorldBookV1 } from "../../src/contracts/lumiverseWorldBook";
import { compareNativeLumiverseWorldBooks } from "../../src/lib/artifacts/lumiverseBookParity";
import {
  NATIVE_CHARX_WORLD_BOOK_MODULE_FIXTURE,
  NATIVE_STANDALONE_WORLD_BOOK_FIXTURE,
} from "../fixtures/lumiverseNativeCharxWorldBook";

test("accepts the nullable and numeric value types observed in a native Lumiverse CHARX", () => {
  const standalone = parseNativeLumiverseWorldBookV1(NATIVE_STANDALONE_WORLD_BOOK_FIXTURE);
  const modules = parseNativeLumiverseCharxModulesV1(NATIVE_CHARX_WORLD_BOOK_MODULE_FIXTURE);

  expect(standalone.entries[0].automation_id).toBeNull();
  expect(standalone.entries[0].exclude_greeting).toBe(0);
  expect(modules.world_books[0].entries[0].wi_marker).toBeNull();
});

test("native CHARX module preserves the full standalone World Book except export time", () => {
  const standalone = parseNativeLumiverseWorldBookV1(NATIVE_STANDALONE_WORLD_BOOK_FIXTURE);
  const modules = parseNativeLumiverseCharxModulesV1(NATIVE_CHARX_WORLD_BOOK_MODULE_FIXTURE);

  expect(compareNativeLumiverseWorldBooks(standalone, modules.world_books[0])).toEqual({
    equal: true,
    ignored: ["exported_at"],
    mismatches: [],
  });
});

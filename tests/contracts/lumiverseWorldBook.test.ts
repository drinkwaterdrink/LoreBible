import { expect, test } from "bun:test";
import fixture from "../fixtures/lumiverse-world-book-v1.min.json";
import { parseNativeLumiverseWorldBookV1 } from "../../src/contracts/lumiverseWorldBook";

test("accepts the observed Lumiverse v1 envelope and rejects wrong entry types", () => {
  expect(parseNativeLumiverseWorldBookV1(fixture).type).toBe("lumiverse_world_book");
  expect(() =>
    parseNativeLumiverseWorldBookV1({
      ...fixture,
      entries: [{ ...fixture.entries[0], priority: "150" }],
    }),
  ).toThrow("entries[0].priority");
});

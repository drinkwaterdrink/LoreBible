import { expect, test } from "bun:test";
import { parseNativeLumiverseWorldBookV1 } from "../../src/contracts/lumiverseWorldBook";
import { compileLoreManifest } from "../../src/lib/artifacts/loreManifest";
import { serializeNativeLumiverseWorldBook, serializePortableCharacterBook } from "../../src/lib/artifacts/loreSerializers";
import { generateLumiverseWorldBookExport } from "../../src/lib/exportGenerators";
import type { LoreBibleDocument } from "../../src/types";

const documentFixture = {
  id: "serializer-fixture",
  core: { title: "Serializer World" },
  status: { content: "CURRENT_SENTINEL" },
  worldPhysics: { rules: [{ id: "rule-1", fields: { name: "Rule", rule: "Names bind doors." }, keys: ["names"], permanence: "C", locked: false }] },
  locations: [], factions: [], npcs: [], relationshipWeb: [], knowledgeMap: [], items: [], secrets: [], history: [], pressures: [],
} as unknown as LoreBibleDocument;

test("serializes observed native types and reports portable losses", () => {
  const manifest = compileLoreManifest(documentFixture);
  const native = serializeNativeLumiverseWorldBook(manifest, () => 1788914397);

  expect(parseNativeLumiverseWorldBookV1(native).exported_at).toBe(1788914397);
  expect(typeof native.entries[0].priority).toBe("number");
  expect(native.entries[0].prevent_recursion).toBe(true);

  const portable = serializePortableCharacterBook(manifest);
  expect(portable.entries[0].content).toBe(native.entries[0].content);
  expect(portable.omissions.some((item) => item.feature === "priority")).toBe(true);
  expect(portable.entries[0]).not.toHaveProperty("priority");
});

test("exposes a parseable native world book through the public exporter", () => {
  const exported = JSON.parse(generateLumiverseWorldBookExport(documentFixture));
  expect(parseNativeLumiverseWorldBookV1(exported).entries[0].content).toContain("Names bind doors.");
});

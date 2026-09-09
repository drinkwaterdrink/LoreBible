import { expect, test } from "bun:test";
import { compileLoreManifest } from "../../src/lib/artifacts/loreManifest";
import type { LoreBibleDocument } from "../../src/types";

const documentFixture = {
  id: "project-fixture",
  core: { title: "Fixture World", pitch: "A focused premise." },
  status: { content: "CURRENT_SENTINEL", settings: "mutable" },
  worldPhysics: {
    rules: [{ id: "rule-1", fields: { name: "Known Rule", rule: "Doors remember names." }, keys: ["doors"], permanence: "C", locked: false }],
  },
  locations: [{ id: "location-1", fields: { name: "North Hall", function: "Meeting place" }, keys: [" North Hall ", "North Hall"], permanence: "C", locked: false }],
  factions: [],
  npcs: [],
  relationshipWeb: [],
  knowledgeMap: [],
  items: [],
  secrets: [{ id: "secret-1", fields: { truth: "SECRET_SENTINEL" }, keys: ["hidden mark"], permanence: "C", locked: false, disabledUntilEarned: true }],
  history: [],
  pressures: [],
  omittedSections: [],
} as unknown as LoreBibleDocument;

test("compiles stable focused lore without temporary state", () => {
  const first = compileLoreManifest(documentFixture);
  const second = compileLoreManifest(structuredClone(documentFixture));

  expect(first.entries.map((entry) => entry.nativeUid)).toEqual(second.entries.map((entry) => entry.nativeUid));
  expect(first.entries.some((entry) => entry.content.includes("CURRENT_SENTINEL"))).toBe(false);
  expect(first.entries.find((entry) => entry.sourceId === "secret-1")?.activation.state).toBe("disabled");
  expect(first.entries.find((entry) => entry.sourceId === "location-1")?.activation.primaryKeys).toEqual(["North Hall"]);
});

test("reports entries that have content but no viable activation key", () => {
  const input = structuredClone(documentFixture);
  input.locations[0].keys = [];

  const manifest = compileLoreManifest(input);
  expect(manifest.findings.some((finding) => finding.code === "lore.missing_keys" && finding.sourceId === "location-1")).toBe(true);
});

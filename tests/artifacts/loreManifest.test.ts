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
  expect(first.entries.find((entry) => entry.sourceId === "location-1")).toMatchObject({ categoryId: "location", categoryLabel: "LOCATION", semanticName: "North Hall", title: "[LOCATION] North Hall" });
  expect(first.entries.find((entry) => entry.sourceId === "rule-1")?.title).toBe("[WORLD RULE] Known Rule");
});

test("reports entries that have content but no viable activation key", () => {
  const input = structuredClone(documentFixture);
  input.locations[0].keys = [];

  const manifest = compileLoreManifest(input);
  expect(manifest.findings.some((finding) => finding.code === "lore.missing_keys" && finding.sourceId === "location-1")).toBe(true);
});

test("preserves supplemental Blueprint categories and explicit semantic titles", () => {
  const input = structuredClone(documentFixture);
  input.additionalLore = [{ id: "economy-1", fields: { categoryId: "economy", categoryLabel: "ECONOMY", name: "The Veil-Tithe Exchange", content: "Licensed veil-tithes fund the ward grid." }, keys: ["veil-tithe"], permanence: "C", locked: false }];
  input.history = [{ id: "history-1", fields: { name: "The Concordat of Prague", event: "The 1877 Concordat of Prague established scholastic extraterritoriality.", era: "1877", consequence: "National ministries lost jurisdiction." }, keys: ["Concordat of Prague"], permanence: "C", locked: false }];
  const manifest = compileLoreManifest(input);
  expect(manifest.entries.find(entry => entry.sourceId === "economy-1")).toMatchObject({ categoryId: "economy", categoryLabel: "ECONOMY", title: "[ECONOMY] The Veil-Tithe Exchange" });
  expect(manifest.entries.find(entry => entry.sourceId === "history-1")?.title).toBe("[HISTORY] The Concordat of Prague");
});

test("legacy entries derive descriptive titles from authored keys instead of numbered placeholders",()=>{
  const input=structuredClone(documentFixture);input.history=[{id:"h",fields:{event:"The 1877 Concordat of Prague established scholastic extraterritoriality.",era:"1877",consequence:"Ministries lost jurisdiction."},keys:["Concordat","Prague","Rectorate"],permanence:"C",locked:false}];
  expect(compileLoreManifest(input).entries.find(entry=>entry.sourceId==="h")?.title).toBe("[HISTORY] Concordat · Prague");
});

test("generic legacy keys fall back to a concise phrase from authored content",()=>{
  const input=structuredClone(documentFixture);input.history=[{id:"h",fields:{event:"The Ash Concordat established the northern border after the flood.",era:"After the flood",consequence:"Travel requires seals."},keys:["History 1"],permanence:"C",locked:false}];
  expect(compileLoreManifest(input).entries.find(entry=>entry.sourceId==="h")?.title).toBe("[HISTORY] Ash Concordat");
});

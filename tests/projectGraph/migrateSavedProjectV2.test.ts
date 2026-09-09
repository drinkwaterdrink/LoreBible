import { expect, test } from "bun:test";
import { createSavedProjectV2 } from "../../src/lib/projectPersistence";
import { createDraftScenarioDocument, DEFAULT_CANON, DEFAULT_PHYSICS } from "../../src/lib/scenarioDraft";
import { canonicalizeJson, sha256Hex } from "../../src/lib/projectGraph/canonicalJson";
import { migrateSavedProjectV2ToGraph } from "../../src/lib/projectGraph/migrateSavedProjectV2";
import { parseProjectGraph } from "../../src/lib/projectGraph/validation";

function fixture() {
  const document = createDraftScenarioDocument({ sparkText: "A quiet harbor community.", parse: null, canon: structuredClone(DEFAULT_CANON), physics: structuredClone(DEFAULT_PHYSICS), title: "Harbor" });
  document.id = "project-harbor";
  document.createdAt = "2026-01-01T00:00:00.000Z";
  document.updatedAt = "2026-01-02T00:00:00.000Z";
  document.locations = [{ id: "dock", fields: { name: "Old Dock", purpose: "Fishing boats arrive here." }, keys: ["Old Dock"], permanence: "C", locked: true }];
  document.npcs = [
    { id: "mara", fields: { name: "Mara Vale", role: "Harbormaster" }, keys: ["Mara"], permanence: "C", locked: true },
    { id: "ivo", fields: { name: "Ivo Reed", role: "Fisher" }, keys: ["Ivo"], permanence: "C", locked: false },
  ];
  document.relationshipWeb = [{ id: "mara-ivo", fields: { source: "Mara Vale", target: "Ivo Reed", publicDynamic: "Professional respect" }, keys: [], permanence: "C", locked: true }];
  document.knowledgeMap = [{ id: "mara-belief", fields: { entity: "Mara Vale", fact: "The bell predicts storms", state: "believes" }, keys: [], permanence: "C", locked: false }];
  document.status.content = "The tide is currently high.";
  document.opening.firstLocation = "Old Dock";
  const project = createSavedProjectV2({
    document,
    workflow: { stage: "5", sparkParse: document.parse, canon: document.canon, physics: document.physics, takes: [], selectedTakeId: null },
    generation: { settings: { quality: "Deep Craft", divergenceMode: "Exploratory", authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible" }, modelSelection: { profileId: "profile-1", modelId: "model-1" } }, modelSelection: { profileId: "profile-1", modelId: "model-1" }, provenance: [] },
    savedAt: "2026-01-02T00:00:00.000Z",
  }) as any;
  project.futureField = { preserved: true };
  return project;
}

test("migrates deterministically without mutating or losing the V2 source", () => {
  const source = fixture();
  const before = structuredClone(source);
  const first = migrateSavedProjectV2ToGraph(source, { migratedAt: "2026-02-01T00:00:00.000Z" });
  const second = migrateSavedProjectV2ToGraph(structuredClone(source), { migratedAt: "2026-02-01T00:00:00.000Z" });
  expect(first).toEqual(second);
  expect(source).toEqual(before);
  expect(first.receipt.sourceCanonicalJson).toBe(canonicalizeJson(source));
  expect(first.receipt.sourceSha256).toBe(sha256Hex(canonicalizeJson(source)));
  expect(JSON.parse(first.receipt.sourceCanonicalJson).futureField).toEqual({ preserved: true });
  expect(parseProjectGraph(first.graph).ok).toBe(true);
});

test("extracts stable entities, one-way relationships, and belief claims conservatively", () => {
  const result = migrateSavedProjectV2ToGraph(fixture(), { migratedAt: "2026-02-01T00:00:00.000Z" });
  const mara = result.graph.entities.find((entity) => entity.name === "Mara Vale")!;
  const ivo = result.graph.entities.find((entity) => entity.name === "Ivo Reed")!;
  expect(result.graph.relationships).toContainEqual(expect.objectContaining({ sourceEntityId: mara.id, targetEntityId: ivo.id, publicDynamic: "Professional respect" }));
  expect(result.graph.relationships.some((edge) => edge.sourceEntityId === ivo.id && edge.targetEntityId === mara.id)).toBe(false);
  expect(result.graph.knowledge).toContainEqual(expect.objectContaining({ entityId: mara.id, state: "believes" }));
  const belief = result.graph.knowledge[0];
  expect(result.graph.canon.some((fact) => fact.id === belief.factId && fact.status === "provisional")).toBe(true);
});

test("keeps current and opening state out of evergreen facts", () => {
  const result = migrateSavedProjectV2ToGraph(fixture(), { migratedAt: "2026-02-01T00:00:00.000Z" });
  const current = result.graph.canon.find((fact) => fact.value === "The tide is currently high.");
  const opening = result.graph.canon.find((fact) => fact.value === "Old Dock" && fact.predicate === "opening.firstLocation");
  expect(current?.temporalClass).toBe("current");
  expect(opening?.temporalClass).toBe("initial");
  expect(result.graph.ownership.find((item) => item.factId === current?.id)?.owner).toBe("mutable_state");
});

test("refuses to place credential-shaped unknown data in a portable migration receipt", () => {
  const source = fixture();
  source.futureField.apiKey = "secret-value";
  expect(() => migrateSavedProjectV2ToGraph(source, { migratedAt: "2026-02-01T00:00:00.000Z" })).toThrow("credential-shaped");
});

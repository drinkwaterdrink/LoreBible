import { expect, test } from "bun:test";
import fixture from "../fixtures/forge/bundle5-contract.json";
import { prepareForgeCandidate } from "../../server/generation/forgeCandidate";
import { FORGE_BUNDLE_DEFINITIONS } from "../../server/generation/forgeSchemas";
import type { ForgeCoveragePlan } from "../../server/generation/forgeCoveragePlan";

const definition = FORGE_BUNDLE_DEFINITIONS[4];
const previous = { core: { title: "Prior work" }, npcs: [{ id: "prior-npc" }] };
const prepare = (value: unknown) => prepareForgeCandidate({ value, definition, previousDocument: previous, coveragePlan: null });

test("valid Bundle 5 candidate preserves content and earlier sections", () => {
  const result = prepare(fixture);
  expect(result.sections.history).toEqual(fixture.history);
  expect(result.document.npcs).toEqual(previous.npcs);
  expect(previous).toEqual({ core: { title: "Prior work" }, npcs: [{ id: "prior-npc" }] });
});

test("single object array wrapper is normalized only when its object validates", () => {
  expect(prepare([fixture]).normalizations).toEqual(["singleton_object_array"]);
  expect(() => prepare([{}, fixture])).toThrow();
});

test("Bundle 5 rejects nested shape errors before changing prior work", () => {
  const invalid = structuredClone(fixture) as Record<string, any>;
  invalid.aesthetic = [];
  expect(() => prepare(invalid)).toThrow();
  expect(previous.npcs[0].id).toBe("prior-npc");
});

test("Bundle 5 rejects an unowned NPC section and duplicate entry IDs", () => {
  expect(() => prepare({ ...fixture, npcs: [] })).toThrow();
  const duplicate = structuredClone(fixture);
  duplicate.pressures[0].id = duplicate.history[0].id;
  expect(() => prepare(duplicate)).toThrow();
});

test("additional lore must use its exact assigned category ID and label", () => {
  const plan: ForgeCoveragePlan = {
    total: { min: 1, ideal: 3, max: 10 },
    categories: [{ id: "custom_reading_routines", label: "Reading Routines", destination: "additionalLore", range: { min: 1, ideal: 1, max: 2 }, detail: "standard", required: true, forbidden: false }],
  };
  const valid = prepareForgeCandidate({ value: fixture, definition, previousDocument: previous, coveragePlan: plan });
  expect(valid.sections.additionalLore).toHaveLength(1);
  const invented = structuredClone(fixture);
  invented.additionalLore[0].fields.categoryId = "crossCategory";
  expect(() => prepareForgeCandidate({ value: invented, definition, previousDocument: previous, coveragePlan: plan })).toThrow();
  const wrongLabel = structuredClone(fixture);
  wrongLabel.additionalLore[0].fields.categoryLabel = "Generic Lore";
  expect(() => prepareForgeCandidate({ value: wrongLabel, definition, previousDocument: previous, coveragePlan: plan })).toThrow();
});

test("coverage failures provide safe category counts for the one correction", () => {
  const plan: ForgeCoveragePlan = {
    total: { min: 1, ideal: 3, max: 10 },
    categories: [{ id: "custom_reading_routines", label: "Reading Routines", destination: "additionalLore", range: { min: 2, ideal: 2, max: 3 }, detail: "standard", required: true, forbidden: false }],
  };
  try {
    prepareForgeCandidate({ value: fixture, definition, previousDocument: previous, coveragePlan: plan });
    throw new Error("expected coverage failure");
  } catch (error) {
    expect(error).toMatchObject({
      issues: [{ path: "/coverage/categories/0", expected: "2-3 entries", actual: "1 entry" }],
    });
  }
});

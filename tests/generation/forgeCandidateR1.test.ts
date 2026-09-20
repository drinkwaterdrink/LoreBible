import { expect, test } from "bun:test";
import fixture from "../fixtures/forge/bundle5-contract.json";
import { prepareForgeCandidate } from "../../server/generation/forgeCandidate";
import { FORGE_BUNDLE_DEFINITIONS } from "../../server/generation/forgeSchemas";

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

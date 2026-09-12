import { expect, test } from "bun:test";
import { FORGE_REQUIRED_FIELDS, sanitizeForgeSectionEntries } from "../../server/generation/forgeValidation";

test("Forge relationship schema and validation share the same required fields", () => {
  expect(FORGE_REQUIRED_FIELDS.relationshipWeb).toEqual(["source", "target", "bond", "pressure", "relation"]);
});

test("Forge relationship entries keep the required relation field and receive stable defaults", () => {
  const result = sanitizeForgeSectionEntries("relationshipWeb", [{
    fields: {
      source: "Mara",
      target: "Ivo",
      bond: "Professional respect",
      pressure: "A deadline tests their trust",
      relation: "Mara relies on Ivo's discretion",
    },
    keys: ["Mara", "Ivo"],
  }]);

  expect(result).toEqual([expect.objectContaining({ id: "relationshipWeb-1", locked: false })]);
});

test("Forge validation names the missing relationship field instead of hiding it behind a generic error", () => {
  expect(() => sanitizeForgeSectionEntries("relationshipWeb", [{
    fields: {
      source: "Mara",
      target: "Ivo",
      bond: "Professional respect",
      pressure: "A deadline tests their trust",
    },
    keys: ["Mara", "Ivo"],
  }])).toThrow("relationshipWeb entry 1 is missing required content: relation");
});

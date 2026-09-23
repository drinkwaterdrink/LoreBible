import { expect, test } from "bun:test";
import { PROMPT_REGISTRY, getPromptRegistryEntry } from "../../src/lib/prompts/registry";

test("registry exposes stable Forge creative defaults separately from protected requirements", () => {
  const entry = getPromptRegistryEntry("forge.core");
  expect(entry).toMatchObject({ id: "forge.core", defaultVersion: 1, label: "Core premise", allowedVariables: ["{{user}}", "{{char}}"] });
  expect(entry.defaultText.length).toBeGreaterThan(100);
  expect(entry.protectedRequirements.join(" ")).toContain("schema");
  expect(entry.defaultText).not.toContain("OUTPUT_SCHEMA");
});

test("registry IDs are unique and every editable default has a protected disclosure", () => {
  expect(new Set(PROMPT_REGISTRY.map((entry) => entry.id)).size).toBe(PROMPT_REGISTRY.length);
  expect(PROMPT_REGISTRY.every((entry) => entry.defaultText.trim() && entry.protectedRequirements.length > 0)).toBe(true);
});

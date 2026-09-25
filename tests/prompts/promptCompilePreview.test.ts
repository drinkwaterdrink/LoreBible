import { expect, test } from "bun:test";
import { blueprintSelectionFixture } from "../fixtures/blueprintSelection";
import { compilePromptPreview } from "../../server/prompts/promptCompilePreview";

const feasibleSelection = () => ({ ...structuredClone(blueprintSelectionFixture), lorebookRange: { min: 12, ideal: 20, max: 28 } });

test("compiled prompt preview uses real specialist schema and project override precedence", () => {
  const preview = compilePromptPreview({
    featureId: "forge.core",
    profile: { schemaVersion: 1, id: "profile/a", name: "A", revision: 2, overrides: [{ featureId: "forge.core", baseVersion: 1, text: "Application voice", revision: 1 }] },
    projectOverrides: [{ featureId: "forge.core", baseVersion: 1, text: "Project-specific voice", revision: 1 }],
    selection: feasibleSelection(),
    sourceContext: "PRIVATE PROJECT CONTEXT",
  });
  expect(preview.featureId).toBe("forge.core");
  expect(preview.systemInstruction).toContain("OUTPUT CONTRACT");
  expect(preview.userPrompt).toContain("Project-specific voice");
  expect(preview.userPrompt).toContain("PRIVATE PROJECT CONTEXT");
  expect(preview.userPrompt).toContain("OUTPUT_SCHEMA");
  expect(preview.userPrompt).not.toContain("Application voice");
  expect(preview.promptHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  expect(preview.disclosure).toEqual({ includesPrivateProjectContext: true, generationPerformed: false, manuscriptMutated: false });
});

test("compiled prompt preview refuses an unknown or unscheduled feature", () => {
  expect(() => compilePromptPreview({ featureId: "forge.fake", profile: null, projectOverrides: [], selection: feasibleSelection(), sourceContext: "Context" })).toThrow("Unknown prompt feature");
  const selection = feasibleSelection();
  expect(() => compilePromptPreview({ featureId: "forge.locations", profile: null, projectOverrides: [], selection, sourceContext: "Context" })).toThrow("does not schedule");
});

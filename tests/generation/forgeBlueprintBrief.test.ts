import { expect, test } from "bun:test";
import type { BlueprintSelectionV1 } from "../../src/contracts/blueprintSelection";
import { createForgeBlueprintBrief, formatForgeBlueprintBrief } from "../../server/generation/forgeBlueprintBrief";
import { createForgeInputFingerprint, type ForgeCreativeSource } from "../../server/generation/forgeProjectCoordinator";
import { blueprintSelectionFixture as selection } from "../fixtures/blueprintSelection";

const source = (blueprintSelection: BlueprintSelectionV1): ForgeCreativeSource => ({
  sparkText: "A household summer",
  parse: { nonNegotiables: ["household"] },
  canon: { enabled: false },
  physics: { density: "Standard" },
  chosenTake: { id: "take-1", title: "The Visit" },
  blueprintSelection,
});

test("projects a 40k authored library independently from an 8k runtime budget", () => {
  const brief = createForgeBlueprintBrief(selection);

  expect(brief).toMatchObject({
    libraryTargetTokens: 40_000,
    libraryMaxTokens: 40_000,
    runtimeBudget: { mode: "custom", tokens: 8_000 },
    lorebookEntries: { min: 80, ideal: 120, max: 160 },
    ordinaryLifeDetail: 4,
  });
  expect(brief?.categories).toEqual([
    { id: "people", label: "People", status: "required", detail: "rich", targetRange: { min: 12, ideal: 20, max: 28 }, userLocked: true },
    { id: "factions", label: "Factions", status: "omitted", detail: "light", targetRange: { min: 0, ideal: 0, max: 0 }, userLocked: true },
  ]);
});

test("formats an explicit no-padding Blueprint brief for Forge", () => {
  const formatted = formatForgeBlueprintBrief(createForgeBlueprintBrief(selection)!);

  expect(formatted).toContain("Authored lore target: approximately 40,000 tokens; never pad to hit this allowance.");
  expect(formatted).toContain("Runtime activation recommendation: 8,000 tokens; this is separate from total library size.");
  expect(formatted).toContain("People: required, rich, target 12/20/28 entries (locked)");
  expect(formatted).toContain("Factions: omitted");
});

test("different accepted library targets produce different durable Forge fingerprints", () => {
  const compact = { ...selection, loreLibraryBudget: { mode: "custom", targetTokens: 4_000, maxTokens: 5_000 } } satisfies BlueprintSelectionV1;

  expect(createForgeInputFingerprint(source(compact))).not.toBe(createForgeInputFingerprint(source(selection)));
});

test("legacy Forge requests can omit a Blueprint", () => {
  expect(createForgeBlueprintBrief(undefined)).toBeNull();
});

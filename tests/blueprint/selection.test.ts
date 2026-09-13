import { expect, test } from "bun:test";
import { createBlueprintPlan } from "../../src/lib/blueprint/planner";
import { addBlueprintCategory, createBlueprintSelection, removeBlueprintCategory, reconcileBlueprintSelection, setLoreLibraryTarget, setLorebookScale, updateBlueprintCategory, updateBlueprintField, updateBlueprintMechanic } from "../../src/lib/blueprint/selection";
import { familyVisit, warTornKingdom } from "../fixtures/blueprintPremises";

const options = { createdAt: "2026-09-12T12:00:00.000Z" };

test("creates a selection without mutating the recommendation", () => {
  const plan = createBlueprintPlan(familyVisit(), options); const before = structuredClone(plan);
  const selection = createBlueprintSelection(plan);
  expect(plan).toEqual(before);
  expect(selection.sourceRecommendationFingerprint).toBe(plan.source.inputSha256);
  expect(selection.categories.some(category => category.id === "relationships")).toBe(true);
});

test("refresh preserves locked choices, explicit omissions, and custom categories", () => {
  const current = createBlueprintSelection(createBlueprintPlan(familyVisit(), options));
  current.categories.find(category => category.id === "relationships")!.status = "omitted";
  current.categories.find(category => category.id === "relationships")!.userLocked = true;
  current.categories.push({ id: "custom:shops", label: "Shops", purpose: "Commerce", justification: "User added", status: "required", detail: "rich", targetRange: { min: 2, ideal: 4, max: 6 }, likelyRuntimeRole: "ambient", candidateArchitectures: [], userLocked: true, userExplanation: "Important", custom: true });
  const next = reconcileBlueprintSelection(current, createBlueprintPlan(warTornKingdom(), options));
  expect(next.categories.find(category => category.id === "relationships")?.status).toBe("omitted");
  expect(next.categories.find(category => category.id === "custom:shops")?.label).toBe("Shops");
  expect(current.categories).not.toBe(next.categories);
});

test("scale presets and custom ranges are independent of generation quality", () => {
  const selection = createBlueprintSelection(createBlueprintPlan(familyVisit(), options));
  const massive = setLorebookScale(selection, "massive");
  expect(massive.lorebookRange).toEqual({ min: 120, ideal: 185, max: 250 });
  const custom = setLorebookScale(massive, "custom", { min: 5, ideal: 11, max: 18 });
  expect(custom.lorebookRange).toEqual({ min: 5, ideal: 11, max: 18 });
  expect(custom.generationQuality).toBe(selection.generationQuality);
});

test("custom authored-lore targets update estimated entries without touching runtime budget", () => {
  const selection = createBlueprintSelection(createBlueprintPlan(familyVisit(), options));
  const changed = setLoreLibraryTarget(selection, 5_000, "2026-09-12T13:00:00.000Z");

  expect(changed.loreLibraryBudget).toEqual({ mode: "custom", targetTokens: 5_000, maxTokens: 5_000 });
  expect(changed.lorebookScale).toBe("custom");
  expect(changed.lorebookRange).toEqual({ min: 6, ideal: 12, max: 17 });
  expect(changed.runtimeTokenBudget).toEqual(selection.runtimeTokenBudget);
  expect(changed.updatedAt).toBe("2026-09-12T13:00:00.000Z");
});

test("custom authored-lore targets preserve a user-locked expert entry range", () => {
  const selection = createBlueprintSelection(createBlueprintPlan(familyVisit(), options));
  selection.lorebookRange = { min: 7, ideal: 9, max: 11 };
  selection.lockedFields.push("lorebookRange");

  expect(setLoreLibraryTarget(selection, 40_000).lorebookRange).toEqual({ min: 7, ideal: 9, max: 11 });
});

test("field and category mutations are immutable, timestamped, and locked", () => {
  const selection = createBlueprintSelection(createBlueprintPlan(familyVisit(), options));
  const originalMode = selection.worldMode;
  const replacementMode = originalMode === "arc" ? "sandbox" : "arc";
  const changed = updateBlueprintField(selection, "worldMode", replacementMode, "2026-09-12T13:00:00.000Z");
  expect(changed).toMatchObject({ worldMode: replacementMode, updatedAt: "2026-09-12T13:00:00.000Z", lockedFields: ["worldMode"] });
  expect(selection.worldMode).toBe(originalMode);
  const category = selection.categories.find(item => item.status !== "required")!;
  const edited = updateBlueprintCategory(selection, category.id, { status: "omitted", detail: "light" }, "2026-09-12T13:01:00.000Z");
  expect(edited.categories.find(item => item.id === category.id)).toMatchObject({ status: "omitted", detail: "light", userLocked: true });
  expect(selection.categories.find(item => item.id === category.id)?.userLocked).toBe(false);
});

test("required categories and ineligible mechanics reject invalid transitions", () => {
  const selection = createBlueprintSelection(createBlueprintPlan(warTornKingdom(), options));
  const required = selection.categories.find(item => item.status === "required");
  if (required) expect(() => updateBlueprintCategory(selection, required.id, { status: "omitted" })).toThrow("required");
  const ineligible = selection.mechanicPacks.find(item => !item.eligible)!;
  expect(() => updateBlueprintMechanic(selection, ineligible.id, true)).toThrow("ineligible");
});

test("custom categories receive safe unique IDs and only custom categories can be removed", () => {
  const selection = createBlueprintSelection(createBlueprintPlan(familyVisit(), options));
  const first = addBlueprintCategory(selection, "Daily Shops", "Commerce and errands", "2026-09-12T13:00:00.000Z");
  const second = addBlueprintCategory(first, "Daily Shops", "A second distinct layer", "2026-09-12T13:01:00.000Z");
  expect(second.categories.slice(-2).map(item => item.id)).toEqual(["custom:daily-shops", "custom:daily-shops-2"]);
  expect(second.categories.at(-1)).toMatchObject({ custom: true, userLocked: true, status: "optional", detail: "standard", targetRange: { min: 1, ideal: 3, max: 6 } });
  expect(removeBlueprintCategory(second, "custom:daily-shops").categories.some(item => item.id === "custom:daily-shops")).toBe(false);
  expect(() => removeBlueprintCategory(selection, selection.categories[0].id)).toThrow("Only custom");
});

test("mechanic overrides are immutable and preserve provider-independent metadata", () => {
  const selection = createBlueprintSelection(createBlueprintPlan(familyVisit(), options));
  const mechanic = selection.mechanicPacks.find(item => item.eligible)!;
  const changed = updateBlueprintMechanic(selection, mechanic.id, !mechanic.enabled, "2026-09-12T13:00:00.000Z");
  expect(changed.mechanicPacks.find(item => item.id === mechanic.id)).toMatchObject({ enabled: !mechanic.enabled, userLocked: true });
  expect(selection.mechanicPacks.find(item => item.id === mechanic.id)?.userLocked).toBe(false);
});

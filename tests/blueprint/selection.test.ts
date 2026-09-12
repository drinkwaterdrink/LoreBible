import { expect, test } from "bun:test";
import { createBlueprintPlan } from "../../src/lib/blueprint/planner";
import { createBlueprintSelection, reconcileBlueprintSelection, setLorebookScale } from "../../src/lib/blueprint/selection";
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

import { expect, test } from "bun:test";
import type { BlueprintCategorySelection, BlueprintSelectionV1 } from "../../src/contracts/blueprintSelection";
import { blueprintSelectionFixture as validSelection } from "../fixtures/blueprintSelection";
import { allocateForgeInventory, partitionForgeInventory } from "../../server/generation/forgeJobPlan";

const category = (id: string, min: number, ideal: number, max: number, changes: Partial<BlueprintCategorySelection> = {}): BlueprintCategorySelection => ({
  ...validSelection.categories[0], id, label: id, status: "recommended", detail: "standard",
  targetRange: { min, ideal, max }, ...changes,
});
const selection = (categories: BlueprintCategorySelection[], min: number, ideal: number, max: number): BlueprintSelectionV1 => ({
  ...validSelection, categories, lorebookRange: { min, ideal, max },
});

test("allocates exact IDs, labels and cast tier ranges without a synthetic lore bucket", () => {
  const chosen = selection([
    category("principal_cast", 0, 0, 0, { label: "Lead People" }),
    category("roster_cast", 0, 0, 0, { label: "Supporting People" }),
    category("custom:night-shifts", 1, 2, 3, { label: "Night Shifts", custom: true }),
    category("history", 1, 2, 3),
  ], 7, 8, 12);
  chosen.principalCastRange = { min: 2, ideal: 3, max: 4 };
  chosen.rosterCastRange = { min: 1, ideal: 1, max: 2 };
  const result = allocateForgeInventory(chosen, {});
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.categories.map(item => [item.categoryId, item.categoryLabel, item.destination, item.castTier])).toEqual([
    ["principal_cast", "Lead People", "npcs", "principal"],
    ["roster_cast", "Supporting People", "npcs", "roster"],
    ["custom:night-shifts", "Night Shifts", "additionalLore", undefined],
    ["history", "history", "history", undefined],
  ]);
  expect(result.value.categories.map(item => item.target)).toEqual([3, 1, 2, 2]);
  expect(result.value.totalTarget).toBe(8);
});

test("rejects both kinds of impossible total range without changing accepted choices", () => {
  const highMinimum = selection([category("a", 3, 3, 4), category("b", 3, 3, 4)], 0, 2, 5);
  const lowMaximum = selection([category("a", 0, 1, 2)], 3, 4, 5);
  expect(allocateForgeInventory(highMinimum, {})).toMatchObject({ ok: false, issues: [{ code: "category_minima_exceed_total_max" }] });
  expect(allocateForgeInventory(lowMaximum, {})).toMatchObject({ ok: false, issues: [{ code: "category_maxima_below_total_min" }] });
  expect(highMinimum.categories[0].targetRange).toEqual({ min: 3, ideal: 3, max: 4 });
});

test("omitted and zero-maximum categories stay at zero, while singleton guides are excluded", () => {
  const result = allocateForgeInventory(selection([
    category("factions", 0, 3, 4, { status: "omitted" }),
    category("secrets", 0, 0, 0),
    category("aesthetic", 0, 0, 0),
    category("naming", 0, 0, 0),
    category("pressures", 1, 2, 3),
  ], 1, 2, 3), {});
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.categories.map(item => [item.categoryId, item.target, item.destination])).toEqual([
    ["factions", 0, "factions"], ["secrets", 0, "secrets"], ["pressures", 2, "pressures"],
  ]);
});

test("an omitted category is never eligible when the total minimum exceeds active ideals", () => {
  const result = allocateForgeInventory(selection([
    category("factions", 0, 3, 3, { status: "omitted" }),
    category("history", 0, 1, 3),
  ], 2, 2, 3), {});
  expect(result.ok).toBe(true);
  if (result.ok === false) return;
  expect(result.value.categories.map(item => [item.categoryId, item.target])).toEqual([["factions", 0], ["history", 2]]);
});

test("deterministically distributes scarce slots by weighted marginal value and category ID", () => {
  const chosen = selection([
    category("z", 0, 3, 3, { status: "required", detail: "rich" }),
    category("a", 0, 3, 3, { status: "required", detail: "rich" }),
    category("optional", 0, 3, 3, { status: "optional", detail: "light" }),
  ], 0, 4, 4);
  const first = allocateForgeInventory(chosen, {});
  const second = allocateForgeInventory(chosen, {});
  expect(first).toEqual(second);
  expect(first.ok).toBe(true);
  if (!first.ok) return;
  expect(first.value.categories.map(item => [item.categoryId, item.target])).toEqual([["z", 2], ["a", 2], ["optional", 0]]);
});

test("counts accepted completed entries, leaves only pending work, and reports incompatible checkpoints", () => {
  const chosen = selection([
    category("principal_cast", 0, 0, 0),
    category("custom:night-shifts", 1, 3, 3, { label: "Night Shifts" }),
  ], 4, 5, 6);
  chosen.principalCastRange = { min: 1, ideal: 2, max: 3 };
  const completed = {
    npcs: [{ fields: { castTier: "principal" } }],
    additionalLore: [{ fields: { categoryId: "custom:night-shifts", categoryLabel: "Old Display Label" } }],
  };
  const result = allocateForgeInventory(chosen, completed);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.categories.map(item => [item.completed, item.pending])).toEqual([[1, 1], [1, 2]]);
  expect(result.value.totalPending).toBe(3);
  const excess = allocateForgeInventory(chosen, { ...completed, npcs: Array.from({ length: 4 }, () => ({ fields: { castTier: "principal" } })) });
  expect(excess).toMatchObject({ ok: false, issues: [{ code: "completed_exceeds_category_max" }] });
  const omitted = selection([category("factions", 0, 0, 0, { status: "omitted" })], 0, 0, 0);
  const omittedResult = allocateForgeInventory(omitted, { factions: [{}] });
  expect(omittedResult.ok).toBe(false);
  if (omittedResult.ok === false) expect(omittedResult.issues.some(item => item.code === "completed_in_omitted_category")).toBe(true);
});

test("does not silently ignore completed lore from an unplanned category", () => {
  const chosen = selection([category("locations", 1, 1, 2)], 1, 2, 3);
  const result = allocateForgeInventory(chosen, { history: [{ id: "accepted-history" }] });
  expect(result.ok).toBe(false);
  if (result.ok === false) expect(result.issues).toContainEqual(expect.objectContaining({ code: "completed_unplanned_category", categoryId: "history" }));
});

test("library token allowance and runtime budget remain independent estimates", () => {
  const chosen = selection([category("history", 1, 2, 3)], 1, 2, 3);
  const a = allocateForgeInventory(chosen, {});
  const b = allocateForgeInventory({ ...chosen, runtimeTokenBudget: { mode: "unlimited" }, loreLibraryBudget: { mode: "custom", targetTokens: 40000, maxTokens: 40000 } }, {});
  expect(a.ok && b.ok).toBe(true);
  if (!a.ok || !b.ok) return;
  expect(a.value.categories).toEqual(b.value.categories);
  expect(a.value.estimatedLibraryTokens).toBe(b.value.estimatedLibraryTokens);
});

test("partitions all pending slots into bounded jobs with stable IDs and exact ownership", () => {
  const chosen = selection([
    category("locations", 0, 8, 8, { detail: "standard" }),
    category("principal_cast", 0, 0, 0, { detail: "rich" }),
    category("custom:night-shifts", 0, 2, 2, { label: "Night Shifts" }),
  ], 17, 17, 17);
  chosen.principalCastRange = { min: 7, ideal: 7, max: 7 };
  const allocation = allocateForgeInventory(chosen, {});
  expect(allocation.ok).toBe(true);
  if (allocation.ok === false) return;
  const first = partitionForgeInventory(chosen, allocation.value);
  const second = partitionForgeInventory(structuredClone(chosen), structuredClone(allocation.value));
  expect(first).toEqual(second);
  expect(first.jobs.filter(job => job.categoryId === "locations").map(job => job.entryIds.length)).toEqual([6, 2]);
  expect(first.jobs.filter(job => job.categoryId === "principal_cast").map(job => job.entryIds.length)).toEqual([3, 3, 1]);
  expect(first.jobs.filter(job => job.categoryId === "custom:night-shifts").map(job => job.entryIds.length)).toEqual([2]);
  expect(first.jobs.flatMap(job => job.entryIds).length).toBe(17);
  expect(new Set(first.jobs.flatMap(job => job.entryIds)).size).toBe(17);
  expect(first.jobs.every(job => job.destinations.length === 1 && job.estimatedOutputTokens <= 2400)).toBe(true);
  expect(first.jobs.find(job => job.categoryId === "custom:night-shifts")?.destinations).toEqual(["additionalLore"]);
});

test("completed slots are not regenerated and unchanged remaining job IDs survive reload", () => {
  const chosen = selection([category("locations", 0, 8, 8)], 8, 8, 8);
  const before = allocateForgeInventory(chosen, {});
  const after = allocateForgeInventory(chosen, { locations: Array.from({ length: 6 }, (_, index) => ({ id: `saved-${index}` })) });
  expect(before.ok && after.ok).toBe(true);
  if (before.ok === false || after.ok === false) return;
  const original = partitionForgeInventory(chosen, before.value);
  const resumed = partitionForgeInventory(chosen, after.value);
  expect(resumed.planHash).toBe(original.planHash);
  expect(resumed.jobs).toEqual(original.jobs.slice(1));
});

test("relationship and knowledge jobs depend on planned cast jobs", () => {
  const chosen = selection([
    category("relationships", 0, 1, 1),
    category("knowledge", 0, 1, 1),
    category("principal_cast", 0, 0, 0),
  ], 3, 3, 3);
  chosen.principalCastRange = { min: 1, ideal: 1, max: 1 };
  const result = allocateForgeInventory(chosen, {});
  expect(result.ok).toBe(true);
  if (result.ok === false) return;
  const jobs = partitionForgeInventory(chosen, result.value).jobs;
  const castId = jobs.find(job => job.categoryId === "principal_cast")?.id;
  expect(jobs.find(job => job.categoryId === "relationships")?.dependencies).toEqual([castId]);
  expect(jobs.find(job => job.categoryId === "knowledge")?.dependencies).toEqual([castId]);
});

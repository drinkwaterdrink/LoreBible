import type { EstimateRange } from "../../src/contracts/blueprint.js";
import type { BlueprintSelectionV1 } from "../../src/contracts/blueprintSelection.js";
import type { ForgeAllocatedInventoryCategory, ForgeInventoryAllocationResult, ForgeInventoryIssueCode } from "../../src/contracts/forgeInventory.js";
import { forgeDestinationForCategory } from "./forgeCoveragePlan.js";

/** Versioned planning assumptions, not a promise to fill a library allowance. */
export const FORGE_ENTRY_TOKEN_ESTIMATES_V1 = Object.freeze({ light: 140, standard: 220, rich: 320, exhaustive: 450 });
const STATUS_WEIGHT = { required: 3, recommended: 2, optional: 1, omitted: 0 } as const;
const DETAIL_WEIGHT = { light: 1, standard: 2, rich: 3, exhaustive: 4 } as const;
const SINGLETON_GUIDES = new Set(["aesthetic", "naming"]);
const DIRECT_DESTINATIONS = ["rules", "locations", "factions", "relationshipWeb", "knowledgeMap", "items", "secrets", "history", "pressures"] as const;

function entries(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function categoryCount(category: ForgeAllocatedInventoryCategory, sections: Readonly<Record<string, unknown>>): number {
  if (category.castTier) return entries(sections.npcs).filter(entry => record(record(entry).fields).castTier === category.castTier).length;
  if (category.destination === "additionalLore") return entries(sections.additionalLore).filter(entry => record(record(entry).fields).categoryId === category.categoryId).length;
  if (category.destination === "rules") return entries(record(sections.worldPhysics).rules).length;
  return entries(sections[category.destination]).length;
}
function validRange(range: EstimateRange): boolean {
  return [range.min, range.ideal, range.max].every(value => Number.isSafeInteger(value) && value >= 0)
    && range.min <= range.ideal && range.ideal <= range.max;
}
function issue(code: ForgeInventoryIssueCode, actual: number, limit: number, categoryId?: string) { return { code, actual, limit, ...(categoryId ? { categoryId } : {}) }; }

/** Pure R2 preflight. It does not mutate accepted Blueprint choices or saved Forge sections. */
export function allocateForgeInventory(selection: BlueprintSelectionV1, completedSections: Readonly<Record<string, unknown>>): ForgeInventoryAllocationResult {
  const issues: Array<ReturnType<typeof issue>> = [];
  const seen = new Set<string>();
  const categories: ForgeAllocatedInventoryCategory[] = [];
  for (const chosen of selection.categories) {
    if (SINGLETON_GUIDES.has(chosen.id)) {
      if (chosen.targetRange.max > 0) issues.push(issue("invalid_category_range", chosen.targetRange.max, 0, chosen.id));
      continue;
    }
    if (seen.has(chosen.id)) { issues.push(issue("duplicate_category_id", 2, 1, chosen.id)); continue; }
    seen.add(chosen.id);
    const range = chosen.id === "principal_cast" ? selection.principalCastRange : chosen.id === "roster_cast" ? selection.rosterCastRange : chosen.targetRange;
    if (!validRange(range)) { issues.push(issue("invalid_category_range", Number.NaN, 0, chosen.id)); continue; }
    const omitted = chosen.status === "omitted" || range.max === 0;
    const category: ForgeAllocatedInventoryCategory = {
      categoryId: chosen.id, categoryLabel: chosen.label, destination: forgeDestinationForCategory(chosen.id),
      ...(chosen.id === "principal_cast" ? { castTier: "principal" as const } : chosen.id === "roster_cast" ? { castTier: "roster" as const } : {}),
      purpose: chosen.purpose, status: chosen.status, min: omitted ? 0 : range.min,
      target: omitted ? 0 : range.min, max: omitted ? 0 : range.max,
      detail: chosen.detail, userLocked: chosen.userLocked, completed: 0, pending: 0,
    };
    category.completed = categoryCount(category, completedSections);
    if (omitted && category.completed > 0) issues.push(issue("completed_in_omitted_category", category.completed, 0, chosen.id));
    else if (category.completed > category.max) issues.push(issue("completed_exceeds_category_max", category.completed, category.max, chosen.id));
    category.target = Math.max(category.target, category.completed);
    categories.push(category);
  }
  const ownedDirect = new Map<string, string>();
  for (const category of categories) {
    if (category.destination === "additionalLore" || category.destination === "npcs") continue;
    const previous = ownedDirect.get(category.destination);
    if (previous) issues.push(issue("overlapping_category_destination", 2, 1, category.categoryId));
    ownedDirect.set(category.destination, category.categoryId);
  }
  for (const destination of DIRECT_DESTINATIONS) {
    const existing = destination === "rules" ? entries(record(completedSections.worldPhysics).rules) : entries(completedSections[destination]);
    if (existing.length && !ownedDirect.has(destination)) issues.push(issue("completed_unplanned_category", existing.length, 0, destination));
  }
  const ownedCast = new Set(categories.map(category => category.castTier).filter(Boolean));
  const unknownCast = entries(completedSections.npcs).filter(entry => !ownedCast.has(record(record(entry).fields).castTier as "principal" | "roster")).length;
  if (unknownCast) issues.push(issue("completed_unplanned_category", unknownCast, 0, "npcs"));
  const ownedSupplemental = new Set(categories.filter(category => category.destination === "additionalLore").map(category => category.categoryId));
  const unknownSupplemental = entries(completedSections.additionalLore).filter(entry => !ownedSupplemental.has(record(record(entry).fields).categoryId as string)).length;
  if (unknownSupplemental) issues.push(issue("completed_unplanned_category", unknownSupplemental, 0, "additionalLore"));
  if (!validRange(selection.lorebookRange)) issues.push(issue("invalid_category_range", Number.NaN, 0));
  const minimum = categories.reduce((sum, category) => sum + category.min, 0);
  const maximum = categories.reduce((sum, category) => sum + category.max, 0);
  if (minimum > selection.lorebookRange.max) issues.push(issue("category_minima_exceed_total_max", minimum, selection.lorebookRange.max));
  if (maximum < selection.lorebookRange.min) issues.push(issue("category_maxima_below_total_min", maximum, selection.lorebookRange.min));
  const completed = categories.reduce((sum, category) => sum + category.completed, 0);
  if (completed > selection.lorebookRange.max) issues.push(issue("completed_exceeds_total_max", completed, selection.lorebookRange.max));
  if (issues.length) return { ok: false, issues };

  const ideal = selection.categories.filter(category => !SINGLETON_GUIDES.has(category.id) && category.status !== "omitted")
    .reduce((sum, category) => sum + (category.id === "principal_cast" ? selection.principalCastRange.ideal : category.id === "roster_cast" ? selection.rosterCastRange.ideal : category.targetRange.ideal), 0);
  const floor = categories.reduce((sum, category) => sum + category.target, 0);
  const desired = Math.max(floor, Math.min(maximum, selection.lorebookRange.max, Math.max(selection.lorebookRange.min, ideal)));
  let assigned = floor;
  while (assigned < desired) {
    const belowIdeal = categories.filter(category => category.target < category.max && category.target < (category.categoryId === "principal_cast" ? selection.principalCastRange.ideal : category.categoryId === "roster_cast" ? selection.rosterCastRange.ideal : selection.categories.find(chosen => chosen.id === category.categoryId)!.targetRange.ideal));
    const eligible = belowIdeal.length ? belowIdeal : categories.filter(category => category.target < category.max);
    if (!eligible.length) break;
    eligible.sort((a, b) => {
      const aWeight = STATUS_WEIGHT[a.status] * DETAIL_WEIGHT[a.detail] / (a.target - a.min + 1);
      const bWeight = STATUS_WEIGHT[b.status] * DETAIL_WEIGHT[b.detail] / (b.target - b.min + 1);
      return bWeight - aWeight || (a.categoryId < b.categoryId ? -1 : a.categoryId > b.categoryId ? 1 : 0);
    });
    eligible[0].target++;
    assigned++;
  }
  for (const category of categories) category.pending = category.target - category.completed;
  return { ok: true, value: {
    categories, totalTarget: assigned, totalCompleted: completed, totalPending: assigned - completed,
    estimatedLibraryTokens: categories.reduce((sum, category) => sum + category.target * FORGE_ENTRY_TOKEN_ESTIMATES_V1[category.detail], 0),
  } };
}

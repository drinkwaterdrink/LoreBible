import type {
  BlueprintSelectionV1,
  RuntimeTokenBudget,
} from "../../src/contracts/blueprintSelection.js";
import type { EstimateRange } from "../../src/contracts/blueprint.js";

export interface ForgeBlueprintCategoryBrief {
  id: string;
  label: string;
  status: BlueprintSelectionV1["categories"][number]["status"];
  detail: BlueprintSelectionV1["categories"][number]["detail"];
  targetRange: EstimateRange;
  userLocked: boolean;
}

export interface ForgeBlueprintBrief {
  interfaceMode: BlueprintSelectionV1["interfaceMode"];
  worldMode: BlueprintSelectionV1["worldMode"];
  buildIntensity: BlueprintSelectionV1["buildIntensity"];
  generationQuality: BlueprintSelectionV1["generationQuality"];
  libraryTargetTokens: number;
  libraryMaxTokens: number;
  runtimeBudget: RuntimeTokenBudget;
  lorebookEntries: EstimateRange;
  principalCast: EstimateRange;
  rosterCast: EstimateRange;
  ordinaryLifeDetail: number;
  categories: ForgeBlueprintCategoryBrief[];
  mechanicPacks: string[];
}

const LIBRARY_PRESETS: Record<BlueprintSelectionV1["lorebookScale"], number> = {
  compact: 10_000,
  standard: 20_000,
  large: 30_000,
  massive: 40_000,
  custom: 20_000,
};

function cloneRange(range: EstimateRange): EstimateRange {
  return { min: range.min, ideal: range.ideal, max: range.max };
}

export function createForgeBlueprintBrief(selection: BlueprintSelectionV1 | null | undefined): ForgeBlueprintBrief | null {
  if (!selection) return null;
  const preset = LIBRARY_PRESETS[selection.lorebookScale];
  const target = selection.loreLibraryBudget.targetTokens ?? preset;
  const maximum = selection.loreLibraryBudget.maxTokens ?? target;
  return {
    interfaceMode: selection.interfaceMode,
    worldMode: selection.worldMode,
    buildIntensity: selection.buildIntensity,
    generationQuality: selection.generationQuality,
    libraryTargetTokens: target,
    libraryMaxTokens: maximum,
    runtimeBudget: structuredClone(selection.runtimeTokenBudget),
    lorebookEntries: cloneRange(selection.lorebookRange),
    principalCast: cloneRange(selection.principalCastRange),
    rosterCast: cloneRange(selection.rosterCastRange),
    ordinaryLifeDetail: selection.everydayLifeDetail,
    categories: selection.categories.map((category) => ({
      id: category.id,
      label: category.label,
      status: category.status,
      detail: category.detail,
      targetRange: cloneRange(category.targetRange),
      userLocked: category.userLocked,
    })),
    mechanicPacks: selection.mechanicPacks.filter((pack) => pack.enabled).map((pack) => pack.label),
  };
}

function formatRange(range: EstimateRange): string {
  return `${range.min}/${range.ideal}/${range.max}`;
}

function formatRuntimeBudget(budget: RuntimeTokenBudget): string {
  if (budget.mode === "custom") return `${budget.tokens.toLocaleString("en-US")} tokens`;
  return budget.mode === "unlimited" ? "Unlimited" : "Auto";
}

export function formatForgeBlueprintBrief(brief: ForgeBlueprintBrief): string {
  const categories = brief.categories.map((category) => {
    if (category.status === "omitted") return `- ${category.label}: omitted`;
    const lock = category.userLocked ? " (locked)" : "";
    return `- ${category.label}: ${category.status}, ${category.detail}, target ${formatRange(category.targetRange)} entries${lock}`;
  });
  const mechanics = brief.mechanicPacks.length ? brief.mechanicPacks.join(", ") : "none selected";
  return `ACCEPTED PRODUCTION BLUEPRINT:
- World mode: ${brief.worldMode}
- Build intensity: ${brief.buildIntensity}; generation quality: ${brief.generationQuality}
- Authored lore target: approximately ${brief.libraryTargetTokens.toLocaleString("en-US")} tokens; never pad to hit this allowance.
- Authored lore ceiling: ${brief.libraryMaxTokens.toLocaleString("en-US")} tokens.
- Runtime activation recommendation: ${formatRuntimeBudget(brief.runtimeBudget)}; this is separate from total library size.
- Total lorebook entry range (minimum/ideal/maximum): ${formatRange(brief.lorebookEntries)}.
- Principal cast range: ${formatRange(brief.principalCast)}; roster cast range: ${formatRange(brief.rosterCast)}.
- Ordinary-life coverage: ${brief.ordinaryLifeDetail}/5.
- Enabled optional mechanic packs: ${mechanics}.
- Category plan:
${categories.join("\n")}

Treat counts as project-wide coverage targets, not a request to make each paragraph longer. Generate focused, nonredundant entries. Preserve omitted categories and user-locked choices.`;
}

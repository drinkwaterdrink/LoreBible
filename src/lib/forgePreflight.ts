import type { BlueprintSelectionV1, ForgeExecutionPreference } from "../contracts/blueprintSelection";

export interface ForgePreflightFinding {
  code: string;
  severity: "blocker" | "major" | "note";
  message: string;
}

export interface ForgePreflightReport {
  version: 1;
  modelId: string | null;
  capacityEvidence: "unknown";
  executionMode: ForgeExecutionPreference;
  recommendedExecutionMode: ForgeExecutionPreference;
  libraryTargetTokens: number | null;
  runtimeActivationTokens: number | "unlimited" | null;
  sourceContextTokens: number;
  requestCount: number;
  totalExpectedOutputTokens: number;
  largestExpectedOutputTokens: number;
  findings: ForgePreflightFinding[];
}

export function createForgePreflight(_input: {
  selection: BlueprintSelectionV1;
  modelId: string | null;
  sourceCharacters: number;
  executionMode: ForgeExecutionPreference;
}): ForgePreflightReport {
  const input = _input;
  const detailTokens = { light: 140, standard: 220, rich: 320, exhaustive: 450 } as const;
  const singletonRequests = 13;
  let categoryRequests = 0;
  let categoryOutputTokens = 0;
  for (const category of input.selection.categories) {
    if (category.status === "omitted" || category.targetRange.max === 0 || category.id === "aesthetic" || category.id === "naming") continue;
    const range = category.id === "principal_cast"
      ? input.selection.principalCastRange
      : category.id === "roster_cast"
        ? input.selection.rosterCastRange
        : category.targetRange;
    const entries = Math.max(0, Math.round(range.ideal));
    const ceiling = category.detail === "rich" || category.detail === "exhaustive" ? 3 : 6;
    const jobs = Math.ceil(entries / ceiling);
    categoryRequests += jobs;
    categoryOutputTokens += entries * detailTokens[category.detail] + jobs * 400;
  }
  const specialistRequests = singletonRequests + categoryRequests;
  const totalExpectedOutputTokens = singletonRequests * 800 + categoryOutputTokens;
  const singleRequest = input.executionMode === "single_request";
  const findings: ForgePreflightFinding[] = [];
  if (!input.modelId) findings.push({ code: "model.selection_required", severity: "blocker", message: "Choose a connection and model before starting Forge." });
  findings.push({ code: "model.capacity_unverified", severity: "note", message: "Model capacity is unverified. LoreBible uses conservative specialist estimates because providers do not expose one reliable context/output limit through the current connection contract." });
  if (singleRequest && totalExpectedOutputTokens > 16_000) findings.push({ code: "forge.single_request_output_risk", severity: "major", message: "The combined Single Request estimate exceeds LoreBible's current 16,000-token Forge output request. Continuous mode is safer and preserves each validated specialist." });
  const libraryTargetTokens = input.selection.loreLibraryBudget.targetTokens ?? input.selection.loreLibraryBudget.maxTokens ?? null;
  const runtimeActivationTokens = input.selection.runtimeTokenBudget.mode === "custom"
    ? input.selection.runtimeTokenBudget.tokens
    : input.selection.runtimeTokenBudget.mode === "unlimited" ? "unlimited" : null;
  return {
    version: 1,
    modelId: input.modelId,
    capacityEvidence: "unknown",
    executionMode: input.executionMode,
    recommendedExecutionMode: singleRequest && totalExpectedOutputTokens > 16_000 ? "continuous" : input.executionMode,
    libraryTargetTokens,
    runtimeActivationTokens,
    sourceContextTokens: Math.ceil(Math.max(0, input.sourceCharacters) / 4),
    requestCount: singleRequest ? 1 : specialistRequests,
    totalExpectedOutputTokens,
    largestExpectedOutputTokens: singleRequest ? totalExpectedOutputTokens : Math.min(2_400, Math.max(800, categoryRequests ? 2_400 : 800)),
    findings,
  };
}

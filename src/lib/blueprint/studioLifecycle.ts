import type{BlueprintPlanV1}from"../../contracts/blueprint";
import{parseBlueprintSelectionV1,type BlueprintSelectionV1}from"../../contracts/blueprintSelection";
import{createBlueprintSelection,reconcileBlueprintSelection}from"./selection";

export function createBlueprintStudioDraft(plan:BlueprintPlanV1,saved:BlueprintSelectionV1|null):BlueprintSelectionV1{
  if(!saved)return createBlueprintSelection(plan);
  if(saved.projectId!==plan.source.projectId)return createBlueprintSelection(plan);
  if(saved.sourceRecommendationFingerprint===plan.source.inputSha256)return structuredClone(saved);
  return reconcileBlueprintSelection(saved,plan);
}

export function commitBlueprintStudioDraft(draft:BlueprintSelectionV1):BlueprintSelectionV1{
  const parsed=parseBlueprintSelectionV1(draft);
  if("issues"in parsed)throw new Error(parsed.issues.map(issue=>`${issue.path}: ${issue.message}`).join(" "));
  return structuredClone(parsed.value);
}

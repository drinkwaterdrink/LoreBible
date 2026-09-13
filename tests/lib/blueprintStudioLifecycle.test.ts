import{expect,test}from"bun:test";
import{createBlueprintPlan}from"../../src/lib/blueprint/planner";
import{createBlueprintSelection,addBlueprintCategory,updateBlueprintField}from"../../src/lib/blueprint/selection";
import{createBlueprintStudioDraft,commitBlueprintStudioDraft}from"../../src/lib/blueprint/studioLifecycle";
import{familyVisit,warTornKingdom}from"../fixtures/blueprintPremises";

const first=createBlueprintPlan(familyVisit(),{createdAt:"2026-09-12T12:00:00.000Z"});
test("first open creates a detached selection and reopen retains saved choices",()=>{const created=createBlueprintStudioDraft(first,null);expect(created).not.toBe(first);const saved=updateBlueprintField(created,"worldMode","sandbox");const reopened=createBlueprintStudioDraft(first,saved);expect(reopened.worldMode).toBe("sandbox");expect(reopened).not.toBe(saved);});
test("a changed recommendation reconciles locks and custom categories",()=>{let saved=createBlueprintSelection(first);saved=updateBlueprintField(saved,"runtimeBudget","efficient");saved=addBlueprintCategory(saved,"Neighborhood Pets");const next=createBlueprintPlan(warTornKingdom(),{createdAt:"2026-09-12T13:00:00.000Z"});const draft=createBlueprintStudioDraft(next,saved);expect(draft.runtimeBudget).toBe("efficient");expect(draft.categories.some(item=>item.id==="custom:neighborhood-pets")).toBe(true);expect(draft.sourceRecommendationFingerprint).toBe(next.source.inputSha256);});
test("commit validates and detaches the complete draft",()=>{const draft=createBlueprintSelection(first);const committed=commitBlueprintStudioDraft(draft);expect(committed).toEqual(draft);expect(committed).not.toBe(draft);expect(()=>commitBlueprintStudioDraft({...draft,artifactTargets:[]})).toThrow("artifactTargets");});

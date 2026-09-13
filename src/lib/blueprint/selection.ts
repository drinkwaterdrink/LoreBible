import type { BlueprintPlanV1, EstimateRange } from "../../contracts/blueprint";
import { BLUEPRINT_SELECTION_SCHEMA, parseBlueprintSelectionV1, type BlueprintSelectionV1, type LorebookScale } from "../../contracts/blueprintSelection";
import type { PhysicsConfig } from "../../types";

export const LOREBOOK_SCALE_RANGES: Readonly<Record<Exclude<LorebookScale,"custom">,Readonly<EstimateRange>>>={
  compact:{min:10,ideal:18,max:25},standard:{min:25,ideal:42,max:60},large:{min:60,ideal:90,max:120},massive:{min:120,ideal:185,max:250},
};
const clone=<T>(value:T):T=>structuredClone(value);
const castRange=(plan:BlueprintPlanV1,id:string):EstimateRange=>clone(plan.categories.find(category=>category.id===id)?.targetRange??{min:0,ideal:0,max:0});

export function createBlueprintSelection(plan:BlueprintPlanV1,options:{now?:string;everydayLifeDetail?:number}={}):BlueprintSelectionV1{
  const now=options.now??plan.createdAt;
  return {schema:BLUEPRINT_SELECTION_SCHEMA,projectId:plan.source.projectId,sourceProjectRevision:plan.source.projectRevision,sourceRecommendationFingerprint:plan.source.inputSha256,interfaceMode:"smart_auto",artifactTargets:plan.artifactTargets.map(item=>item.value),worldMode:plan.worldMode.value,buildIntensity:plan.buildIntensity.value,generationQuality:plan.generationQuality.value,runtimeBudget:plan.runtimeBudget.value,lorebookScale:"standard",lorebookRange:clone(LOREBOOK_SCALE_RANGES.standard),principalCastRange:castRange(plan,"principal_cast"),rosterCastRange:castRange(plan,"roster_cast"),everydayLifeDetail:options.everydayLifeDetail??3,categories:plan.categories.map(category=>({id:category.id,label:category.label,purpose:category.purpose,justification:category.justification,status:category.status,detail:category.detail,targetRange:clone(category.targetRange??{min:0,ideal:0,max:0}),likelyRuntimeRole:category.likelyRuntimeRole,candidateArchitectures:category.candidateArchitectures.map(item=>item.value),userLocked:false,userExplanation:"",custom:false})),mechanicPacks:plan.mechanicPacks.map(pack=>({id:pack.id,label:pack.label,enabled:pack.status==="recommended",eligible:pack.status!=="ineligible",reason:pack.reason,architectureEffects:[],runtimeRequirements:[],compilerRules:[],testFixtures:[],gracefulFallback:"Use focused keyword retrieval.",userLocked:false})),forgeExecutionPreference:"continuous",lockedFields:[],createdAt:now,updatedAt:now};
}
export function reconcileBlueprintSelection(current:BlueprintSelectionV1,plan:BlueprintPlanV1):BlueprintSelectionV1{
  const proposed=createBlueprintSelection(plan,{now:current.updatedAt,everydayLifeDetail:current.everydayLifeDetail}); const existing=new Map(current.categories.map(item=>[item.id,item]));
  proposed.categories=proposed.categories.map(item=>existing.get(item.id)?.userLocked?clone(existing.get(item.id)!):item);
  proposed.categories.push(...current.categories.filter(item=>(item.custom||item.userLocked)&&!proposed.categories.some(next=>next.id===item.id)).map(clone));
  const packs=new Map(current.mechanicPacks.map(item=>[item.id,item])); proposed.mechanicPacks=proposed.mechanicPacks.map(item=>packs.get(item.id)?.userLocked?clone(packs.get(item.id)!):item);
  for(const field of current.lockedFields)if(field in proposed)(proposed as unknown as Record<string,unknown>)[field]=clone((current as unknown as Record<string,unknown>)[field]);
  proposed.interfaceMode=current.interfaceMode; proposed.lorebookScale=current.lorebookScale; proposed.lorebookRange=clone(current.lorebookRange); proposed.forgeExecutionPreference=current.forgeExecutionPreference; proposed.lockedFields=[...current.lockedFields]; proposed.createdAt=current.createdAt; proposed.updatedAt=plan.createdAt; return proposed;
}
export function setLorebookScale(selection:BlueprintSelectionV1,scale:LorebookScale,customRange?:EstimateRange):BlueprintSelectionV1{return{...clone(selection),lorebookScale:scale,lorebookRange:clone(scale==="custom"?(customRange??selection.lorebookRange):LOREBOOK_SCALE_RANGES[scale])};}
export const getEverydayLifeDetail=(physics:PhysicsConfig)=>physics.mundanity;
export const withEverydayLifeDetail=(physics:PhysicsConfig,value:number):PhysicsConfig=>({...physics,mundanity:value});

type EditableField = "interfaceMode"|"artifactTargets"|"worldMode"|"buildIntensity"|"generationQuality"|"runtimeBudget"|"lorebookScale"|"lorebookRange"|"principalCastRange"|"rosterCastRange"|"everydayLifeDetail"|"forgeExecutionPreference";
const verified=(selection:BlueprintSelectionV1):BlueprintSelectionV1=>{const parsed=parseBlueprintSelectionV1(selection);if("issues" in parsed)throw new Error(parsed.issues.map(issue=>`${issue.path}: ${issue.message}`).join(" "));return parsed.value;};
const stamped=(selection:BlueprintSelectionV1,now?:string):BlueprintSelectionV1=>({...selection,updatedAt:now??new Date().toISOString()});

export function updateBlueprintField<K extends EditableField>(selection:BlueprintSelectionV1,key:K,value:BlueprintSelectionV1[K],now?:string):BlueprintSelectionV1{
  const next=stamped(clone(selection),now); next[key]=clone(value) as BlueprintSelectionV1[K]; if(!next.lockedFields.includes(key))next.lockedFields.push(key); return verified(next);
}

export function updateBlueprintCategory(selection:BlueprintSelectionV1,id:string,patch:Partial<Pick<BlueprintSelectionV1["categories"][number],"status"|"detail"|"targetRange"|"likelyRuntimeRole"|"candidateArchitectures"|"userExplanation"|"userLocked">>,now?:string):BlueprintSelectionV1{
  const next=stamped(clone(selection),now); const index=next.categories.findIndex(item=>item.id===id); if(index<0)throw new Error("Blueprint category was not found.");
  const current=next.categories[index]; if(current.status==="required"&&patch.status==="omitted")throw new Error("A required category cannot be omitted."); next.categories[index]={...current,...clone(patch),userLocked:patch.userLocked??true}; return verified(next);
}

export function updateBlueprintMechanic(selection:BlueprintSelectionV1,id:string,enabled:boolean,now?:string):BlueprintSelectionV1{
  const next=stamped(clone(selection),now); const index=next.mechanicPacks.findIndex(item=>item.id===id); if(index<0)throw new Error("Blueprint mechanic was not found.");
  if(enabled&&!next.mechanicPacks[index].eligible)throw new Error("An ineligible mechanic cannot be enabled."); next.mechanicPacks[index]={...next.mechanicPacks[index],enabled,userLocked:true}; return verified(next);
}

const slug=(label:string)=>label.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"category";
export function addBlueprintCategory(selection:BlueprintSelectionV1,label:string,explanation="",now?:string):BlueprintSelectionV1{
  if(!label.trim())throw new Error("Custom category name is required."); const next=stamped(clone(selection),now); const base=`custom:${slug(label)}`; let id=base; let suffix=2; while(next.categories.some(item=>item.id===id))id=`${base}-${suffix++}`;
  next.categories.push({id,label:label.trim(),purpose:explanation.trim()||"User-defined lore coverage.",justification:"Added by the user for this project.",status:"optional",detail:"standard",targetRange:{min:1,ideal:3,max:6},likelyRuntimeRole:"mixed",candidateArchitectures:[],userLocked:true,userExplanation:explanation.trim(),custom:true}); return verified(next);
}

export function removeBlueprintCategory(selection:BlueprintSelectionV1,id:string,now?:string):BlueprintSelectionV1{
  const current=selection.categories.find(item=>item.id===id); if(!current)throw new Error("Blueprint category was not found."); if(!current.custom)throw new Error("Only custom categories can be removed."); const next=stamped(clone(selection),now); next.categories=next.categories.filter(item=>item.id!==id); return verified(next);
}

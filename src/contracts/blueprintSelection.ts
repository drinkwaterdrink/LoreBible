import type { ArtifactTarget, BlueprintCategoryStatus, BlueprintDetail, BlueprintGenerationQuality, BlueprintRuntimeRole, BlueprintWorldMode, BuildIntensity, EstimateRange, RuntimeBudget } from "./blueprint";

export const BLUEPRINT_SELECTION_SCHEMA = "lorebible.blueprint-selection/v1" as const;
export type BlueprintInterfaceMode = "smart_auto" | "guided" | "expert";
export type LorebookScale = "compact" | "standard" | "large" | "massive" | "custom";
export type ForgeExecutionPreference = "continuous" | "step_by_step" | "single_request";

export interface BlueprintCategorySelection {
  id: string; label: string; purpose: string; justification: string; status: BlueprintCategoryStatus; detail: BlueprintDetail;
  targetRange: EstimateRange; likelyRuntimeRole: BlueprintRuntimeRole; candidateArchitectures: string[]; userLocked: boolean;
  userExplanation: string; custom: boolean;
}
export interface BlueprintMechanicSelection {
  id: string; label: string; enabled: boolean; eligible: boolean; reason: string; architectureEffects: string[];
  runtimeRequirements: string[]; compilerRules: string[]; testFixtures: string[]; gracefulFallback: string; userLocked: boolean;
}
export interface BlueprintSelectionV1 {
  schema: typeof BLUEPRINT_SELECTION_SCHEMA; projectId: string; sourceProjectRevision: number; sourceRecommendationFingerprint: string;
  interfaceMode: BlueprintInterfaceMode; artifactTargets: ArtifactTarget[]; worldMode: BlueprintWorldMode; buildIntensity: BuildIntensity;
  generationQuality: BlueprintGenerationQuality; runtimeBudget: RuntimeBudget; lorebookScale: LorebookScale; lorebookRange: EstimateRange;
  principalCastRange: EstimateRange; rosterCastRange: EstimateRange; everydayLifeDetail: number; categories: BlueprintCategorySelection[];
  mechanicPacks: BlueprintMechanicSelection[]; forgeExecutionPreference: ForgeExecutionPreference; lockedFields: string[]; createdAt: string; updatedAt: string;
}
export type BlueprintSelectionParseResult = { ok: true; value: BlueprintSelectionV1 } | { ok: false; issues: Array<{ path: string; message: string }> };

const credential = /(?:^|[_-])(api[_-]?key|password|credentials?|access[_-]?token|secret|client[_-]?secret|refresh[_-]?token|private[_-]?key|authorization|bearer|token)(?:$|[_-])/i;
const allowed = {
  root: ["schema","projectId","sourceProjectRevision","sourceRecommendationFingerprint","interfaceMode","artifactTargets","worldMode","buildIntensity","generationQuality","runtimeBudget","lorebookScale","lorebookRange","principalCastRange","rosterCastRange","everydayLifeDetail","categories","mechanicPacks","forgeExecutionPreference","lockedFields","createdAt","updatedAt"],
  category: ["id","label","purpose","justification","status","detail","targetRange","likelyRuntimeRole","candidateArchitectures","userLocked","userExplanation","custom"],
  mechanic: ["id","label","enabled","eligible","reason","architectureEffects","runtimeRequirements","compilerRules","testFixtures","gracefulFallback","userLocked"],
  range: ["min","ideal","max"],
} as const;

function snapshot(value: unknown, issues: Array<{path:string;message:string}>, path = "", seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) { issues.push({ path, message: "Cyclic input is not allowed." }); return null; }
  seen.add(value);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const proto = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    if (proto !== Array.prototype) { issues.push({path,message:"Expected a plain array."}); return null; }
    const output: unknown[] = [];
    for (let index=0; index<value.length; index++) {
      const descriptor=descriptors[String(index)];
      if (!descriptor || !("value" in descriptor)) { issues.push({path:`${path}[${index}]`,message:"Expected a data property."}); return null; }
      output.push(snapshot(descriptor.value,issues,`${path}[${index}]`,seen));
    }
    return output;
  }
  if (proto !== Object.prototype && proto !== null) { issues.push({path,message:"Expected a plain object."}); return null; }
  const output: Record<string,unknown> = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!("value" in descriptor)) { issues.push({path:path?`${path}.${key}`:key,message:"Accessors are not allowed."}); continue; }
    if (credential.test(key)) issues.push({path:path?`${path}.${key}`:key,message:"Credential-shaped fields are not allowed."});
    output[key]=snapshot(descriptor.value,issues,path?`${path}.${key}`:key,seen);
  }
  return output;
}
const record=(value:unknown): value is Record<string,unknown> => Boolean(value&&typeof value==="object"&&!Array.isArray(value));
function closed(value:unknown, keys:readonly string[], path:string, issues:Array<{path:string;message:string}>): value is Record<string,unknown> {
  if(!record(value)){issues.push({path,message:"Expected an object."});return false;}
  for(const key of Object.keys(value))if(!keys.includes(key))issues.push({path:path?`${path}.${key}`:key,message:"Unknown field is not allowed."});
  return true;
}
function strings(value:unknown,path:string,issues:Array<{path:string;message:string}>): value is string[]{if(!Array.isArray(value)||value.some(item=>typeof item!=="string")){issues.push({path,message:"Expected strings."});return false;}return true;}
function range(value:unknown,path:string,issues:Array<{path:string;message:string}>): value is EstimateRange{
  if(!closed(value,allowed.range,path,issues))return false; const values=[value.min,value.ideal,value.max];
  if(values.some(item=>typeof item!=="number"||!Number.isFinite(item)||item<0)){issues.push({path,message:"Range values must be finite and nonnegative."});return false;}
  if(!(Number(value.min)<=Number(value.ideal)&&Number(value.ideal)<=Number(value.max)))issues.push({path,message:"Range values must be ascending."}); return true;
}
function oneOf(value:unknown, values:readonly string[], path:string, issues:Array<{path:string;message:string}>){if(typeof value!=="string"||!values.includes(value))issues.push({path,message:"Unsupported value."});}
function unique(items:unknown[],path:string,issues:Array<{path:string;message:string}>){const seen=new Set<string>();items.forEach((item,index)=>{if(!record(item)||typeof item.id!=="string"||!item.id.trim())issues.push({path:`${path}[${index}].id`,message:"Expected a stable ID."});else if(seen.has(item.id))issues.push({path:`${path}[${index}].id`,message:"Duplicate stable ID."});else seen.add(item.id);});}

export function parseBlueprintSelectionV1(input:unknown):BlueprintSelectionParseResult{
  try{
    const issues:Array<{path:string;message:string}>=[]; const value=snapshot(input,issues);
    if(!closed(value,allowed.root,"",issues))return{ok:false,issues};
    if(value.schema!==BLUEPRINT_SELECTION_SCHEMA)issues.push({path:"schema",message:"Unsupported schema."});
    for(const key of ["projectId","sourceRecommendationFingerprint","createdAt","updatedAt"] as const)if(typeof value[key]!=="string"||!value[key])issues.push({path:key,message:"Expected a non-empty string."});
    if(!Number.isInteger(value.sourceProjectRevision)||Number(value.sourceProjectRevision)<0)issues.push({path:"sourceProjectRevision",message:"Expected a nonnegative integer."});
    oneOf(value.interfaceMode,["smart_auto","guided","expert"],"interfaceMode",issues); strings(value.artifactTargets,"artifactTargets",issues);
    oneOf(value.worldMode,["arc","sandbox","hybrid"],"worldMode",issues); oneOf(value.buildIntensity,["lean","rich","deluxe","obsessive"],"buildIntensity",issues);
    oneOf(value.generationQuality,["fast","balanced","deep_craft","production"],"generationQuality",issues); oneOf(value.runtimeBudget,["efficient","balanced","expansive"],"runtimeBudget",issues);
    oneOf(value.lorebookScale,["compact","standard","large","massive","custom"],"lorebookScale",issues); range(value.lorebookRange,"lorebookRange",issues); range(value.principalCastRange,"principalCastRange",issues); range(value.rosterCastRange,"rosterCastRange",issues);
    if(typeof value.everydayLifeDetail!=="number"||value.everydayLifeDetail<1||value.everydayLifeDetail>5)issues.push({path:"everydayLifeDetail",message:"Expected a value from 1 to 5."});
    if(!Array.isArray(value.categories))issues.push({path:"categories",message:"Expected categories."});else{unique(value.categories,"categories",issues);value.categories.forEach((item,index)=>{if(!closed(item,allowed.category,`categories[${index}]`,issues))return;for(const key of ["id","label","purpose","justification","userExplanation"] as const)if(typeof item[key]!=="string")issues.push({path:`categories[${index}].${key}`,message:"Expected a string."});oneOf(item.status,["recommended","optional","omitted","required"],`categories[${index}].status`,issues);oneOf(item.detail,["light","standard","rich","exhaustive"],`categories[${index}].detail`,issues);oneOf(item.likelyRuntimeRole,["evergreen","reference","dynamic","secret","ambient","state","mixed"],`categories[${index}].likelyRuntimeRole`,issues);range(item.targetRange,`categories[${index}].targetRange`,issues);strings(item.candidateArchitectures,`categories[${index}].candidateArchitectures`,issues);if(typeof item.userLocked!=="boolean"||typeof item.custom!=="boolean")issues.push({path:`categories[${index}]`,message:"Expected boolean flags."});});}
    if(!Array.isArray(value.mechanicPacks))issues.push({path:"mechanicPacks",message:"Expected mechanic packs."});else{unique(value.mechanicPacks,"mechanicPacks",issues);value.mechanicPacks.forEach((item,index)=>{if(!closed(item,allowed.mechanic,`mechanicPacks[${index}]`,issues))return;for(const key of ["id","label","reason","gracefulFallback"] as const)if(typeof item[key]!=="string")issues.push({path:`mechanicPacks[${index}].${key}`,message:"Expected a string."});for(const key of ["architectureEffects","runtimeRequirements","compilerRules","testFixtures"] as const)strings(item[key],`mechanicPacks[${index}].${key}`,issues);if(typeof item.enabled!=="boolean"||typeof item.eligible!=="boolean"||typeof item.userLocked!=="boolean")issues.push({path:`mechanicPacks[${index}]`,message:"Expected boolean flags."});});}
    oneOf(value.forgeExecutionPreference,["continuous","step_by_step","single_request"],"forgeExecutionPreference",issues);strings(value.lockedFields,"lockedFields",issues);
    if(issues.length)return{ok:false,issues}; return{ok:true,value:value as unknown as BlueprintSelectionV1};
  }catch{return{ok:false,issues:[{path:"",message:"Invalid Blueprint selection."}]};}
}

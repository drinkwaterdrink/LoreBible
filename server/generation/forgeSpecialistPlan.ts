import type {JsonSchema} from "../../src/contracts/generation.js";
import type {BlueprintSelectionV1} from "../../src/contracts/blueprintSelection.js";
import type {ForgeJobDestinationV1,ForgeJobV1,ForgeSpecialistLedgerV1} from "../../src/contracts/projectGraph.js";
import {canonicalizeJson,sha256Hex} from "../../src/lib/projectGraph/canonicalJson.js";
import {allocateForgeInventory,partitionForgeInventory} from "./forgeJobPlan.js";
import {FORGE_BUNDLE_DEFINITIONS} from "./forgeSchemas.js";
import {FORGE_PROTOCOL,FORGE_SHARED_CONSTITUTION,FORGE_CRAFT,FORGE_CORRECTION} from "./prompts/forgeDefaults.js";
import {renderSchemaContract} from "./schemaContract.js";
import {validateSchemaValue} from "./schemaContract.js";
import {sanitizeForgeSectionEntries} from "./forgeValidation.js";
import {ForgeValidationError} from "./forgeCandidate.js";
import {compileBundleFiveJobPrompt,createBundleFiveJobSpec,splitBundleFiveJob,validateBundleFiveJob,type BundleFiveJob} from "./forgeBundleFiveJobs.js";
import {FORGE_CREATIVE_DEFAULTS} from "../../src/lib/prompts/registry.js";

export interface ForgeSpecialistJob {id:string;bundleIndex:number;kind:ForgeJobV1["kind"];key:ForgeJobDestinationV1;categoryId?:string;categoryLabel?:string;purpose?:string;entryIds:string[];schema:JsonSchema;splitDepth:number}
export class ForgeSpecialistPlanningError extends Error {}
const ENABLED_BUNDLES=new Set([0,1,2,3,4,5]);
const SINGLETONS:[ForgeJobDestinationV1,number][]=[["core",0],["user",0],["worldPhysics",0],["status",0],["conflict",3],["pressureProtocol",3],["aesthetic",4],["naming",4],["proceduralRolls",5],["opening",5],["expansionNotes",5],["antiGravity",5],["buildNotes",5]];

function projectedSchema(bundleIndex:number,key:ForgeJobDestinationV1):JsonSchema{
  const property=FORGE_BUNDLE_DEFINITIONS[bundleIndex]?.schema.properties?.[key];
  if(!property)throw new ForgeSpecialistPlanningError(`Bundle ${bundleIndex+1} has no ${key} specialist schema.`);
  return{type:"object",properties:{[key]:property},required:[key]};
}
export function canUseForgeSpecialistsForBatch(startBundleIndex:number,endBundleIndexExclusive:number):boolean{return endBundleIndexExclusive===startBundleIndex+1;}
export function canUsePersistedForgeSpecialistsForBundle(ledger:ForgeSpecialistLedgerV1|null,bundleIndex:number):boolean{return !ledger||ledger.jobs.some(item=>item.job.bundleIndex===bundleIndex);}
export function hydrateForgeSpecialistJob(job:ForgeJobV1):ForgeSpecialistJob{return{id:job.id,bundleIndex:job.bundleIndex,kind:job.kind,key:job.destinations[0],categoryId:job.categoryId,categoryLabel:job.categoryLabel,purpose:job.purpose,entryIds:[...job.entryIds],schema:projectedSchema(job.bundleIndex,job.destinations[0]),splitDepth:job.splitDepth};}
export function validateForgeSpecialistJob(job:ForgeSpecialistJob,value:unknown):Record<string,unknown>{
  if(job.kind==="bundle5_section")return validateBundleFiveJob(job as BundleFiveJob,value);
  const issues=validateSchemaValue(value,job.schema);if(issues.length)throw new ForgeValidationError(`Specialist ${job.id} failed schema validation.`,issues);
  const output=structuredClone(value)as Record<string,unknown>;if(Object.keys(output).length!==1||!Object.hasOwn(output,job.key))throw new ForgeValidationError(`Specialist ${job.id} returned an unowned section.`);
  if(job.key==="worldPhysics"){const physics=output.worldPhysics as Record<string,unknown>;output.worldPhysics={...physics,rules:sanitizeForgeSectionEntries("rules",physics.rules as unknown[])};}
  if(job.entryIds.length){const entries=output[job.key]as Array<Record<string,unknown>>;if(entries.length!==job.entryIds.length)throw new ForgeValidationError(`Specialist ${job.id} returned ${entries.length} of ${job.entryIds.length} assigned entries.`);if(new Set(entries.map(entry=>entry.id)).size!==entries.length||entries.some(entry=>!job.entryIds.includes(String(entry.id))))throw new ForgeValidationError(`Specialist ${job.id} changed or duplicated assigned entry IDs.`);if(job.key==="additionalLore"&&entries.some(entry=>{const fields=entry.fields as Record<string,unknown>;return fields.categoryId!==job.categoryId||fields.categoryLabel!==job.categoryLabel;}))throw new ForgeValidationError(`Specialist ${job.id} changed its assigned category.`);const castTier=job.categoryId==="principal_cast"?"principal":job.categoryId==="roster_cast"?"roster":null;if(job.key==="npcs"&&castTier&&entries.some(entry=>(entry.fields as Record<string,unknown>)?.castTier!==castTier))throw new ForgeValidationError(`Specialist ${job.id} changed its assigned ${castTier} cast tier.`);output[job.key]=sanitizeForgeSectionEntries(job.key,entries);}
  return output;
}
export function splitForgeSpecialistJob(job:ForgeSpecialistJob):[ForgeSpecialistJob,ForgeSpecialistJob]|null{if(job.kind==="bundle5_section"){const children=splitBundleFiveJob(job as BundleFiveJob);return children?.map(child=>({...child,bundleIndex:4,kind:"bundle5_section" as const})) as [ForgeSpecialistJob,ForgeSpecialistJob]|null;}if(job.entryIds.length<2||job.splitDepth>=2)return null;const midpoint=Math.ceil(job.entryIds.length/2);const splitDepth=job.splitDepth+1;return[{...job,id:`${job.id}:a`,entryIds:job.entryIds.slice(0,midpoint),splitDepth},{...job,id:`${job.id}:b`,entryIds:job.entryIds.slice(midpoint),splitDepth}];}
export function createForgeReplacementSpec(child:ForgeSpecialistJob,parent:ForgeJobV1,ordinal:number,context="[DYNAMIC_SOURCE_CONTEXT]"):ForgeJobV1{
  if(parent.kind==="bundle5_section")return createBundleFiveJobSpec(child as BundleFiveJob,ordinal,context,parent.inputFingerprint);
  const promptHash=`sha256:${sha256Hex(canonicalizeJson(compileForgeSpecialistJobPrompt(child,"[DYNAMIC_SOURCE_CONTEXT]",null)))}`;
  return{...parent,id:child.id,ordinal,entryIds:[...child.entryIds],promptHash,splitDepth:child.splitDepth};
}
export function compileForgeSpecialistJobPrompt(job:ForgeSpecialistJob,context:string,correction:string|null){
  if(job.kind==="bundle5_section")return compileBundleFiveJobPrompt(job as BundleFiveJob,context,correction);
  const manifest={jobId:job.id,logicalBundle:job.bundleIndex+1,ownedSection:job.key,categoryId:job.categoryId,categoryLabel:job.categoryLabel,purpose:job.purpose,castTier:job.categoryId==="principal_cast"?"principal":job.categoryId==="roster_cast"?"roster":undefined,entryIds:job.entryIds};
  const assignment=`BOUNDED SPECIALIST JOB\nGenerate only the owned section and entry IDs in JOB_MANIFEST. Other entries in context are reference-only. Do not fill project-wide deficits. Use each assigned ID exactly once.\n\nMISSION\n${FORGE_CREATIVE_DEFAULTS[job.key]??"Write only the assigned runtime content."}\n\nJOB_MANIFEST\n${JSON.stringify(manifest,null,2)}\n\nSOURCE_CONTEXT\n${context}\n\nOUTPUT_SCHEMA\n${renderSchemaContract(job.schema)}`;
  return{systemInstruction:`${FORGE_PROTOCOL}\n\n${FORGE_SHARED_CONSTITUTION}\n\n${FORGE_CRAFT}`,userPrompt:correction?`${assignment}\n\n${FORGE_CORRECTION}\n${correction}`:assignment};
}
export function hashForgeSpecialistPrompt(job:ForgeSpecialistJob,context:string):string{return`sha256:${sha256Hex(canonicalizeJson(compileForgeSpecialistJobPrompt(job,context,null)))}`;}
function spec(input:{id:string;bundleIndex:number;key:ForgeJobDestinationV1;categoryId?:string;categoryLabel?:string;purpose?:string;entryIds:string[];dependencies:string[];estimatedOutputTokens:number;ordinal:number},inputFingerprint:string):ForgeJobV1{
  const shell:ForgeSpecialistJob={id:input.id,bundleIndex:input.bundleIndex,kind:"category_entries",key:input.key,categoryId:input.categoryId,categoryLabel:input.categoryLabel,purpose:input.purpose,entryIds:input.entryIds,schema:projectedSchema(input.bundleIndex,input.key),splitDepth:0};
  return{version:1,id:input.id,bundleIndex:input.bundleIndex,ordinal:input.ordinal,kind:"category_entries",destinations:[input.key],categoryId:input.categoryId,categoryLabel:input.categoryLabel,purpose:input.purpose,entryIds:[...input.entryIds],dependencies:[...input.dependencies],schemaId:`forge.bundle${input.bundleIndex+1}.${input.key}/v1`,schemaVersion:1,promptHash:`sha256:${sha256Hex(canonicalizeJson(compileForgeSpecialistJobPrompt(shell,"[DYNAMIC_SOURCE_CONTEXT]",null)))}`,inputFingerprint,estimatedOutputTokens:input.estimatedOutputTokens,splitDepth:0};
}
export function createForgeSpecialistPlan(selection:BlueprintSelectionV1,completedSections:Readonly<Record<string,unknown>>,_context:string,inputFingerprint:string){
  const allocation=allocateForgeInventory(selection,completedSections);
  if(allocation.ok===false)throw new ForgeSpecialistPlanningError(`Blueprint inventory is not feasible: ${allocation.issues.map(item=>item.code).join(", ")}.`);
  const draft=partitionForgeInventory(selection,allocation.value);
  const categories=new Map(allocation.value.categories.map(category=>[category.categoryId,category]));
  const inputs=draft.jobs.filter(job=>ENABLED_BUNDLES.has(job.bundleIndex)).map(job=>{const category=categories.get(job.categoryId)!;return{id:job.id,bundleIndex:job.bundleIndex,key:job.destinations[0] as ForgeJobDestinationV1,categoryId:job.categoryId,categoryLabel:category.categoryLabel,purpose:category.purpose,entryIds:job.entryIds,dependencies:job.dependencies,estimatedOutputTokens:job.estimatedOutputTokens,sourceOrdinal:job.ordinal};});
  for(const[key,bundleIndex]of SINGLETONS)inputs.push({id:`forge-job:${sha256Hex(`${draft.planHash}\0${key}`).slice(0,24)}`,bundleIndex,key,categoryId:undefined,categoryLabel:undefined,purpose:undefined,entryIds:[],dependencies:[],estimatedOutputTokens:800,sourceOrdinal:0});
  const ordered:ForgeJobDestinationV1[]=["core","user","worldPhysics","status","locations","factions","npcs","knowledgeMap","relationshipWeb","items","secrets","conflict","pressureProtocol","history","aesthetic","naming","pressures","additionalLore","proceduralRolls","opening","expansionNotes","antiGravity","buildNotes"];
  const priority=(key:ForgeJobDestinationV1)=>ordered.indexOf(key);
  inputs.sort((a,b)=>a.bundleIndex-b.bundleIndex||priority(a.key)-priority(b.key)||a.key.localeCompare(b.key)||a.sourceOrdinal-b.sourceOrdinal||a.id.localeCompare(b.id));
  const jobs=inputs.map((input,ordinal)=>spec({...input,ordinal},inputFingerprint));
  return{planHash:`sha256:${sha256Hex(canonicalizeJson({version:1,draftPlanHash:draft.planHash,jobs}))}`,jobs};
}

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

export interface ForgeSpecialistJob {id:string;bundleIndex:number;kind:ForgeJobV1["kind"];key:ForgeJobDestinationV1;categoryId?:string;categoryLabel?:string;purpose?:string;entryIds:string[];schema:JsonSchema;splitDepth:number}
export class ForgeSpecialistPlanningError extends Error {}
const ENABLED_BUNDLES=new Set([0,1,2,3,4,5]);
const SINGLETONS:[ForgeJobDestinationV1,number][]=[
  ["core",0],["user",0],["worldPhysics",0],["status",0],
  ["conflict",3],["pressureProtocol",3],
  ["aesthetic",4],["naming",4],
  ["proceduralRolls",5],["opening",5],["expansionNotes",5],["antiGravity",5],["buildNotes",5]
];
const MISSIONS:Partial<Record<ForgeJobDestinationV1,string>>={
  core:"Use core to express the premise's playable situation, scale, tone, and central forces. Summarize without replacing the user's distinctive premise with a stock setting. State operating conditions, not a predetermined plot or ending.",
  user:"Use user only for the player's explicitly established position and resources. Where an attribute is unspecified, state that it remains player-defined. Never invent durable player backstory, feelings, attraction, or voluntary actions.",
  worldPhysics:"Use worldPhysics for durable constraints that actually affect decisions. Include the nested rules array with semantic names, plus authorityCheck, powerCeiling, faultLines, and permanence. Do not invent supernatural mechanics if the setting is grounded.",
  status:"Use status for the initial snapshot only: what is true at the starting moment. Opening facts, current locations, active deadlines, and temporary pressures belong here, not in permanent identity or evergreen lore.",
  locations:"Write playable, concrete locations with a distinct function, mood, and specific pressure or problem. Do not invent people merely to fill a location.",
  factions:"Write autonomous organizations with public face, real agenda, independent activity, and a premise-supported stance toward the player. Do not make every faction revolve around {{user}}.",
  npcs:"Write only the assigned cast tier. Give each person a distinct role, want, embodiment, voice, contradiction, knowledge boundary, social connection, and independent activity. Do not invent player intimacy or make every want involve {{user}}.",
  relationshipWeb:"Connect only established supplied entities. Preserve direction and distinguish the public bond from its specific pressure. Include benign cooperation where appropriate; do not invent an endpoint.",
  knowledgeMap:"Separate truth from who knows, suspects, or may discover it. Preserve secret and agency boundaries. Use a concrete discovery condition without prescribing the player's future action.",
  items:"Write specific usable objects with a clear function, cost or limit, and an unresolved roleplay opportunity. Do not turn every item into a magical relic or repeat facts owned by locations and people.",
  secrets:"Write private truths with explicit keepers, concealment, a viable discovery path, and consequences. Do not leak the truth into public fields, disable earned-only discoveries, or prescribe the player's future action.",
  conflict:"Write one coherent conflict architecture: its central tension, opposition, bad and acceptable stakes, temporal clock, moral knot, potential yield, and concrete speed bumps. Define pressures rather than a guaranteed plot, and never prescribe the player's actions.",
  pressureProtocol:"Write one concise runtime guide for escalating, releasing, and recombining established pressures. Keep it procedural rather than encyclopedic, preserve player agency, and do not treat possible future events as settled canon.",
  history:"Write concrete past events and their continuing consequences. Do not turn implications into accepted player history.",
  pressures:"Write independent forces operating in the world, with scope, cost, affected parties, and temporal limits. Do not dictate future scenes or player decisions.",
  additionalLore:"Write focused runtime-useful concepts for the exact assigned category. Preserve category identity and do not regenerate entities owned elsewhere.",
  aesthetic:"Write one focused sensory and visual guide consistent with the accepted setting and tonal breadth.",
  naming:"Write one guide to the established naming register. Suggested names are examples, not established people or biographies.",
  proceduralRolls:"Write procedural roll tables as authoring and inspiration data. Tables provide relative weights and triggerKeys for dynamic events without making unsupported runtime claims.",
  opening:"Write a playable opening situation that establishes the starting scene, the first active choice, and the initial pressure without prescribing player feelings or voluntary actions. Do not leak secrets or resolve mysteries prematurely.",
  expansionNotes:"Write expansion notes defining content boundaries, tone, pacing, rating limits, and safety boundaries for long-term roleplay.",
  antiGravity:"Write anti-gravity counter-temptations to resist stock roleplay tropes, unearned intimacy, and setting erosion, keeping the world grounded.",
  buildNotes:"Write build notes as structural metadata regarding permanence routing, order bands, and format expectations. Build notes are descriptive metadata, not fake runtime enforcement.",
};

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
  if(job.entryIds.length){const entries=output[job.key]as Array<Record<string,unknown>>;if(entries.length!==job.entryIds.length)throw new ForgeValidationError(`Specialist ${job.id} returned ${entries.length} of ${job.entryIds.length} assigned entries.`);if(new Set(entries.map(entry=>entry.id)).size!==entries.length||entries.some(entry=>!job.entryIds.includes(String(entry.id))))throw new ForgeValidationError(`Specialist ${job.id} changed or duplicated assigned entry IDs.`);if(job.key==="additionalLore"&&entries.some(entry=>{const fields=entry.fields as Record<string,unknown>;return fields.categoryId!==job.categoryId||fields.categoryLabel!==job.categoryLabel;}))throw new ForgeValidationError(`Specialist ${job.id} changed its assigned category.`);const castTier=job.categoryId==="principal_cast"?"principal":job.categoryId==="roster_cast"?"roster":null;if(job.key==="npcs"&&castTier&&entries.some(entry=>(entry.fields as Record<string,unknown>)?.castTier!==castTier))throw new ForgeValidationError(`Specialist ${job.id} changed its assigned ${castTier} cast tier.`);output[job.key]=sanitizeForgeSectionEntries(job.key,entries);}
  if(job.key==="worldPhysics"&&output.worldPhysics&&typeof output.worldPhysics==="object"){const wp=output.worldPhysics as Record<string,unknown>;if(Array.isArray(wp.rules))wp.rules=sanitizeForgeSectionEntries("rules",wp.rules);}
  if(job.key==="proceduralRolls"&&output.proceduralRolls&&Array.isArray(output.proceduralRolls)){for(const group of output.proceduralRolls as Array<Record<string,unknown>>){if(Array.isArray(group.entries)){for(const entry of group.entries as Array<Record<string,unknown>>){if(typeof entry.weight==="number"&&entry.weight<0)throw new ForgeValidationError(`Specialist ${job.id} returned negative roll weight.`);}}}}
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
  const assignment=`BOUNDED SPECIALIST JOB\nGenerate only the owned section and entry IDs in JOB_MANIFEST. Other entries in context are reference-only. Do not fill project-wide deficits. Use each assigned ID exactly once.\n\nMISSION\n${MISSIONS[job.key]??"Write only the assigned runtime content."}\n\nJOB_MANIFEST\n${JSON.stringify(manifest,null,2)}\n\nSOURCE_CONTEXT\n${context}\n\nOUTPUT_SCHEMA\n${renderSchemaContract(job.schema)}`;
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
  const inputs=draft.jobs.filter(job=>ENABLED_BUNDLES.has(job.bundleIndex)&&job.bundleIndex!==0).map(job=>{const category=categories.get(job.categoryId)!;return{id:job.id,bundleIndex:job.bundleIndex,key:job.destinations[0] as ForgeJobDestinationV1,categoryId:job.categoryId,categoryLabel:category.categoryLabel,purpose:category.purpose,entryIds:job.entryIds,dependencies:job.dependencies,estimatedOutputTokens:job.estimatedOutputTokens,sourceOrdinal:job.ordinal};});
  const coreId=`forge-job:${sha256Hex(`${draft.planHash}\0core`).slice(0,24)}`;
  const userId=`forge-job:${sha256Hex(`${draft.planHash}\0user`).slice(0,24)}`;
  const physicsId=`forge-job:${sha256Hex(`${draft.planHash}\0worldPhysics`).slice(0,24)}`;
  const statusId=`forge-job:${sha256Hex(`${draft.planHash}\0status`).slice(0,24)}`;
  const openingId=`forge-job:${sha256Hex(`${draft.planHash}\0opening`).slice(0,24)}`;
  for(const[key,bundleIndex]of SINGLETONS){
    const id=key==="core"?coreId:key==="user"?userId:key==="worldPhysics"?physicsId:key==="status"?statusId:key==="opening"?openingId:`forge-job:${sha256Hex(`${draft.planHash}\0${key}`).slice(0,24)}`;
    const dependencies=key==="user"||key==="worldPhysics"?[coreId]:key==="status"?[coreId,userId,physicsId]:key==="expansionNotes"||key==="antiGravity"||key==="buildNotes"?[openingId]:[];
    inputs.push({id,bundleIndex,key,categoryId:undefined,categoryLabel:undefined,purpose:undefined,entryIds:[],dependencies,estimatedOutputTokens:800,sourceOrdinal:0});
  }
  const priority=(key:ForgeJobDestinationV1)=>{
    if(key==="core")return 0;
    if(key==="user")return 1;
    if(key==="worldPhysics")return 2;
    if(key==="status")return 3;
    if(key==="npcs")return 0;
    if(key==="relationshipWeb"||key==="knowledgeMap")return 1;
    if(key==="proceduralRolls")return 0;
    if(key==="opening")return 1;
    if(key==="expansionNotes")return 2;
    if(key==="antiGravity")return 3;
    if(key==="buildNotes")return 4;
    return 0;
  };
  inputs.sort((a,b)=>a.bundleIndex-b.bundleIndex||priority(a.key)-priority(b.key)||a.key.localeCompare(b.key)||a.sourceOrdinal-b.sourceOrdinal||a.id.localeCompare(b.id));
  const jobs=inputs.map((input,ordinal)=>spec({...input,ordinal},inputFingerprint));
  return{planHash:`sha256:${sha256Hex(canonicalizeJson({version:1,draftPlanHash:draft.planHash,jobs}))}`,jobs};
}

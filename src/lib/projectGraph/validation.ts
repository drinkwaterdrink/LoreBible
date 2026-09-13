import { PROJECT_GRAPH_SCHEMA, USER_AGENCY_RESERVATIONS, type ProjectGraphV1 } from "../../contracts/projectGraph";
import { canonicalizeJson } from "./canonicalJson";
import { deriveForgeSectionsFromCategoryRecords } from "./forgeCategoryRecords";

export type ProjectGraphParseResult = { ok: true; value: ProjectGraphV1 } | { ok: false; issues: Array<{ path: string; message: string }> };
const record = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const nullableString=(value:unknown)=>value===null||typeof value==="string";
function validForgeProjection(value:unknown){if(!record(value)||typeof value.kind!=="string")return false;if(value.kind==="entity")return["character","location","faction","organization","item","system","event","culture","species","concept","other"].includes(value.entityType)&&nullableString(value.name)&&["principal","roster","unclassified"].includes(value.castTier)&&nullableString(value.independentGoal)&&nullableString(value.independentActivity);if(value.kind==="relationship")return nullableString(value.sourceName)&&nullableString(value.targetName)&&nullableString(value.publicDynamic)&&nullableString(value.tension)&&nullableString(value.direction);if(value.kind==="knowledge")return nullableString(value.truth)&&nullableString(value.knownBy)&&nullableString(value.suspectedBy)&&nullableString(value.surfacesWhen);if(value.kind==="temporal_fact")return["historical","current"].includes(value.temporalClass)&&nullableString(value.label)&&nullableString(value.timing)&&nullableString(value.consequence);return false;}

export function parseProjectGraph(value: unknown): ProjectGraphParseResult {
  const issues: Array<{ path: string; message: string }> = [];
  if (!record(value)) return { ok: false, issues: [{ path: "", message: "Expected an object." }] };
  if (value.schema !== PROJECT_GRAPH_SCHEMA) issues.push({ path: "schema", message: "Unsupported Project Graph schema." });
  if (!record(value.project) || typeof value.project.id !== "string") issues.push({ path: "project", message: "Project identity is required." });
  if (!record(value.agency) || value.agency.protectedSubject !== "{{user}}" || JSON.stringify(value.agency.reserved) !== JSON.stringify(USER_AGENCY_RESERVATIONS)) issues.push({ path: "agency.reserved", message: "The complete user-agency reservation set is required." });
  const collections = ["canon", "entities", "relationships", "knowledge", "temporalSnapshots", "ownership", "sources", "dependencies", "artifacts", "builds", "decisions", "unresolved"] as const;
  for (const key of collections) if (!Array.isArray(value[key])) issues.push({ path: key, message: "Expected an array." });
  if (!record(value.validation) || !Array.isArray(value.validation.findings)) issues.push({ path: "validation", message: "Validation ledger is required." });
  if (!record(value.extensions)) issues.push({ path: "extensions", message: "Extensions must be an object." });
  if (issues.length) return { ok: false, issues };

  const ids = new Map<string, string>();
  for (const key of collections) for (const [index, item] of (value[key] as any[]).entries()) {
    if (!record(item) || typeof item.id !== "string" || !item.id) { issues.push({ path: `${key}[${index}].id`, message: "Stable ID is required." }); continue; }
    if (ids.has(item.id)) issues.push({ path: `${key}[${index}].id`, message: `Duplicate stable ID also used at ${ids.get(item.id)}.` });
    else ids.set(item.id, `${key}[${index}].id`);
  }
  const entityIds = new Set((value.entities as any[]).map((item) => item.id));
  const factIds = new Set((value.canon as any[]).map((item) => item.id));
  const artifactIds = new Set((value.artifacts as any[]).map((item) => item.id));
  (value.builds as any[]).forEach((item, index) => {
    if (item?.kind !== "forge") return;
    const prefix = `builds[${index}]`;
    if (item.schema !== "lorebible.forge-build/v1") issues.push({ path: `${prefix}.schema`, message: "Unsupported Forge build schema." });
    if (!Number.isSafeInteger(item.sourceRevision) || item.sourceRevision < 1 || !Number.isSafeInteger(item.lastTransitionRevision) || item.lastTransitionRevision <= item.sourceRevision || typeof item.inputFingerprint !== "string" || !item.inputFingerprint) issues.push({ path: prefix, message: "Forge source identity is invalid." });
    if (!Array.isArray(item.batches) || item.batches.length !== 6) issues.push({ path: `${prefix}.batches`, message: "Forge build requires six ordered bundle records." });
    if (!record(item.checkpoint) || !Number.isSafeInteger(item.checkpoint.completedBundleCount) || !record(item.checkpoint.sections)) issues.push({ path: `${prefix}.checkpoint`, message: "Forge checkpoint is invalid." });
    if (Array.isArray(item.batches)) item.batches.forEach((batch:any,batchIndex:number)=>{
      if (!record(batch) || batch.index !== batchIndex || !Array.isArray(batch.expectedKeys) || !Array.isArray(batch.attempts) || !record(batch.sections)) issues.push({ path: `${prefix}.batches[${batchIndex}]`, message: "Forge bundle record is invalid." });
    });
    if(Array.isArray(item.batches)&&record(item.checkpoint)&&record(item.checkpoint.sections)){
      let completed=0;let gap=false;const merged:Record<string,unknown>={};
      for(const batch of item.batches){if(batch?.status==="complete"){if(gap){issues.push({path:`${prefix}.batches`,message:"Completed Forge bundles must be contiguous."});break;}completed++;if(record(batch.sections))Object.assign(merged,batch.sections);}else gap=true;}
      if(item.checkpoint.completedBundleCount!==completed||canonicalizeJson(item.checkpoint.sections)!==canonicalizeJson(merged))issues.push({path:`${prefix}.checkpoint`,message:"Forge checkpoint does not match its completed bundle records."});
    }
    if(item.categoryRecords!==undefined){if(!Array.isArray(item.categoryRecords))issues.push({path:`${prefix}.categoryRecords`,message:"Forge category records must be an array."});else{const recordIds=new Set<string>();let validCategoryRecords=true;for(const[recordIndex,candidate]of item.categoryRecords.entries()){const path=`${prefix}.categoryRecords[${recordIndex}]`;const valid=record(candidate)&&typeof candidate.id==="string"&&candidate.id.length>0&&candidate.schema==="lorebible.forge-category-record/v1"&&candidate.buildId===item.id&&candidate.status==="proposed"&&candidate.origin==="generated"&&typeof candidate.sectionKey==="string"&&typeof candidate.categoryId==="string"&&Number.isSafeInteger(candidate.bundleIndex)&&Number.isSafeInteger(candidate.ordinal);if(!valid){validCategoryRecords=false;issues.push({path,message:"Forge category record is invalid."});continue;}if(candidate.projection!==undefined&&!validForgeProjection(candidate.projection)){validCategoryRecords=false;issues.push({path:`${path}.projection`,message:"Forge specialist projection is invalid."});}if(recordIds.has(candidate.id))issues.push({path:`${path}.id`,message:"Duplicate Forge category record ID."});recordIds.add(candidate.id);}if(validCategoryRecords&&record(item.checkpoint)&&record(item.checkpoint.sections)&&canonicalizeJson(deriveForgeSectionsFromCategoryRecords(item.categoryRecords))!==canonicalizeJson(item.checkpoint.sections))issues.push({path:`${prefix}.categoryRecords`,message:"Forge category records do not derive the accepted checkpoint."});}}
  });
  (value.canon as any[]).forEach((item, index) => { if (!entityIds.has(item.subjectId)) issues.push({ path: `canon[${index}].subjectId`, message: "Unknown entity." }); });
  (value.entities as any[]).forEach((item, index) => (item.factIds || []).forEach((id: string) => { if (!factIds.has(id)) issues.push({ path: `entities[${index}].factIds`, message: `Unknown fact ${id}.` }); }));
  (value.relationships as any[]).forEach((item, index) => {
    if (!entityIds.has(item.sourceEntityId)) issues.push({ path: `relationships[${index}].sourceEntityId`, message: "Unknown source entity." });
    if (!entityIds.has(item.targetEntityId)) issues.push({ path: `relationships[${index}].targetEntityId`, message: "Unknown target entity." });
    if (item.sourceEntityId === item.targetEntityId) issues.push({ path: `relationships[${index}]`, message: "Relationship must be directional between distinct entities." });
  });
  (value.knowledge as any[]).forEach((item, index) => {
    if (!entityIds.has(item.entityId)) issues.push({ path: `knowledge[${index}].entityId`, message: "Unknown entity." });
    if (!factIds.has(item.factId)) issues.push({ path: `knowledge[${index}].factId`, message: "Unknown fact." });
  });
  (value.dependencies as any[]).forEach((item, index) => {
    if (!artifactIds.has(item.fromId)) issues.push({ path: `dependencies[${index}].fromId`, message: "Unknown artifact." });
    if (!artifactIds.has(item.toId)) issues.push({ path: `dependencies[${index}].toId`, message: "Unknown artifact." });
  });
  return issues.length ? { ok: false, issues } : { ok: true, value: value as unknown as ProjectGraphV1 };
}

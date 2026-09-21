import type { ForgeJobV1, ForgeSpecialistLedgerV1 } from "../../contracts/projectGraph";
import { canonicalizeJson } from "./canonicalJson";

export class ForgeSpecialistError extends Error {}
const arrayKeys = new Set(["locations","factions","npcs","relationshipWeb","knowledgeMap","items","secrets","history", "pressures", "additionalLore"]);
const keys = new Set([...arrayKeys,"aesthetic","naming"]);
const requiredFields: Record<string, readonly string[]> = {
  locations:["name","function","mood","whatsWrong"],factions:["name","publicFace","trueAgenda","independentWant","stanceTowardUser"],
  npcs:["name","role","wants","body","voice","notDefault","holds","connection","castTier","independentActivity"],relationshipWeb:["source","target","bond","pressure","relation"],knowledgeMap:["truth","knows","suspects","surfacesWhen"],
  items:["name","whatItDoes","costOrLimit","unfiredGun"],secrets:["name","truth","whoKeepsIt","howKept","discoveryTrigger","whatItChanges"],history:["name","event","era","consequence"], pressures:["name","force","scope","clock"], additionalLore:["categoryId","categoryLabel","name","content"]
};
const requiredSingletonFields: Record<string, readonly string[]> = { aesthetic:["colors","sounds","smells","weather","visualMotifs","fashion","touchstones","permanence"], naming:["linguisticBase","commonNames","eliteNames","placeNamePattern","permanence"] };
const clone = (ledger: ForgeSpecialistLedgerV1) => structuredClone(ledger);
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
const find = (ledger: ForgeSpecialistLedgerV1, id: string) => {
  const item = ledger.jobs.find(candidate => candidate.job.id === id);
  if (!item) throw new ForgeSpecialistError(`Forge specialist job ${id} was not found.`);
  return item;
};

export function validateForgeSpecialistJob(job: ForgeJobV1, inputFingerprint: string): void {
  if (job.version !== 1 || !Number.isSafeInteger(job.bundleIndex) || job.bundleIndex < 1 || job.bundleIndex > 4 || !["category_entries","bundle5_section"].includes(job.kind) || job.destinations.length !== 1 || !keys.has(job.destinations[0]) ||
    !job.id || !job.schemaId || job.schemaVersion !== 1 || !job.promptHash || job.inputFingerprint !== inputFingerprint ||
    !Number.isSafeInteger(job.ordinal) || job.ordinal < 0 || !Number.isSafeInteger(job.splitDepth) || job.splitDepth < 0 || job.splitDepth > 2 ||
    !Number.isSafeInteger(job.estimatedOutputTokens) || job.estimatedOutputTokens < 0 || !Array.isArray(job.entryIds) || !Array.isArray(job.dependencies) ||
    new Set(job.entryIds).size !== job.entryIds.length || job.entryIds.some(id => typeof id !== "string" || !id)) throw new ForgeSpecialistError("Forge specialist job contract is invalid.");
  if (arrayKeys.has(job.destinations[0]) && !job.entryIds.length) throw new ForgeSpecialistError("Array specialist job needs assigned entry slots.");
  if (!arrayKeys.has(job.destinations[0]) && job.entryIds.length) throw new ForgeSpecialistError("Singleton specialist job cannot own entry slots.");
  if (job.destinations[0] === "additionalLore" && (!job.categoryId || !job.categoryLabel)) throw new ForgeSpecialistError("Supplemental specialist job needs exact category identity.");
}

export function createSpecialistLedger(input: { planHash: string; inputFingerprint: string; jobs: ForgeJobV1[] }): ForgeSpecialistLedgerV1 {
  if (!input.planHash || !input.inputFingerprint || !input.jobs.length) throw new ForgeSpecialistError("Forge specialist plan identity is required.");
  const ids = new Set<string>();
  const entryIds = new Set<string>();
  const ordinals = new Set<number>();
  for (const job of input.jobs) {
    validateForgeSpecialistJob(job, input.inputFingerprint);
    if (ids.has(job.id) || ordinals.has(job.ordinal) || job.entryIds.some(id => entryIds.has(id))) throw new ForgeSpecialistError("Forge specialist job IDs, ordinals, or entry IDs are duplicated.");
    ids.add(job.id); ordinals.add(job.ordinal);
    job.entryIds.forEach(id => entryIds.add(id));
  }
  for (const job of input.jobs) if (job.dependencies.some(id => !ids.has(id) || id === job.id)) throw new ForgeSpecialistError("Forge specialist dependency is invalid.");
  return { version: 1, planHash: input.planHash, inputFingerprint: input.inputFingerprint, jobs: input.jobs.map(job => ({ job: structuredClone(job), status: "pending", attempts: [] })) };
}

export function beginSpecialistJob(ledger: ForgeSpecialistLedgerV1, input: { jobId: string; attemptId: string; provider: string; modelId: string; promptHash: string; startedAt: string }): ForgeSpecialistLedgerV1 {
  const next = clone(ledger); const item = find(next, input.jobId);
  if (!["pending", "failed", "cancelled"].includes(item.status) || !input.attemptId || item.attempts.some(attempt => attempt.id === input.attemptId) || !input.promptHash.startsWith("sha256:") || (item.job.kind==="bundle5_section"&&input.promptHash !== item.job.promptHash) ||
    item.job.dependencies.some(id => find(next, id).status !== "complete")) throw new ForgeSpecialistError("Forge specialist job is not ready for this attempt.");
  item.status = "active";
  item.attempts.push({ id: input.attemptId, status: "active", provider: input.provider, modelId: input.modelId, promptHash: input.promptHash, startedAt: input.startedAt });
  return next;
}

export function validateOwnedSpecialistSections(job: ForgeJobV1, sections: Record<string, unknown>): void {
  const key = job.destinations[0];
  if (!record(sections) || Object.keys(sections).length !== 1 || !Object.hasOwn(sections, key)) throw new ForgeSpecialistError("Forge specialist returned unowned sections.");
  const value = sections[key];
  if (!arrayKeys.has(key)) {
    if (!record(value)) throw new ForgeSpecialistError("Forge singleton specialist output is invalid.");
    const fields=requiredSingletonFields[key]??[];
    if(fields.some(field=>!Object.hasOwn(value,field))||key==="aesthetic"&&(["colors","sounds","smells","visualMotifs","touchstones"].some(field=>!Array.isArray(value[field])))||key==="naming"&&(["commonNames","eliteNames"].some(field=>!Array.isArray(value[field]))))throw new ForgeSpecialistError("Forge singleton specialist output failed its projected schema.");
    return;
  }
  if (!Array.isArray(value) || value.length !== job.entryIds.length) throw new ForgeSpecialistError("Forge specialist entry count does not match assigned slots.");
  const assigned = new Set(job.entryIds);
  const seen = new Set<string>();
  for (const entry of value) {
    if (!record(entry) || typeof entry.id !== "string" || !assigned.has(entry.id) || seen.has(entry.id)) throw new ForgeSpecialistError("Forge specialist entry IDs do not match assigned slots.");
    seen.add(entry.id);
    if(!record(entry.fields)||requiredFields[key].some(field=>typeof entry.fields[field]!=="string"||!entry.fields[field].trim())||!Array.isArray(entry.keys)||!entry.keys.length||entry.keys.some(candidate=>typeof candidate!=="string"||!candidate.trim())||typeof entry.permanence!=="string"||typeof entry.locked!=="boolean")throw new ForgeSpecialistError("Forge specialist entry failed its projected schema.");
    if (key === "additionalLore" && (!record(entry.fields) || entry.fields.categoryId !== job.categoryId || entry.fields.categoryLabel !== job.categoryLabel)) throw new ForgeSpecialistError("Forge specialist category identity changed.");
  }
}

export function completeSpecialistJob(ledger: ForgeSpecialistLedgerV1, input: { jobId: string; attemptId: string; commandId: string; sections: Record<string, unknown>; completedAt: string }): ForgeSpecialistLedgerV1 {
  const next = clone(ledger); const item = find(next, input.jobId);
  if (item.acceptedCommandId === input.commandId && item.status === "complete" && canonicalizeJson(item.sections) === canonicalizeJson(input.sections)) return next;
  const attempt = item.attempts.find(candidate => candidate.id === input.attemptId);
  if (item.status !== "active" || !attempt || attempt.status !== "active" || !input.commandId) throw new ForgeSpecialistError("Only an active specialist attempt can complete its job.");
  validateOwnedSpecialistSections(item.job, input.sections);
  item.sections = structuredClone(input.sections); item.acceptedCommandId = input.commandId; item.status = "complete";
  attempt.status = "complete"; attempt.endedAt = input.completedAt;
  return next;
}

export function stopSpecialistJob(ledger: ForgeSpecialistLedgerV1, input: { jobId: string; attemptId: string; status: "failed" | "cancelled"; failureCode?: string; stoppedAt: string }): ForgeSpecialistLedgerV1 {
  const next = clone(ledger); const item = find(next, input.jobId); const attempt = item.attempts.find(candidate => candidate.id === input.attemptId);
  if (item.status !== "active" || !attempt || attempt.status !== "active") throw new ForgeSpecialistError("Only an active specialist attempt can stop its job.");
  item.status = input.status; attempt.status = input.status; attempt.endedAt = input.stoppedAt;
  if (input.failureCode) attempt.failureCode = input.failureCode;
  return next;
}

export function replaceSpecialistJob(ledger: ForgeSpecialistLedgerV1, input: { jobId: string; attemptId: string; children: ForgeJobV1[]; replacedAt: string }): ForgeSpecialistLedgerV1 {
  const next = clone(ledger); const item = find(next, input.jobId); const attempt = item.attempts.find(candidate => candidate.id === input.attemptId);
  if (item.status !== "active" || !attempt || attempt.status !== "active" || item.job.entryIds.length < 2 || item.job.splitDepth >= 2 || input.children.length !== 2) throw new ForgeSpecialistError("Forge specialist job cannot be replaced.");
  const owned = item.job.entryIds;
  const replacement = input.children.flatMap(child => child.entryIds);
  const existingOrdinals=new Set(next.jobs.filter(existing=>existing!==item).map(existing=>existing.job.ordinal));
  if (canonicalizeJson(owned) !== canonicalizeJson(replacement) || input.children.some(child => {
    validateForgeSpecialistJob(child, next.inputFingerprint);
    return child.destinations[0] !== item.job.destinations[0] || child.categoryId !== item.job.categoryId || child.categoryLabel !== item.job.categoryLabel || child.splitDepth !== item.job.splitDepth + 1;
  }) || input.children.some(child => next.jobs.some(existing => existing.job.id === child.id)||existingOrdinals.has(child.ordinal)) || new Set(input.children.map(child=>child.ordinal)).size!==input.children.length) throw new ForgeSpecialistError("Replacement jobs must exactly partition the parent's slots and ownership with unique ordering.");
  const index = next.jobs.indexOf(item);
  item.status = "superseded"; item.replacementJobIds = input.children.map(child => child.id);
  attempt.status = "failed"; attempt.failureCode = "INVALID_STRUCTURED_OUTPUT"; attempt.endedAt = input.replacedAt;
  next.jobs.splice(index + 1, 0, ...input.children.map(job => ({ job: structuredClone(job), status: "pending" as const, attempts: [] })));
  return next;
}

export function mergeSpecialistJobs(ledger: ForgeSpecialistLedgerV1, bundleIndex?: number): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const item of ledger.jobs) {
    if (bundleIndex !== undefined && item.job.bundleIndex !== bundleIndex) continue;
    if (item.status === "superseded") continue;
    if (item.status !== "complete" || !item.sections) throw new ForgeSpecialistError("Forge specialist bundle has unfinished jobs.");
    const key = item.job.destinations[0];
    validateOwnedSpecialistSections(item.job, item.sections);
    const value = item.sections[key];
    if (arrayKeys.has(key)) merged[key] = [...((merged[key] as unknown[] | undefined) ?? []), ...(value as unknown[])];
    else if (Object.hasOwn(merged, key)) throw new ForgeSpecialistError("Forge singleton section has multiple owners.");
    else merged[key] = structuredClone(value);
  }
  return merged;
}

import type { ForgeBuildRecordV1, ProjectGraphV1 } from "../../contracts/projectGraph";
import { FORGE_BUNDLE_KEYS, type ForgeExecutionMode } from "../../../server/generation/forgeResume";
import { deriveForgeSectionsFromCategoryRecords, projectForgeSections } from "./forgeCategoryRecords";

const BUNDLE_NAMES = [
  "Core, User, World Physics, and Status",
  "Locations and Factions",
  "NPCs, Relationship Web, and Knowledge Map",
  "Items, Secrets, Conflict, and Pressure Protocol",
  "History, Aesthetic, Naming, and Pressures",
  "Procedural Rolls, Opening, Expansion Notes, Anti-Gravity, and Build Notes",
] as const;

export class ForgeBuildError extends Error {
  constructor(message: string, public code: "invalid_build" | "stale_input" | "invalid_transition" | "invalid_sections") {
    super(message);
    this.name = "ForgeBuildError";
  }
}

const PROVIDERS=new Set(["gemini","openrouter","nanogpt","environment_gemini"]);
const ROUTES=new Set(["gemini_native","openai_compatible","legacy_environment"]);
const DIAGNOSTICS:Record<string,string>={RATE_LIMITED:"The provider rate limit interrupted this Forge attempt.",QUOTA_EXHAUSTED:"The provider quota interrupted this Forge attempt.",REQUEST_TIMEOUT:"The provider timed out during this Forge attempt.",INVALID_STRUCTURED_OUTPUT:"The provider output could not be accepted for this Forge bundle.",CLIENT_DISCONNECTED:"The Forge request was disconnected.",MODEL_UNAVAILABLE:"The selected model was unavailable.",AUTHENTICATION_FAILED:"The provider rejected authentication.",PROVIDER_UNAVAILABLE:"The provider was unavailable.",PROVIDER_ERROR:"The provider rejected this Forge attempt.",INTERNAL_ERROR:"LoreBible could not complete this Forge attempt."};
function safeAttemptId(value:string){if(!/^[a-z0-9._:/-]{1,100}$/i.test(value))throw new ForgeBuildError("Forge attempt ID is invalid.","invalid_build");return value;}
function safeModelId(value:string){if(!/^[a-z0-9][a-z0-9._:/()-]{0,199}$/i.test(value)||(value.length>20&&!/[-_./:]/.test(value))||/^(?:AIza|sk-|gsk_|hf_|xai-|nvapi-)/i.test(value))throw new ForgeBuildError("Forge model ID is not a safe model identifier.","invalid_build");return value;}
function safeProvider(value:string){if(!PROVIDERS.has(value))throw new ForgeBuildError("Forge provider is not recognized.","invalid_build");return value;}
function safeRoute(value:string){if(!ROUTES.has(value))throw new ForgeBuildError("Forge route is not recognized.","invalid_build");return value;}
function safeDiagnostic(code:string){const safeCode=Object.hasOwn(DIAGNOSTICS,code)?code:"PROVIDER_ERROR";return{code:safeCode,message:DIAGNOSTICS[safeCode]};}

function clone(build: ForgeBuildRecordV1): ForgeBuildRecordV1 { return structuredClone(build); }
function batchAt(build: ForgeBuildRecordV1, index: number) {
  const batch = build.batches[index];
  if (!batch || batch.index !== index) throw new ForgeBuildError(`Forge bundle ${index + 1} does not exist.`, "invalid_build");
  return batch;
}

export function createForgeBuild(input: { id: string; sourceRevision: number; inputFingerprint: string; executionMode: ForgeExecutionMode; createdAt: string }): ForgeBuildRecordV1 {
  if (!input.id.trim() || !Number.isSafeInteger(input.sourceRevision) || input.sourceRevision < 1 || !input.inputFingerprint.trim()) throw new ForgeBuildError("Forge build identity, source revision, and input fingerprint are required.", "invalid_build");
  return {
    id: input.id, kind: "forge", schema: "lorebible.forge-build/v1", stage: "forge", status: "pending", artifactIds: [],
    sourceRevision: input.sourceRevision, lastTransitionRevision: input.sourceRevision + 1, executionMode: input.executionMode, inputFingerprint: input.inputFingerprint,
    createdAt: input.createdAt, updatedAt: input.createdAt,
    batches: FORGE_BUNDLE_KEYS.map((keys, index) => ({ index, name: BUNDLE_NAMES[index], expectedKeys: [...keys], status: "pending", sections: {}, attempts: [], acceptedCommandId: null })),
    categoryRecords: [],
    checkpoint: { completedBundleCount: 0, sections: {} },
  };
}

export function resumeForgeBuild(build: ForgeBuildRecordV1, inputFingerprint: string, sourceRevision: number) {
  if (build.schema !== "lorebible.forge-build/v1" || build.batches.length !== FORGE_BUNDLE_KEYS.length) throw new ForgeBuildError("Forge build record is invalid.", "invalid_build");
  if (build.inputFingerprint !== inputFingerprint) throw new ForgeBuildError("Forge input fingerprint no longer matches this build.", "stale_input");
  if (build.sourceRevision !== sourceRevision) throw new ForgeBuildError("Forge source revision no longer matches this build.", "stale_input");
  const nextBundleIndex = build.batches.findIndex((batch) => batch.status !== "complete");
  return { nextBundleIndex: nextBundleIndex < 0 ? build.batches.length : nextBundleIndex, complete: nextBundleIndex < 0, sections: structuredClone(build.checkpoint.sections) };
}

export function beginForgeBatch(build: ForgeBuildRecordV1, input: { bundleIndex: number; attemptId: string; provider: string; modelId: string; route: string; startedAt: string }): ForgeBuildRecordV1 {
  const next = clone(build); const batch = batchAt(next, input.bundleIndex);
  const firstIncomplete = next.batches.findIndex((item) => item.status !== "complete");
  if (firstIncomplete !== input.bundleIndex || !["pending", "failed", "cancelled"].includes(batch.status)) throw new ForgeBuildError("Forge bundles must start in order from a pending or retryable state.", "invalid_transition");
  if (!input.attemptId.trim() || batch.attempts.some((attempt) => attempt.id === input.attemptId)) throw new ForgeBuildError("Forge attempt ID must be new and non-empty.", "invalid_transition");
  batch.status = "active"; batch.attempts.push({ id: safeAttemptId(input.attemptId), provider: safeProvider(input.provider), modelId: safeModelId(input.modelId), route: safeRoute(input.route), status: "active", startedAt: input.startedAt, finishedAt: null });
  next.status = "active"; next.updatedAt = input.startedAt; return next;
}

export function completeForgeBatch(build: ForgeBuildRecordV1, input: { bundleIndex: number; attemptId: string; commandId: string; sections: Record<string, unknown>; completedAt: string }): ForgeBuildRecordV1 {
  const existing = batchAt(build, input.bundleIndex);
  if (existing.acceptedCommandId === input.commandId) return clone(build);
  const next = clone(build); const batch = batchAt(next, input.bundleIndex);
  const attempt = batch.attempts.find((item) => item.id === input.attemptId);
  if (batch.status !== "active" || !attempt || attempt.status !== "active") throw new ForgeBuildError("Only the active Forge attempt can complete its bundle.", "invalid_transition");
  for (const key of batch.expectedKeys) if (!Object.hasOwn(input.sections, key)) throw new ForgeBuildError(`Forge bundle is missing ${key}.`, "invalid_sections");
  const extra = Object.keys(input.sections).filter((key) => !batch.expectedKeys.includes(key));
  if (extra.length) throw new ForgeBuildError(`Forge bundle contains unexpected section ${extra[0]}.`, "invalid_sections");
  batch.sections = structuredClone(input.sections); batch.status = "complete"; batch.acceptedCommandId = input.commandId;
  attempt.status = "complete"; attempt.finishedAt = input.completedAt;
  next.categoryRecords=next.batches.flatMap(item=>item.status==="complete"?projectForgeSections(next.id,item.index,item.sections):[]);
  next.checkpoint.sections=deriveForgeSectionsFromCategoryRecords(next.categoryRecords);
  next.checkpoint.completedBundleCount = next.batches.filter((item) => item.status === "complete").length;
  next.status = next.checkpoint.completedBundleCount === next.batches.length ? "complete" : "active"; next.updatedAt = input.completedAt; return next;
}

export function failForgeBatch(build: ForgeBuildRecordV1, input: { bundleIndex: number; attemptId: string; code: string; message: string; failedAt: string }): ForgeBuildRecordV1 {
  const next = clone(build); const batch = batchAt(next, input.bundleIndex); const attempt = batch.attempts.find((item) => item.id === input.attemptId);
  if (batch.status !== "active" || !attempt || attempt.status !== "active") throw new ForgeBuildError("Only the active Forge attempt can fail its bundle.", "invalid_transition");
  attempt.status = "failed"; attempt.finishedAt = input.failedAt; attempt.diagnostic = safeDiagnostic(input.code);
  batch.status = "failed"; next.status = "failed"; next.updatedAt = input.failedAt; return next;
}

export function cancelForgeBatch(build: ForgeBuildRecordV1, input: { bundleIndex: number; attemptId: string; cancelledAt: string }): ForgeBuildRecordV1 {
  const next = clone(build); const batch = batchAt(next, input.bundleIndex); const attempt = batch.attempts.find((item) => item.id === input.attemptId);
  if (batch.status !== "active" || !attempt || attempt.status !== "active") throw new ForgeBuildError("Only the active Forge attempt can be cancelled.", "invalid_transition");
  attempt.status = "cancelled"; attempt.finishedAt = input.cancelledAt; batch.status = "cancelled"; next.status = "cancelled"; next.updatedAt = input.cancelledAt; return next;
}

export function findRecoverableForgeBuild(graph:ProjectGraphV1,inputFingerprint:string){const build=[...graph.builds].reverse().find((item)=>item.kind==="forge"&&(item as ForgeBuildRecordV1).schema==="lorebible.forge-build/v1"&&(item as ForgeBuildRecordV1).inputFingerprint===inputFingerprint)as ForgeBuildRecordV1|undefined;if(!build)return null;return{buildId:build.id,status:build.status,completedBundleCount:build.checkpoint.completedBundleCount,totalBundleCount:build.batches.length,sections:structuredClone(build.checkpoint.sections),diagnostic:[...build.batches].reverse().flatMap(batch=>[...batch.attempts].reverse()).find(attempt=>attempt.status==="failed")?.diagnostic??null};}

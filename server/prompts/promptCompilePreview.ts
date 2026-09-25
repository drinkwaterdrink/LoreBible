import type { BlueprintSelectionV1 } from "../../src/contracts/blueprintSelection.js";
import type { PromptOverrideV1, PromptProfileV1 } from "../../src/contracts/prompts.js";
import { canonicalizeJson, sha256Hex } from "../../src/lib/projectGraph/canonicalJson.js";
import { getForgePromptFeatureId, getPromptRegistryEntry } from "../../src/lib/prompts/registry.js";
import { resolvePromptSnapshot } from "../../src/lib/prompts/resolve.js";
import { createForgeBlueprintBrief, formatForgeBlueprintBrief } from "../generation/forgeBlueprintBrief.js";
import { compileForgeSpecialistJobPrompt, createForgeSpecialistPlan, hashForgeSpecialistPrompt, hydrateForgeSpecialistJob, type ForgeSpecialistJob } from "../generation/forgeSpecialistPlan.js";

export interface PromptCompilePreview {
  featureId: string;
  jobId: string;
  schemaId: string;
  snapshotHash: string;
  promptHash: string;
  systemInstruction: string;
  userPrompt: string;
  disclosure: { includesPrivateProjectContext: true; generationPerformed: false; manuscriptMutated: false };
}

export interface PreparedPromptCompilation { preview: PromptCompilePreview; specialist: ForgeSpecialistJob }

export function preparePromptCompilation(input: {
  featureId: string;
  profile: PromptProfileV1 | null;
  projectOverrides: readonly PromptOverrideV1[];
  selection: BlueprintSelectionV1;
  sourceContext: string;
}): PreparedPromptCompilation {
  getPromptRegistryEntry(input.featureId);
  const brief = createForgeBlueprintBrief(input.selection);
  if (!brief) throw new TypeError("An accepted Blueprint is required for compiled prompt preview.");
  const context = `${input.sourceContext}\n\n${formatForgeBlueprintBrief(brief)}`;
  const inputFingerprint = `sha256:${sha256Hex(canonicalizeJson({ selection: input.selection, sourceContext: input.sourceContext }))}`;
  const plan = createForgeSpecialistPlan(input.selection, {}, context, inputFingerprint);
  const job = plan.jobs.find((candidate) => getForgePromptFeatureId(candidate.destinations[0]) === input.featureId);
  if (!job) throw new TypeError(`The accepted Blueprint does not schedule ${input.featureId}.`);
  const snapshot = resolvePromptSnapshot({ profile: input.profile, projectOverrides: input.projectOverrides });
  const specialist = hydrateForgeSpecialistJob(job);
  const compiled = compileForgeSpecialistJobPrompt(specialist, context, null, snapshot);
  return { specialist, preview: {
    featureId: input.featureId,
    jobId: job.id,
    schemaId: job.schemaId,
    snapshotHash: snapshot.hash,
    promptHash: hashForgeSpecialistPrompt(specialist, context, snapshot),
    systemInstruction: compiled.systemInstruction,
    userPrompt: compiled.userPrompt,
    disclosure: { includesPrivateProjectContext: true, generationPerformed: false, manuscriptMutated: false },
  } };
}

export function compilePromptPreview(input: Parameters<typeof preparePromptCompilation>[0]): PromptCompilePreview {
  return preparePromptCompilation(input).preview;
}

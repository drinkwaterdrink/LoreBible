import type { JsonSchema } from "../../src/contracts/generation.js";
import { sha256Hex } from "../../src/lib/projectGraph/canonicalJson.js";
import { FORGE_BUNDLE_DEFINITIONS } from "./forgeSchemas.js";
import type { ForgeCoveragePlan } from "./forgeCoveragePlan.js";
import { countForgeTotalEntries } from "./forgeCoveragePlan.js";
import { ForgeValidationError } from "./forgeCandidate.js";
import { validateSchemaValue } from "./schemaContract.js";
import { FORGE_PROTOCOL, FORGE_SHARED_CONSTITUTION, FORGE_CRAFT, FORGE_CORRECTION } from "./prompts/forgeDefaults.js";
import { renderSchemaContract } from "./schemaContract.js";
import { sanitizeForgeSectionEntries } from "./forgeValidation.js";

export type BundleFiveKey = "history" | "aesthetic" | "naming" | "pressures" | "additionalLore";
export interface BundleFiveJob {
  id: string;
  key: BundleFiveKey;
  categoryId?: string;
  categoryLabel?: string;
  purpose?: string;
  entryIds: string[];
  schema: JsonSchema;
  splitDepth?: number;
}
export function splitBundleFiveJob(job: BundleFiveJob): [BundleFiveJob, BundleFiveJob] | null {
  if (job.entryIds.length < 2 || (job.splitDepth ?? 0) >= 2) return null;
  const midpoint = Math.ceil(job.entryIds.length / 2);
  const depth = (job.splitDepth ?? 0) + 1;
  return [
    { ...job, id: `${job.id}:a`, entryIds: job.entryIds.slice(0, midpoint), splitDepth: depth },
    { ...job, id: `${job.id}:b`, entryIds: job.entryIds.slice(midpoint), splitDepth: depth },
  ];
}
export class BundleFivePlanningError extends Error {}

const ARRAY_KEYS = new Set<BundleFiveKey>(["history", "pressures", "additionalLore"]);
const bundleSchema = FORGE_BUNDLE_DEFINITIONS[4].schema;

function projectedSchema(key: BundleFiveKey): JsonSchema {
  const property = bundleSchema.properties?.[key];
  if (!property) throw new Error(`Bundle 5 schema has no ${key} property.`);
  return { type: "object", properties: { [key]: property }, required: [key] };
}

/** Conservative, bounded R2 bridge. Existing completed bundles remain immutable. */
export function planBundleFiveJobs(plan: ForgeCoveragePlan, previousDocument: Record<string, unknown>): BundleFiveJob[] {
  const jobs: BundleFiveJob[] = [];
  const planned = plan.categories.filter(category => !category.forbidden && (category.destination === "history" || category.destination === "pressures" || category.destination === "additionalLore"));
  const previousCount = countForgeTotalEntries(previousDocument);
  const minimum = planned.reduce((sum, category) => sum + category.range.min, 0);
  if (previousCount + minimum > plan.total.max) {
    throw new BundleFivePlanningError("The selected Blueprint cannot fit its required Bundle 5 entries within the lorebook maximum. Completed bundles were preserved; adjust Blueprint coverage before retrying.");
  }
  const targets = new Map(planned.map(category => [category.id, category.range.min]));
  const idealSum = planned.reduce((sum, category) => sum + category.range.ideal, 0);
  const desired = Math.min(idealSum, plan.total.max - previousCount, Math.max(minimum, plan.total.ideal - previousCount));
  let unassigned = desired - minimum;
  while (unassigned > 0) {
    let advanced = false;
    for (const category of planned) {
      const current = targets.get(category.id)!;
      if (current >= category.range.ideal) continue;
      targets.set(category.id, current + 1);
      unassigned--;
      advanced = true;
      if (unassigned === 0) break;
    }
    if (!advanced) break;
  }
  for (const key of ["history", "aesthetic", "naming", "pressures", "additionalLore"] as const) {
    if (!ARRAY_KEYS.has(key)) {
      jobs.push({ id: `forge-b5:${key}`, key, entryIds: [], schema: projectedSchema(key) });
      continue;
    }
    for (const category of planned.filter(item => item.destination === key)) {
      const chunkSize = category.detail === "rich" || category.detail === "exhaustive" ? 3 : 6;
      const target = targets.get(category.id)!;
      for (let start = 0; start < target; start += chunkSize) {
        const size = Math.min(chunkSize, target - start);
        const entryIds = Array.from({ length: size }, (_, offset) => `forge-entry:${sha256Hex(`bundle5\0${category.id}\0${start + offset}`).slice(0, 24)}`);
        jobs.push({ id: `forge-b5:${category.id}:${start}`, key, categoryId: category.id, categoryLabel: category.label, purpose: category.purpose ?? category.label, entryIds, schema: projectedSchema(key) });
      }
    }
  }
  return jobs;
}

export function validateBundleFiveJob(job: BundleFiveJob, value: unknown): Record<BundleFiveKey, unknown> {
  const issues = validateSchemaValue(value, job.schema);
  if (issues.length) throw new ForgeValidationError(`Specialist ${job.id} failed schema validation.`, issues);
  const output = value as Record<string, unknown>;
  if (Object.keys(output).length !== 1 || !Object.hasOwn(output, job.key)) throw new ForgeValidationError(`Specialist ${job.id} returned an unowned section.`);
  if (ARRAY_KEYS.has(job.key)) {
    const entries = output[job.key] as Array<Record<string, unknown>>;
    if (entries.length !== job.entryIds.length) throw new ForgeValidationError(`Specialist ${job.id} returned ${entries.length} of ${job.entryIds.length} assigned entries.`);
    if (new Set(entries.map(entry => entry.id)).size !== entries.length || entries.some(entry => !job.entryIds.includes(String(entry.id)))) {
      throw new ForgeValidationError(`Specialist ${job.id} changed or duplicated assigned entry IDs.`);
    }
    if (job.key === "additionalLore" && entries.some(entry => {
      const fields = entry.fields as Record<string, unknown>;
      return fields.categoryId !== job.categoryId || fields.categoryLabel !== job.categoryLabel;
    })) throw new ForgeValidationError(`Specialist ${job.id} changed its assigned category.`);
    sanitizeForgeSectionEntries(job.key, entries);
  }
  return output as Record<BundleFiveKey, unknown>;
}

const MISSIONS: Record<BundleFiveKey, string> = {
  history: "Write concrete past events and their continuing consequences. Name each event or subject specifically. Do not invent player history or promote an implication into canon.",
  aesthetic: "Write one sensory and visual guide consistent with the setting and tonal breadth. This is one object, not a list of lore entries.",
  naming: "Write one guide to the established naming register. Suggested names are not established people or biographies.",
  pressures: "Write independent forces operating in the world, with scope and consequence. Current events are not eternal rules; do not dictate future scenes.",
  additionalLore: "Write focused runtime-useful concepts for the exact assigned category. Follow its purpose. Preserve categoryId and categoryLabel exactly. Do not regenerate cast, locations or relationships assigned elsewhere.",
};

export function compileBundleFiveJobPrompt(job: BundleFiveJob, context: string, correction: string | null) {
  const manifest = { jobId: job.id, ownedSection: job.key, categoryId: job.categoryId, categoryLabel: job.categoryLabel, purpose: job.purpose, entryIds: job.entryIds };
  const assignment = `BOUNDED SPECIALIST JOB\nGenerate only the owned section and entry IDs in JOB_MANIFEST. Other entries in context are reference-only. Do not fill project-wide deficits. Use each assigned ID exactly once. The application validates and merges jobs.\n\nMISSION\n${MISSIONS[job.key]}\n\nJOB_MANIFEST\n${JSON.stringify(manifest, null, 2)}\n\nSOURCE_CONTEXT\n${context}\n\nOUTPUT_SCHEMA\n${renderSchemaContract(job.schema)}`;
  return {
    systemInstruction: `${FORGE_PROTOCOL}\n\n${FORGE_SHARED_CONSTITUTION}\n\n${FORGE_CRAFT}`,
    userPrompt: correction ? `${assignment}\n\n${FORGE_CORRECTION}\n${correction}` : assignment,
  };
}

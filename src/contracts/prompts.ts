import { isPromptFeatureId } from "../lib/prompts/registry";

export const PROMPT_TEXT_MAX_CHARS = 24_000;
export const PROMPT_PROFILE_IMPORT_MAX_CHARS = 256_000;

export interface PromptOverrideV1 { featureId: string; baseVersion: number; text: string; revision: number; }
export interface PromptProfileV1 { schemaVersion: 1; id: string; name: string; revision: number; overrides: PromptOverrideV1[]; }
export interface ResolvedPromptSnapshotV1 { schemaVersion: 1; registryVersion: string; profileId: string | null; profileRevision: number | null; resolvedCreativeText: Readonly<Record<string, string>>; hash: string; }
export interface PromptProfileDraftV1 { name: string; overrides: PromptOverrideV1[]; }

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`${label} must be a plain object.`);
  return value as Record<string, unknown>;
}
function exact(value: Record<string, unknown>, allowed: readonly string[], label: string) {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) throw new TypeError(`Unknown ${label} field: ${unknown}.`);
}
function positiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new TypeError(`${label} must be a positive integer.`);
  return Number(value);
}
function parseOverride(value: unknown): PromptOverrideV1 {
  const source = record(value, "Prompt override");
  exact(source, ["featureId", "baseVersion", "text", "revision"], "prompt override");
  if (typeof source.featureId !== "string" || !isPromptFeatureId(source.featureId)) throw new TypeError(`Unknown prompt feature: ${String(source.featureId)}.`);
  if (typeof source.text !== "string") throw new TypeError("Prompt override text must be a string.");
  if (source.text.length > PROMPT_TEXT_MAX_CHARS) throw new TypeError("Prompt override text must be 24,000 characters or fewer.");
  return { featureId: source.featureId, baseVersion: positiveInteger(source.baseVersion, "baseVersion"), text: source.text, revision: positiveInteger(source.revision, "revision") };
}
export function parsePromptOverridesV1(value: unknown): PromptOverrideV1[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new TypeError("Prompt overrides must be an array.");
  const overrides = value.map(parseOverride);
  if (new Set(overrides.map((item) => item.featureId)).size !== overrides.length) throw new TypeError("Each prompt feature may appear only once.");
  return overrides;
}

export function parsePromptProfileDraftV1(value: unknown): PromptProfileDraftV1 {
  const source = record(value, "Prompt profile draft");
  exact(source, ["name", "overrides"], "prompt profile draft");
  if (typeof source.name !== "string" || !source.name.trim()) throw new TypeError("Prompt profile name is required.");
  const overrides = parsePromptOverridesV1(source.overrides);
  return { name: source.name.trim(), overrides };
}

export function parsePromptProfileV1(value: unknown): PromptProfileV1 {
  const source = record(value, "Prompt profile");
  exact(source, ["schemaVersion", "id", "name", "revision", "overrides"], "prompt profile");
  if (source.schemaVersion !== 1) throw new TypeError("Prompt profile schemaVersion must be 1.");
  if (typeof source.id !== "string" || !source.id.trim()) throw new TypeError("Prompt profile id is required.");
  const draft = parsePromptProfileDraftV1({ name: source.name, overrides: source.overrides });
  return { schemaVersion: 1, id: source.id, name: draft.name, revision: positiveInteger(source.revision, "revision"), overrides: draft.overrides };
}

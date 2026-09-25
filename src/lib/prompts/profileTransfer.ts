import {
  PROMPT_PROFILE_IMPORT_MAX_CHARS,
  parsePromptProfileDraftV1,
  type PromptProfileDraftV1,
  type PromptProfileV1,
} from "../../contracts/prompts";

const PROFILE_EXPORT_KIND = "lorebible.prompt-profile";

function plainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError("Prompt profile import must be a plain object.");
  }
  return value as Record<string, unknown>;
}

export function serializePromptProfileExportV1(profile: PromptProfileV1 | PromptProfileDraftV1): string {
  const draft = parsePromptProfileDraftV1({ name: profile.name, overrides: profile.overrides });
  return JSON.stringify({
    kind: PROFILE_EXPORT_KIND,
    schemaVersion: 1,
    name: draft.name,
    overrides: draft.overrides,
  }, null, 2);
}

export function parsePromptProfileImportV1(raw: string): PromptProfileDraftV1 {
  if (raw.length > PROMPT_PROFILE_IMPORT_MAX_CHARS) {
    throw new TypeError("Prompt profile import must be 256,000 characters or fewer.");
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new TypeError("Prompt profile import must be valid JSON.");
  }
  const source = plainRecord(value);
  const allowed = ["kind", "schemaVersion", "name", "overrides"];
  const unknown = Object.keys(source).find((key) => !allowed.includes(key));
  if (unknown) throw new TypeError(`Unknown prompt profile import field: ${unknown}.`);
  if (source.kind !== PROFILE_EXPORT_KIND) throw new TypeError(`Prompt profile import kind must be ${PROFILE_EXPORT_KIND}.`);
  if (source.schemaVersion !== 1) throw new TypeError("Prompt profile import schemaVersion must be 1.");
  return parsePromptProfileDraftV1({ name: source.name, overrides: source.overrides });
}

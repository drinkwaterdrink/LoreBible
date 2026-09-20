import { ModelGatewayError } from "../model/gateway.js";
import type { ForgeCoveragePlan } from "./forgeCoveragePlan.js";
import { auditForgeBundleCoverage } from "./forgeCoveragePlan.js";
import { FORGE_BUNDLE_KEYS, selectForgeBundleSections } from "./forgeResume.js";
import type { ForgeBundleDefinition } from "./forgeSchemas.js";
import { sanitizeForgeSectionEntries } from "./forgeValidation.js";
import { validateSchemaValue, type SchemaIssue } from "./schemaContract.js";

export class ForgeValidationError extends ModelGatewayError {
  constructor(message: string, public readonly issues: readonly SchemaIssue[] = []) {
    super(message, "INVALID_STRUCTURED_OUTPUT", 502);
  }
}

export interface PreparedForgeCandidate {
  sections: Record<string, unknown>;
  document: Record<string, unknown>;
  normalizations: readonly ("singleton_object_array")[];
  ignoredKeyCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function allEntryIds(value: Record<string, unknown>): string[] {
  const ids: string[] = [];
  for (const key of FORGE_BUNDLE_KEYS.flat()) {
    const section = value[key];
    const entries = key === "worldPhysics" && isRecord(section) ? section.rules : section;
    if (Array.isArray(entries)) for (const entry of entries) if (isRecord(entry) && typeof entry.id === "string") ids.push(entry.id);
  }
  return ids;
}

export function prepareForgeCandidate(input: {
  value: unknown;
  definition: ForgeBundleDefinition;
  previousDocument: Readonly<Record<string, unknown>>;
  coveragePlan: ForgeCoveragePlan | null;
}): PreparedForgeCandidate {
  let value = input.value;
  const normalizations: Array<"singleton_object_array"> = [];
  if (Array.isArray(value) && value.length === 1 && isRecord(value[0]) && validateSchemaValue(value[0], input.definition.schema).length === 0) {
    value = value[0];
    normalizations.push("singleton_object_array");
  }
  if (!isRecord(value)) throw new ForgeValidationError(`Forge response must be an object; received ${Array.isArray(value) ? "array" : value === null ? "null" : typeof value}.`, [{ path: "", code: "type", expected: "object", actual: Array.isArray(value) ? "array" : value === null ? "null" : typeof value }]);
  const structural = validateSchemaValue(value, input.definition.schema);
  if (structural.length) throw new ForgeValidationError(`Forge response failed ${structural.length} schema check${structural.length === 1 ? "" : "s"}.`, structural);
  const ownedKeys = new Set(input.definition.keys);
  const unowned = Object.keys(value).filter((key) => FORGE_BUNDLE_KEYS.flat().includes(key as typeof FORGE_BUNDLE_KEYS[number][number]) && !ownedKeys.has(key));
  if (unowned.length) throw new ForgeValidationError(`Forge response included unowned section ${unowned.join(", ")}.`);
  const selected = selectForgeBundleSections(value, input.definition.keys);
  const sections: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(selected.sections)) {
    if (key === "worldPhysics" && isRecord(raw) && Array.isArray(raw.rules)) {
      sections[key] = { ...raw, rules: sanitizeForgeSectionEntries("rules", raw.rules) };
    } else if (Array.isArray(raw) && key !== "proceduralRolls") {
      sections[key] = sanitizeForgeSectionEntries(key, raw);
    } else sections[key] = structuredClone(raw);
  }
  const document = { ...structuredClone(input.previousDocument), ...sections };
  const ids = allEntryIds(document);
  if (new Set(ids).size !== ids.length) throw new ForgeValidationError("Forge response contains duplicate entry IDs.");
  if (input.coveragePlan) {
    const findings = auditForgeBundleCoverage(input.coveragePlan, document, input.definition.keys);
    if (findings.length) throw new ForgeValidationError(`Blueprint coverage failed for ${findings.length} requirement${findings.length === 1 ? "" : "s"}.`);
  }
  return { sections, document, normalizations, ignoredKeyCount: selected.ignoredKeys.length };
}

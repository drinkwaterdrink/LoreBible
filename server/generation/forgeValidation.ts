import { ModelGatewayError } from "../model/gateway.js";
import type { SchemaIssue } from "./schemaContract.js";

export class ForgeSectionValidationError extends ModelGatewayError {
  constructor(message: string, public readonly issues: readonly SchemaIssue[]) {
    super(message, "INVALID_STRUCTURED_OUTPUT", 502);
  }
}
const OPTIONAL_ACTIVATION_KEYS = new Set(["relationshipWeb", "knowledgeMap"]);

export const FORGE_REQUIRED_FIELDS: Record<string, readonly string[]> = {
  rules: ["name", "rule", "profits", "pays"],
  locations: ["name", "function", "mood", "whatsWrong"],
  factions: ["name", "publicFace", "trueAgenda", "independentWant", "stanceTowardUser"],
  npcs: ["name", "role", "wants", "body", "voice", "notDefault", "holds", "connection", "castTier", "independentActivity"],
  relationshipWeb: ["source", "target", "bond", "pressure", "relation"],
  knowledgeMap: ["truth", "knows", "suspects", "surfacesWhen"],
  items: ["name", "whatItDoes", "costOrLimit", "unfiredGun"],
  secrets: ["name", "truth", "whoKeepsIt", "howKept", "discoveryTrigger", "whatItChanges"],
  history: ["name", "event", "era", "consequence"],
  pressures: ["name", "force", "scope", "clock"],
  additionalLore: ["categoryId", "categoryLabel", "name", "content"],
};

/** Validate provider entries without inventing missing creative content. */
export function sanitizeForgeSectionEntries(sectionKey: string, entries: unknown[]): any[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  return entries.map((entry, idx) => {
    if (!entry || typeof entry !== "object" || !("fields" in entry) || !entry.fields || typeof entry.fields !== "object" || Array.isArray(entry.fields)) {
      throw new ForgeSectionValidationError(`${sectionKey} entry ${idx + 1} is malformed.`, [{ path: `/${sectionKey}/${idx}/fields`, code: "type", expected: "object", actual: "missing or invalid" }]);
    }
    const record = entry as Record<string, unknown>;
    const fields = record.fields as Record<string, unknown>;
    const missing = (FORGE_REQUIRED_FIELDS[sectionKey] || []).filter((field) => typeof fields[field] !== "string" || !fields[field].trim());
    const keys = record.keys;
    const invalidKeys = OPTIONAL_ACTIVATION_KEYS.has(sectionKey)
      ? keys !== undefined && (!Array.isArray(keys) || keys.some(key => typeof key !== "string" || !key.trim()))
      : !Array.isArray(keys) || keys.length === 0 || keys.some(key => typeof key !== "string" || !key.trim());
    if (missing.length > 0 || invalidKeys) {
      const reasons = [...missing, ...(invalidKeys ? ["keys"] : [])];
      const issues: SchemaIssue[] = missing.map(field => ({ path: `/${sectionKey}/${idx}/fields/${field}`, code: "schema", expected: "nonblank string", actual: "missing or blank" }));
      if (invalidKeys) issues.push({ path: `/${sectionKey}/${idx}/keys`, code: "schema", expected: "nonempty array of nonblank strings", actual: "missing or blank" });
      throw new ForgeSectionValidationError(`${sectionKey} entry ${idx + 1} is missing required content: ${reasons.join(", ")}.`, issues);
    }
    if(sectionKey==="npcs"&&!(["principal","roster"] as unknown[]).includes(fields.castTier))throw new ForgeSectionValidationError(`${sectionKey} entry ${idx + 1} has unsupported castTier.`,[{path:`/${sectionKey}/${idx}/fields/castTier`,code:"enum",expected:"principal or roster",actual:"unsupported value"}]);
    const semanticName=typeof fields.name==="string"?fields.name.trim():"";const genericLabel=sectionKey==="additionalLore"&&typeof fields.categoryLabel==="string"?fields.categoryLabel:sectionKey.replace(/s$/i,"");
    const genericName=new RegExp(`^(?:(?:world\\s+)?rule|history|secret|entry|${genericLabel.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})\\s+\\d+$`,"i");
    if(semanticName&&genericName.test(semanticName))throw new ForgeSectionValidationError(`${sectionKey} entry ${idx + 1} needs a descriptive semantic name.`,[{path:`/${sectionKey}/${idx}/fields/name`,code:"schema",expected:"descriptive semantic name",actual:"numbered placeholder"}]);
    return { ...record, id: record.id || `${sectionKey}-${idx + 1}`, locked: Boolean(record.locked) };
  });
}

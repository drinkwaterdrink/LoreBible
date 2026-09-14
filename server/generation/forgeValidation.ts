import { ModelGatewayError } from "../model/gateway.js";

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
    if (!entry || typeof entry !== "object" || !("fields" in entry) || !entry.fields || typeof entry.fields !== "object") {
      throw new ModelGatewayError(`${sectionKey} entry ${idx + 1} is malformed.`, "INVALID_STRUCTURED_OUTPUT", 502);
    }
    const record = entry as Record<string, unknown>;
    const fields = record.fields as Record<string, unknown>;
    const missing = (FORGE_REQUIRED_FIELDS[sectionKey] || []).filter((field) => typeof fields[field] !== "string" || !fields[field].trim());
    const keys = record.keys;
    if (missing.length > 0 || !Array.isArray(keys) || keys.length === 0) {
      const reasons = [...missing, ...(!Array.isArray(keys) || keys.length === 0 ? ["keys"] : [])];
      throw new ModelGatewayError(`${sectionKey} entry ${idx + 1} is missing required content: ${reasons.join(", ")}.`, "INVALID_STRUCTURED_OUTPUT", 502);
    }
    if(sectionKey==="npcs"&&!(["principal","roster"] as unknown[]).includes(fields.castTier))throw new ModelGatewayError(`${sectionKey} entry ${idx + 1} has unsupported castTier.`,"INVALID_STRUCTURED_OUTPUT",502);
    const semanticName=typeof fields.name==="string"?fields.name.trim():"";const genericLabel=sectionKey==="additionalLore"&&typeof fields.categoryLabel==="string"?fields.categoryLabel:sectionKey.replace(/s$/i,"");
    const genericName=new RegExp(`^(?:(?:world\\s+)?rule|history|secret|entry|${genericLabel.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})\\s+\\d+$`,"i");
    if(semanticName&&genericName.test(semanticName))throw new ModelGatewayError(`${sectionKey} entry ${idx + 1} needs a descriptive semantic name.`,"INVALID_STRUCTURED_OUTPUT",502);
    return { ...record, id: record.id || `${sectionKey}-${idx + 1}`, locked: Boolean(record.locked) };
  });
}

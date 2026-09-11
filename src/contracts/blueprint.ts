export const BLUEPRINT_PLAN_SCHEMA = "lorebible.blueprint-plan/v1" as const;

export type ArtifactTarget = "individual_character" | "scenario_card" | "narrator_world" | "ensemble" | "full_world" | "full_world_package" | "world_book_primary";
export type BlueprintWorldMode = "arc" | "sandbox" | "hybrid";
export type BuildIntensity = "lean" | "rich" | "deluxe" | "obsessive";
export type BlueprintGenerationQuality = "fast" | "balanced" | "deep_craft" | "production";
export type RuntimeBudget = "efficient" | "balanced" | "expansive";
export type BlueprintCategoryStatus = "recommended" | "optional" | "omitted" | "required";
export type BlueprintDetail = "light" | "standard" | "rich" | "exhaustive";
export type BlueprintRuntimeRole = "evergreen" | "reference" | "dynamic" | "secret" | "ambient" | "state" | "mixed";
export type BlueprintAssessmentStatus = "supported" | "thin" | "not_applicable" | "unknown";
export type MechanicPackStatus = "recommended" | "optional" | "ineligible";
export type BlueprintFindingSeverity = "blocker" | "major" | "minor" | "info";

export interface BlueprintRecommendation<T> { value: T; status: "proposed"; reason: string; evidenceRefs: string[]; }
export interface EstimateRange { min: number; ideal: number; max: number; }
export interface LoreCategoryPlan {
  id: string; label: string; purpose: string; justification: string; status: BlueprintCategoryStatus; detail: BlueprintDetail;
  targetRange?: EstimateRange; likelyRuntimeRole: BlueprintRuntimeRole; candidateArchitectures: BlueprintRecommendation<string>[];
  userLocked: false; evidenceRefs: string[];
}
export interface MechanicPackRecommendation { id: string; label: string; status: MechanicPackStatus; reason: string; evidenceRefs: string[]; }
export interface BlueprintAssessment { status: BlueprintAssessmentStatus; evidenceRefs: string[]; gaps: string[]; explanation: string; }
export interface BlueprintFinding { id: string; severity: BlueprintFindingSeverity; code: string; message: string; evidenceRefs: string[]; }

/** Sanitized, explicitly supplied planning data. It intentionally excludes credentials, graph extensions, and migration source. */
export interface BlueprintSparkDnaV1 {
  nonNegotiables: string[]; premisePromise: string; toneEnvelope: { primary: string; descriptors: string[] }; genreSignals: string[];
  playerAgencyBoundaries: string; openVariables: string[]; existingPressures: string[]; assumptions: string[]; opportunitySpace: string[];
  userRole: string | null; franchise: string | null;
}
export interface BlueprintPhysicsConstraintsV1 {
  density?: "Quick" | "Standard" | "Rich"; densityTokens?: number; strangeness?: number; mundanity?: number; genre?: string; subgenre?: string;
  violence?: "None" | "Implied" | "Moderate" | "Graphic"; horror?: string; romance?: "None" | "Subplot" | "Major" | "Primary"; humor?: string;
  pacing?: "Slow burn" | "Measured" | "Dynamic" | "Frantic"; explicitContent?: "No" | "Fade" | "Yes"; playerDeath?: "No" | "Only if earned" | "Yes";
  linguisticBase?: string; mustInclude?: string; mustAvoid?: string;
}
export type BlueprintFactValue = string | number | boolean | null | string[];
export interface BlueprintPlanningContextV1 {
  projectId: string;
  projectRevision: number;
  sparkDna?: BlueprintSparkDnaV1;
  selectedTake?: { id: string; title: string; pitch: string; angle: string; genres: string[]; tone: string[]; retainedNonNegotiables: string[]; };
  physicsConstraints?: BlueprintPhysicsConstraintsV1;
  graphFacts?: Array<{ id: string; predicate: string; value: BlueprintFactValue; status: "canon" | "provisional" | "suggested" | "conflicted" | "deprecated"; origin: "user" | "approved_project" | "lumiverse_docs_technical" | "external_reference" | "generated" | "inferred"; visibility: "public" | "limited" | "private" | "secret"; temporalClass: "evergreen" | "initial" | "current" | "historical" | "future_possible" }>;
  graphEntities?: Array<{ id: string; type: "character" | "location" | "faction" | "organization" | "item" | "system" | "event" | "culture" | "species" | "concept" | "other"; name: string; importance: "principal" | "major" | "supporting" | "minor" | "reference"; lifecycle: "active" | "historical" | "future" | "unknown" }>;
  relationshipCount?: number;
  knowledgeClaimCount?: number;
  generationQuality?: BlueprintGenerationQuality;
}
export interface BlueprintPreviewRequestV1 { expectedRevision: number; context: BlueprintPlanningContextV1; }
export interface BlueprintPlanV1 {
  schema: typeof BLUEPRINT_PLAN_SCHEMA;
  source: { projectId: string; projectRevision: number; inputSha256: string; plannerVersion: "1" };
  interfaceMode: "smart_auto";
  artifactTargets: BlueprintRecommendation<ArtifactTarget>[];
  worldMode: BlueprintRecommendation<BlueprintWorldMode>;
  buildIntensity: BlueprintRecommendation<BuildIntensity>;
  generationQuality: BlueprintRecommendation<BlueprintGenerationQuality>;
  runtimeBudget: BlueprintRecommendation<RuntimeBudget>;
  categories: LoreCategoryPlan[];
  mechanicPacks: MechanicPackRecommendation[];
  assessments: { ordinaryLife: BlueprintAssessment; worldAutonomy: BlueprintAssessment };
  inventory: { nodes: EstimateRange; modelCalls: EstimateRange; artifacts: string[] };
  findings: BlueprintFinding[];
  createdAt: string;
}

export type BlueprintParseIssue = { path: string; message: string };
export type BlueprintParseResult<T> = { ok: true; value: T } | { ok: false; issues: BlueprintParseIssue[] };

const MAX_STRING_LENGTH = 10_000;
const credentialKey = /(?:^|[_-])(api[_-]?key|credentials?|access[_-]?token|secret|client[_-]?secret|refresh[_-]?token|private[_-]?key|authorization|bearer|token)(?:$|[_-])/i;
const artifactTargets = ["individual_character", "scenario_card", "narrator_world", "ensemble", "full_world", "full_world_package", "world_book_primary"] as const;
const worldModes = ["arc", "sandbox", "hybrid"] as const;
const intensities = ["lean", "rich", "deluxe", "obsessive"] as const;
const qualities = ["fast", "balanced", "deep_craft", "production"] as const;
const budgets = ["efficient", "balanced", "expansive"] as const;
const categoryStatuses = ["recommended", "optional", "omitted", "required"] as const;
const details = ["light", "standard", "rich", "exhaustive"] as const;
const runtimeRoles = ["evergreen", "reference", "dynamic", "secret", "ambient", "state", "mixed"] as const;
const assessmentStatuses = ["supported", "thin", "not_applicable", "unknown"] as const;
const mechanicStatuses = ["recommended", "optional", "ineligible"] as const;
const findingSeverities = ["blocker", "major", "minor", "info"] as const;
const graphStatuses = ["canon", "provisional", "suggested", "conflicted", "deprecated"] as const;
const graphOrigins = ["user", "approved_project", "lumiverse_docs_technical", "external_reference", "generated", "inferred"] as const;
const graphVisibilities = ["public", "limited", "private", "secret"] as const;
const temporalClasses = ["evergreen", "initial", "current", "historical", "future_possible"] as const;
const entityTypes = ["character", "location", "faction", "organization", "item", "system", "event", "culture", "species", "concept", "other"] as const;
const importances = ["principal", "major", "supporting", "minor", "reference"] as const;
const lifecycles = ["active", "historical", "future", "unknown"] as const;

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => Boolean(value && typeof value === "object" && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null));
const issue = (issues: BlueprintParseIssue[], path: string, message: string) => issues.push({ path, message });
const string = (value: unknown, path: string, issues: BlueprintParseIssue[], required = true): value is string => {
  const valid = typeof value === "string" && value.length <= MAX_STRING_LENGTH && (!required || value.trim().length > 0);
  if (!valid) issue(issues, path, required ? "Expected a non-empty bounded string." : "Expected a bounded string.");
  return valid;
};
const enumValue = <T extends readonly string[]>(value: unknown, allowed: T, path: string, issues: BlueprintParseIssue[]): value is T[number] => {
  if (typeof value !== "string" || !allowed.includes(value)) { issue(issues, path, "Unsupported enum value."); return false; }
  return true;
};
const nonnegativeInteger = (value: unknown, path: string, issues: BlueprintParseIssue[]): value is number => {
  const valid = typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value >= 0;
  if (!valid) issue(issues, path, "Expected a finite nonnegative integer.");
  return valid;
};
const nonnegativeNumber = (value: unknown, path: string, issues: BlueprintParseIssue[]): value is number => {
  const valid = typeof value === "number" && Number.isFinite(value) && value >= 0;
  if (!valid) issue(issues, path, "Expected a finite nonnegative number.");
  return valid;
};

function inspectSafety(value: unknown, path: string, issues: BlueprintParseIssue[], seen = new WeakSet<object>(), depth = 0, state = { nodes: 0 }): void {
  if (depth > 32 || ++state.nodes > 5_000) { issue(issues, path, "Input exceeds safe structural limits."); return; }
  if (typeof value === "string") { string(value, path, issues, false); return; }
  if (typeof value === "number" && !Number.isFinite(value)) { issue(issues, path, "Numbers must be finite."); return; }
  if (Array.isArray(value)) { if (seen.has(value)) { issue(issues, path, "Cyclic input is not allowed."); return; } seen.add(value); value.forEach((item, index) => inspectSafety(item, `${path}[${index}]`, issues, seen, depth + 1, state)); return; }
  if (!record(value)) return;
  if (seen.has(value)) { issue(issues, path, "Cyclic input is not allowed."); return; }
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (credentialKey.test(key)) issue(issues, path ? `${path}.${key}` : key, "Credential-shaped fields are not allowed.");
    inspectSafety(child, path ? `${path}.${key}` : key, issues, seen, depth + 1, state);
  }
}
function closed(value: unknown, path: string, allowed: readonly string[], issues: BlueprintParseIssue[]): value is RecordValue {
  if (!record(value)) { issue(issues, path, "Expected a plain object."); return false; }
  for (const key of Object.keys(value)) if (!allowed.includes(key)) issue(issues, path ? `${path}.${key}` : key, "Unknown field is not allowed.");
  return true;
}
function stringArray(value: unknown, path: string, issues: BlueprintParseIssue[], nonempty = false): value is string[] {
  if (!Array.isArray(value)) { issue(issues, path, "Expected an array of strings."); return false; }
  if (nonempty && value.length === 0) issue(issues, path, "Expected at least one value.");
  value.forEach((item, index) => string(item, `${path}[${index}]`, issues));
  return true;
}
function range(value: unknown, path: string, issues: BlueprintParseIssue[]): value is EstimateRange {
  if (!closed(value, path, ["min", "ideal", "max"], issues)) return false;
  const min = nonnegativeNumber(value.min, `${path}.min`, issues);
  const ideal = nonnegativeNumber(value.ideal, `${path}.ideal`, issues);
  const max = nonnegativeNumber(value.max, `${path}.max`, issues);
  if (min && ideal && max && !(value.min <= value.ideal && value.ideal <= value.max)) issue(issues, path, "Range values must be ascending.");
  return min && ideal && max;
}
function recommendation(value: unknown, path: string, issues: BlueprintParseIssue[], allowed?: readonly string[]): boolean {
  if (!closed(value, path, ["value", "status", "reason", "evidenceRefs"], issues)) return false;
  if (allowed) enumValue(value.value, allowed, `${path}.value`, issues); else string(value.value, `${path}.value`, issues);
  if (value.status !== "proposed") issue(issues, `${path}.status`, "Recommendation status must be proposed.");
  string(value.reason, `${path}.reason`, issues);
  stringArray(value.evidenceRefs, `${path}.evidenceRefs`, issues, true);
  return true;
}
function uniqueIds(items: unknown[], path: string, issues: BlueprintParseIssue[]): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (!record(item) || !string(item.id, `${path}[${index}].id`, issues)) return;
    if (seen.has(item.id)) issue(issues, `${path}[${index}].id`, "Duplicate stable ID."); else seen.add(item.id);
  });
}

export function parseBlueprintPreviewRequest(value: unknown): BlueprintParseResult<BlueprintPreviewRequestV1> {
  try { return parseBlueprintPreviewRequestInternal(value); } catch { return { ok: false, issues: [{ path: "", message: "Invalid Blueprint preview request." }] }; }
}
function parseBlueprintPreviewRequestInternal(value: unknown): BlueprintParseResult<BlueprintPreviewRequestV1> {
  const issues: BlueprintParseIssue[] = [];
  inspectSafety(value, "", issues);
  if (!closed(value, "", ["expectedRevision", "context"], issues)) return { ok: false, issues };
  nonnegativeInteger(value.expectedRevision, "expectedRevision", issues);
  if (!closed(value.context, "context", ["projectId", "projectRevision", "sparkDna", "selectedTake", "physicsConstraints", "graphFacts", "graphEntities", "relationshipCount", "knowledgeClaimCount", "generationQuality"], issues)) return { ok: false, issues };
  const context = value.context;
  {
    string(context.projectId, "context.projectId", issues); nonnegativeInteger(context.projectRevision, "context.projectRevision", issues);
    if (context.generationQuality !== undefined) enumValue(context.generationQuality, qualities, "context.generationQuality", issues);
    if (context.selectedTake !== undefined) {
      if (closed(context.selectedTake, "context.selectedTake", ["id", "title", "pitch", "angle", "genres", "tone", "retainedNonNegotiables"], issues)) { for (const key of ["id", "title", "pitch", "angle"] as const) string(context.selectedTake[key], `context.selectedTake.${key}`, issues); for (const key of ["genres", "tone", "retainedNonNegotiables"] as const) stringArray(context.selectedTake[key], `context.selectedTake.${key}`, issues); }
    }
    if (context.sparkDna !== undefined) parseSparkDna(context.sparkDna, "context.sparkDna", issues);
    if (context.physicsConstraints !== undefined) parsePhysics(context.physicsConstraints, "context.physicsConstraints", issues);
    if (context.graphFacts !== undefined) parseGraphFacts(context.graphFacts, "context.graphFacts", issues);
    if (context.graphEntities !== undefined) parseGraphEntities(context.graphEntities, "context.graphEntities", issues);
    if (context.relationshipCount !== undefined) nonnegativeInteger(context.relationshipCount, "context.relationshipCount", issues);
    if (context.knowledgeClaimCount !== undefined) nonnegativeInteger(context.knowledgeClaimCount, "context.knowledgeClaimCount", issues);
  }
  if (issues.length) return { ok: false, issues };
  return { ok: true, value: JSON.parse(JSON.stringify(value)) as BlueprintPreviewRequestV1 };
}

function parseSparkDna(value: unknown, path: string, issues: BlueprintParseIssue[]): void {
  if (!closed(value, path, ["nonNegotiables", "premisePromise", "toneEnvelope", "genreSignals", "playerAgencyBoundaries", "openVariables", "existingPressures", "assumptions", "opportunitySpace", "userRole", "franchise"], issues)) return;
  for (const key of ["nonNegotiables", "genreSignals", "openVariables", "existingPressures", "assumptions", "opportunitySpace"] as const) stringArray(value[key], `${path}.${key}`, issues);
  for (const key of ["premisePromise", "playerAgencyBoundaries"] as const) string(value[key], `${path}.${key}`, issues);
  if (closed(value.toneEnvelope, `${path}.toneEnvelope`, ["primary", "descriptors"], issues)) { string(value.toneEnvelope.primary, `${path}.toneEnvelope.primary`, issues); stringArray(value.toneEnvelope.descriptors, `${path}.toneEnvelope.descriptors`, issues); }
  for (const key of ["userRole", "franchise"] as const) if (value[key] !== null) string(value[key], `${path}.${key}`, issues);
}
function parsePhysics(value: unknown, path: string, issues: BlueprintParseIssue[]): void {
  const allowed = ["density", "densityTokens", "strangeness", "mundanity", "genre", "subgenre", "violence", "horror", "romance", "humor", "pacing", "explicitContent", "playerDeath", "linguisticBase", "mustInclude", "mustAvoid"] as const;
  if (!closed(value, path, allowed, issues)) return;
  if (value.density !== undefined) enumValue(value.density, ["Quick", "Standard", "Rich"], `${path}.density`, issues);
  if (value.violence !== undefined) enumValue(value.violence, ["None", "Implied", "Moderate", "Graphic"], `${path}.violence`, issues);
  if (value.romance !== undefined) enumValue(value.romance, ["None", "Subplot", "Major", "Primary"], `${path}.romance`, issues);
  if (value.pacing !== undefined) enumValue(value.pacing, ["Slow burn", "Measured", "Dynamic", "Frantic"], `${path}.pacing`, issues);
  if (value.explicitContent !== undefined) enumValue(value.explicitContent, ["No", "Fade", "Yes"], `${path}.explicitContent`, issues);
  if (value.playerDeath !== undefined) enumValue(value.playerDeath, ["No", "Only if earned", "Yes"], `${path}.playerDeath`, issues);
  for (const key of ["densityTokens", "strangeness", "mundanity"] as const) if (value[key] !== undefined) nonnegativeNumber(value[key], `${path}.${key}`, issues);
  for (const key of ["genre", "subgenre", "horror", "humor", "linguisticBase", "mustInclude", "mustAvoid"] as const) if (value[key] !== undefined) string(value[key], `${path}.${key}`, issues);
}
function parseGraphFacts(value: unknown, path: string, issues: BlueprintParseIssue[]): void {
  if (!Array.isArray(value)) { issue(issues, path, "Expected graph facts."); return; }
  value.forEach((fact, index) => { const itemPath = `${path}[${index}]`; if (!closed(fact, itemPath, ["id", "predicate", "value", "status", "origin", "visibility", "temporalClass"], issues)) return; string(fact.id, `${itemPath}.id`, issues); string(fact.predicate, `${itemPath}.predicate`, issues); if (!(fact.value === null || typeof fact.value === "string" || typeof fact.value === "number" || typeof fact.value === "boolean" || (Array.isArray(fact.value) && fact.value.every((entry, entryIndex) => string(entry, `${itemPath}.value[${entryIndex}]`, issues))))) issue(issues, `${itemPath}.value`, "Expected a safe fact value."); enumValue(fact.status, graphStatuses, `${itemPath}.status`, issues); enumValue(fact.origin, graphOrigins, `${itemPath}.origin`, issues); enumValue(fact.visibility, graphVisibilities, `${itemPath}.visibility`, issues); enumValue(fact.temporalClass, temporalClasses, `${itemPath}.temporalClass`, issues); });
}
function parseGraphEntities(value: unknown, path: string, issues: BlueprintParseIssue[]): void {
  if (!Array.isArray(value)) { issue(issues, path, "Expected graph entities."); return; }
  value.forEach((entity, index) => { const itemPath = `${path}[${index}]`; if (!closed(entity, itemPath, ["id", "type", "name", "importance", "lifecycle"], issues)) return; string(entity.id, `${itemPath}.id`, issues); enumValue(entity.type, entityTypes, `${itemPath}.type`, issues); string(entity.name, `${itemPath}.name`, issues); enumValue(entity.importance, importances, `${itemPath}.importance`, issues); enumValue(entity.lifecycle, lifecycles, `${itemPath}.lifecycle`, issues); });
}

export function parseBlueprintPlan(value: unknown): BlueprintParseResult<BlueprintPlanV1> {
  try { return parseBlueprintPlanInternal(value); } catch { return { ok: false, issues: [{ path: "", message: "Invalid Blueprint plan." }] }; }
}
function parseBlueprintPlanInternal(value: unknown): BlueprintParseResult<BlueprintPlanV1> {
  const issues: BlueprintParseIssue[] = [];
  inspectSafety(value, "", issues);
  if (!closed(value, "", ["schema", "source", "interfaceMode", "artifactTargets", "worldMode", "buildIntensity", "generationQuality", "runtimeBudget", "categories", "mechanicPacks", "assessments", "inventory", "findings", "createdAt"], issues)) return { ok: false, issues };
  if (value.schema !== BLUEPRINT_PLAN_SCHEMA) issue(issues, "schema", "Unsupported Blueprint plan schema.");
  if (!closed(value.source, "source", ["projectId", "projectRevision", "inputSha256", "plannerVersion"], issues)) issue(issues, "source", "Expected source metadata.");
  else { string(value.source.projectId, "source.projectId", issues); nonnegativeInteger(value.source.projectRevision, "source.projectRevision", issues); if (typeof value.source.inputSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(value.source.inputSha256)) issue(issues, "source.inputSha256", "Expected a SHA-256 checksum."); if (value.source.plannerVersion !== "1") issue(issues, "source.plannerVersion", "Unsupported planner version."); }
  if (value.interfaceMode !== "smart_auto") issue(issues, "interfaceMode", "Interface mode must be smart_auto.");
  if (!Array.isArray(value.artifactTargets)) issue(issues, "artifactTargets", "Expected recommendations."); else value.artifactTargets.forEach((item, index) => recommendation(item, `artifactTargets[${index}]`, issues, artifactTargets));
  recommendation(value.worldMode, "worldMode", issues, worldModes);
  recommendation(value.buildIntensity, "buildIntensity", issues, intensities);
  recommendation(value.generationQuality, "generationQuality", issues, qualities);
  recommendation(value.runtimeBudget, "runtimeBudget", issues, budgets);
  if (!Array.isArray(value.categories)) issue(issues, "categories", "Expected categories."); else {
    uniqueIds(value.categories, "categories", issues);
    value.categories.forEach((item, index) => { const path = `categories[${index}]`; if (!closed(item, path, ["id", "label", "purpose", "justification", "status", "detail", "targetRange", "likelyRuntimeRole", "candidateArchitectures", "userLocked", "evidenceRefs"], issues)) return; ["id", "label", "purpose", "justification"].forEach(key => string(item[key], `${path}.${key}`, issues)); enumValue(item.status, categoryStatuses, `${path}.status`, issues); enumValue(item.detail, details, `${path}.detail`, issues); if (item.targetRange !== undefined) range(item.targetRange, `${path}.targetRange`, issues); enumValue(item.likelyRuntimeRole, runtimeRoles, `${path}.likelyRuntimeRole`, issues); if (!Array.isArray(item.candidateArchitectures)) issue(issues, `${path}.candidateArchitectures`, "Expected candidate architectures."); else item.candidateArchitectures.forEach((candidate, candidateIndex) => recommendation(candidate, `${path}.candidateArchitectures[${candidateIndex}]`, issues)); if (item.userLocked !== false) issue(issues, `${path}.userLocked`, "User lock must be false in v1."); stringArray(item.evidenceRefs, `${path}.evidenceRefs`, issues, item.status !== "omitted"); });
  }
  if (!Array.isArray(value.mechanicPacks)) issue(issues, "mechanicPacks", "Expected mechanic packs."); else { uniqueIds(value.mechanicPacks, "mechanicPacks", issues); value.mechanicPacks.forEach((item, index) => { const path = `mechanicPacks[${index}]`; if (!closed(item, path, ["id", "label", "status", "reason", "evidenceRefs"], issues)) return; string(item.label, `${path}.label`, issues); enumValue(item.status, mechanicStatuses, `${path}.status`, issues); string(item.reason, `${path}.reason`, issues); stringArray(item.evidenceRefs, `${path}.evidenceRefs`, issues, true); }); }
  if (!closed(value.assessments, "assessments", ["ordinaryLife", "worldAutonomy"], issues)) issue(issues, "assessments", "Expected assessments."); else for (const key of ["ordinaryLife", "worldAutonomy"] as const) { const assessment = value.assessments[key]; const path = `assessments.${key}`; if (!closed(assessment, path, ["status", "evidenceRefs", "gaps", "explanation"], issues)) continue; enumValue(assessment.status, assessmentStatuses, `${path}.status`, issues); stringArray(assessment.evidenceRefs, `${path}.evidenceRefs`, issues); stringArray(assessment.gaps, `${path}.gaps`, issues); string(assessment.explanation, `${path}.explanation`, issues); }
  if (!closed(value.inventory, "inventory", ["nodes", "modelCalls", "artifacts"], issues)) issue(issues, "inventory", "Expected inventory estimates."); else { range(value.inventory.nodes, "inventory.nodes", issues); range(value.inventory.modelCalls, "inventory.modelCalls", issues); stringArray(value.inventory.artifacts, "inventory.artifacts", issues); }
  if (!Array.isArray(value.findings)) issue(issues, "findings", "Expected findings."); else { uniqueIds(value.findings, "findings", issues); value.findings.forEach((item, index) => { const path = `findings[${index}]`; if (!closed(item, path, ["id", "severity", "code", "message", "evidenceRefs"], issues)) return; string(item.code, `${path}.code`, issues); string(item.message, `${path}.message`, issues); enumValue(item.severity, findingSeverities, `${path}.severity`, issues); stringArray(item.evidenceRefs, `${path}.evidenceRefs`, issues); }); }
  if (!string(value.createdAt, "createdAt", issues) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.createdAt as string) || Number.isNaN(Date.parse(value.createdAt as string))) issue(issues, "createdAt", "Expected an ISO-8601 timestamp.");
  return issues.length ? { ok: false, issues } : { ok: true, value: JSON.parse(JSON.stringify(value)) as BlueprintPlanV1 };
}

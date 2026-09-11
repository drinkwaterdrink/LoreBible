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
export interface BlueprintPlanningContextV1 {
  projectId: string;
  projectRevision: number;
  sparkDna?: Record<string, unknown>;
  selectedTake?: { id: string; title: string; pitch: string; angle: string; genres: string[]; tone: string[]; retainedNonNegotiables: string[]; };
  physicsConstraints?: Record<string, unknown>;
  graphFacts?: Array<{ id: string; predicate: string; value: unknown; status: string; origin: string; visibility: string; temporalClass: string }>;
  graphEntities?: Array<{ id: string; type: string; name: string; importance: string; lifecycle: string }>;
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
const credentialKey = /^(api[_-]?key|credential|access[_-]?token|secret[_-]?key)$/i;
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

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => Boolean(value && typeof value === "object" && !Array.isArray(value));
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

function inspectSafety(value: unknown, path: string, issues: BlueprintParseIssue[]): void {
  if (typeof value === "string") { string(value, path, issues, false); return; }
  if (typeof value === "number" && !Number.isFinite(value)) { issue(issues, path, "Numbers must be finite."); return; }
  if (Array.isArray(value)) { value.forEach((item, index) => inspectSafety(item, `${path}[${index}]`, issues)); return; }
  if (!record(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (credentialKey.test(key)) issue(issues, path ? `${path}.${key}` : key, "Credential-shaped fields are not allowed.");
    inspectSafety(child, path ? `${path}.${key}` : key, issues);
  }
}
function stringArray(value: unknown, path: string, issues: BlueprintParseIssue[], nonempty = false): value is string[] {
  if (!Array.isArray(value)) { issue(issues, path, "Expected an array of strings."); return false; }
  if (nonempty && value.length === 0) issue(issues, path, "Expected at least one value.");
  value.forEach((item, index) => string(item, `${path}[${index}]`, issues));
  return true;
}
function range(value: unknown, path: string, issues: BlueprintParseIssue[]): value is EstimateRange {
  if (!record(value)) { issue(issues, path, "Expected an estimate range."); return false; }
  const min = nonnegativeNumber(value.min, `${path}.min`, issues);
  const ideal = nonnegativeNumber(value.ideal, `${path}.ideal`, issues);
  const max = nonnegativeNumber(value.max, `${path}.max`, issues);
  if (min && ideal && max && !(value.min <= value.ideal && value.ideal <= value.max)) issue(issues, path, "Range values must be ascending.");
  return min && ideal && max;
}
function recommendation(value: unknown, path: string, issues: BlueprintParseIssue[], allowed?: readonly string[]): boolean {
  if (!record(value)) { issue(issues, path, "Expected a recommendation."); return false; }
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
  const issues: BlueprintParseIssue[] = [];
  inspectSafety(value, "", issues);
  if (!record(value)) return { ok: false, issues: [{ path: "", message: "Expected an object." }] };
  nonnegativeInteger(value.expectedRevision, "expectedRevision", issues);
  if (!record(value.context)) issue(issues, "context", "Expected a planning context.");
  else {
    string(value.context.projectId, "context.projectId", issues);
    nonnegativeInteger(value.context.projectRevision, "context.projectRevision", issues);
    if (value.context.generationQuality !== undefined) enumValue(value.context.generationQuality, qualities, "context.generationQuality", issues);
    if (value.context.selectedTake !== undefined) {
      if (!record(value.context.selectedTake)) issue(issues, "context.selectedTake", "Expected a selected take object.");
      else for (const key of ["id", "title", "pitch", "angle"] as const) string(value.context.selectedTake[key], `context.selectedTake.${key}`, issues);
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true, value: value as unknown as BlueprintPreviewRequestV1 };
}

export function parseBlueprintPlan(value: unknown): BlueprintParseResult<BlueprintPlanV1> {
  const issues: BlueprintParseIssue[] = [];
  inspectSafety(value, "", issues);
  if (!record(value)) return { ok: false, issues: [{ path: "", message: "Expected an object." }] };
  if (value.schema !== BLUEPRINT_PLAN_SCHEMA) issue(issues, "schema", "Unsupported Blueprint plan schema.");
  if (!record(value.source)) issue(issues, "source", "Expected source metadata.");
  else { string(value.source.projectId, "source.projectId", issues); nonnegativeInteger(value.source.projectRevision, "source.projectRevision", issues); if (typeof value.source.inputSha256 !== "string" || !/^[a-f0-9]{64}$/i.test(value.source.inputSha256)) issue(issues, "source.inputSha256", "Expected a SHA-256 checksum."); if (value.source.plannerVersion !== "1") issue(issues, "source.plannerVersion", "Unsupported planner version."); }
  if (value.interfaceMode !== "smart_auto") issue(issues, "interfaceMode", "Interface mode must be smart_auto.");
  if (!Array.isArray(value.artifactTargets)) issue(issues, "artifactTargets", "Expected recommendations."); else value.artifactTargets.forEach((item, index) => recommendation(item, `artifactTargets[${index}]`, issues, artifactTargets));
  recommendation(value.worldMode, "worldMode", issues, worldModes);
  recommendation(value.buildIntensity, "buildIntensity", issues, intensities);
  recommendation(value.generationQuality, "generationQuality", issues, qualities);
  recommendation(value.runtimeBudget, "runtimeBudget", issues, budgets);
  if (!Array.isArray(value.categories)) issue(issues, "categories", "Expected categories."); else {
    uniqueIds(value.categories, "categories", issues);
    value.categories.forEach((item, index) => { const path = `categories[${index}]`; if (!record(item)) { issue(issues, path, "Expected a category."); return; } ["id", "label", "purpose", "justification"].forEach(key => string(item[key], `${path}.${key}`, issues)); enumValue(item.status, categoryStatuses, `${path}.status`, issues); enumValue(item.detail, details, `${path}.detail`, issues); if (item.targetRange !== undefined) range(item.targetRange, `${path}.targetRange`, issues); enumValue(item.likelyRuntimeRole, runtimeRoles, `${path}.likelyRuntimeRole`, issues); if (!Array.isArray(item.candidateArchitectures)) issue(issues, `${path}.candidateArchitectures`, "Expected candidate architectures."); else item.candidateArchitectures.forEach((candidate, candidateIndex) => recommendation(candidate, `${path}.candidateArchitectures[${candidateIndex}]`, issues)); if (item.userLocked !== false) issue(issues, `${path}.userLocked`, "User lock must be false in v1."); stringArray(item.evidenceRefs, `${path}.evidenceRefs`, issues, item.status !== "omitted"); });
  }
  if (!Array.isArray(value.mechanicPacks)) issue(issues, "mechanicPacks", "Expected mechanic packs."); else { uniqueIds(value.mechanicPacks, "mechanicPacks", issues); value.mechanicPacks.forEach((item, index) => { const path = `mechanicPacks[${index}]`; if (!record(item)) { issue(issues, path, "Expected a mechanic pack."); return; } string(item.label, `${path}.label`, issues); enumValue(item.status, mechanicStatuses, `${path}.status`, issues); string(item.reason, `${path}.reason`, issues); stringArray(item.evidenceRefs, `${path}.evidenceRefs`, issues, true); }); }
  if (!record(value.assessments)) issue(issues, "assessments", "Expected assessments."); else for (const key of ["ordinaryLife", "worldAutonomy"] as const) { const assessment = value.assessments[key]; const path = `assessments.${key}`; if (!record(assessment)) { issue(issues, path, "Expected an assessment."); continue; } enumValue(assessment.status, assessmentStatuses, `${path}.status`, issues); stringArray(assessment.evidenceRefs, `${path}.evidenceRefs`, issues); stringArray(assessment.gaps, `${path}.gaps`, issues); string(assessment.explanation, `${path}.explanation`, issues); }
  if (!record(value.inventory)) issue(issues, "inventory", "Expected inventory estimates."); else { range(value.inventory.nodes, "inventory.nodes", issues); range(value.inventory.modelCalls, "inventory.modelCalls", issues); stringArray(value.inventory.artifacts, "inventory.artifacts", issues); }
  if (!Array.isArray(value.findings)) issue(issues, "findings", "Expected findings."); else { uniqueIds(value.findings, "findings", issues); value.findings.forEach((item, index) => { const path = `findings[${index}]`; if (!record(item)) { issue(issues, path, "Expected a finding."); return; } string(item.code, `${path}.code`, issues); string(item.message, `${path}.message`, issues); enumValue(item.severity, findingSeverities, `${path}.severity`, issues); stringArray(item.evidenceRefs, `${path}.evidenceRefs`, issues); }); }
  if (!string(value.createdAt, "createdAt", issues) || Number.isNaN(Date.parse(value.createdAt as string))) issue(issues, "createdAt", "Expected an ISO timestamp.");
  return issues.length ? { ok: false, issues } : { ok: true, value: value as unknown as BlueprintPlanV1 };
}

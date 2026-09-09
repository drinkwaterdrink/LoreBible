import { PROJECT_GRAPH_SCHEMA, USER_AGENCY_RESERVATIONS, type ProjectGraphV1 } from "../../contracts/projectGraph";

export type ProjectGraphParseResult = { ok: true; value: ProjectGraphV1 } | { ok: false; issues: Array<{ path: string; message: string }> };
const record = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === "object" && !Array.isArray(value));

export function parseProjectGraph(value: unknown): ProjectGraphParseResult {
  const issues: Array<{ path: string; message: string }> = [];
  if (!record(value)) return { ok: false, issues: [{ path: "", message: "Expected an object." }] };
  if (value.schema !== PROJECT_GRAPH_SCHEMA) issues.push({ path: "schema", message: "Unsupported Project Graph schema." });
  if (!record(value.project) || typeof value.project.id !== "string") issues.push({ path: "project", message: "Project identity is required." });
  if (!record(value.agency) || value.agency.protectedSubject !== "{{user}}" || JSON.stringify(value.agency.reserved) !== JSON.stringify(USER_AGENCY_RESERVATIONS)) issues.push({ path: "agency.reserved", message: "The complete user-agency reservation set is required." });
  const collections = ["canon", "entities", "relationships", "knowledge", "temporalSnapshots", "ownership", "sources", "dependencies", "artifacts", "builds", "decisions", "unresolved"] as const;
  for (const key of collections) if (!Array.isArray(value[key])) issues.push({ path: key, message: "Expected an array." });
  if (!record(value.validation) || !Array.isArray(value.validation.findings)) issues.push({ path: "validation", message: "Validation ledger is required." });
  if (!record(value.extensions)) issues.push({ path: "extensions", message: "Extensions must be an object." });
  if (issues.length) return { ok: false, issues };

  const ids = new Map<string, string>();
  for (const key of collections) for (const [index, item] of (value[key] as any[]).entries()) {
    if (!record(item) || typeof item.id !== "string" || !item.id) { issues.push({ path: `${key}[${index}].id`, message: "Stable ID is required." }); continue; }
    if (ids.has(item.id)) issues.push({ path: `${key}[${index}].id`, message: `Duplicate stable ID also used at ${ids.get(item.id)}.` });
    else ids.set(item.id, `${key}[${index}].id`);
  }
  const entityIds = new Set((value.entities as any[]).map((item) => item.id));
  const factIds = new Set((value.canon as any[]).map((item) => item.id));
  const artifactIds = new Set((value.artifacts as any[]).map((item) => item.id));
  (value.canon as any[]).forEach((item, index) => { if (!entityIds.has(item.subjectId)) issues.push({ path: `canon[${index}].subjectId`, message: "Unknown entity." }); });
  (value.entities as any[]).forEach((item, index) => (item.factIds || []).forEach((id: string) => { if (!factIds.has(id)) issues.push({ path: `entities[${index}].factIds`, message: `Unknown fact ${id}.` }); }));
  (value.relationships as any[]).forEach((item, index) => {
    if (!entityIds.has(item.sourceEntityId)) issues.push({ path: `relationships[${index}].sourceEntityId`, message: "Unknown source entity." });
    if (!entityIds.has(item.targetEntityId)) issues.push({ path: `relationships[${index}].targetEntityId`, message: "Unknown target entity." });
    if (item.sourceEntityId === item.targetEntityId) issues.push({ path: `relationships[${index}]`, message: "Relationship must be directional between distinct entities." });
  });
  (value.knowledge as any[]).forEach((item, index) => {
    if (!entityIds.has(item.entityId)) issues.push({ path: `knowledge[${index}].entityId`, message: "Unknown entity." });
    if (!factIds.has(item.factId)) issues.push({ path: `knowledge[${index}].factId`, message: "Unknown fact." });
  });
  (value.dependencies as any[]).forEach((item, index) => {
    if (!artifactIds.has(item.fromId)) issues.push({ path: `dependencies[${index}].fromId`, message: "Unknown artifact." });
    if (!artifactIds.has(item.toId)) issues.push({ path: `dependencies[${index}].toId`, message: "Unknown artifact." });
  });
  return issues.length ? { ok: false, issues } : { ok: true, value: value as unknown as ProjectGraphV1 };
}

import type { Entry, LoreBibleDocument } from "../../types";
import type { SavedLoreBibleProjectV2 } from "../projectPersistence";
import { PROJECT_GRAPH_SCHEMA, USER_AGENCY_RESERVATIONS, type CanonFact, type EntityRecord, type EntityType, type KnowledgeClaim, type OwnershipRecord, type ProjectGraphMigrationResult, type ProjectGraphV1, type RelationshipEdge, type TemporalClass } from "../../contracts/projectGraph";
import { canonicalizeJson, sha256Hex } from "./canonicalJson";
import { parseProjectGraph } from "./validation";

export interface ProjectGraphMigrationOptions { migratedAt: string; }

function stableId(namespace: string, sourceProjectId: string, path: string): string {
  return `${namespace}:${sha256Hex(`${sourceProjectId}\0${path}`).slice(0, 20)}`;
}

function assertNoCredentialFields(value: unknown, path = "source", seen = new Set<object>()): void {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) throw new Error("Project source must be JSON-serializable before migration.");
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.forEach((item, index) => assertNoCredentialFields(item, `${path}[${index}]`, seen));
    for (const [key, item] of Object.entries(value)) {
      if (/^(api[_-]?key|credential|access[_-]?token|secret[_-]?key)$/i.test(key)) throw new Error(`Portable migration refused credential-shaped field at ${path}.${key}.`);
      assertNoCredentialFields(item, `${path}.${key}`, seen);
    }
  } finally { seen.delete(value); }
}

const firstText = (entry: Entry, fallback: string) => entry.fields.name || entry.fields.title || entry.fields.label || fallback;

export function migrateSavedProjectV2ToGraph(source: SavedLoreBibleProjectV2, options: ProjectGraphMigrationOptions): ProjectGraphMigrationResult {
  assertNoCredentialFields(source);
  const sourceCanonicalJson = canonicalizeJson(source);
  const projectId = source.document.id;
  const sourceEvidenceId = stableId("source", projectId, "saved-project-v2");
  const worldEntityId = stableId("entity", projectId, "document");
  const entities: EntityRecord[] = [{ id: worldEntityId, type: "concept", name: source.document.title || "Untitled Project", aliases: [], importance: "principal", lifecycle: "active", factIds: [], relationshipIds: [], sourceEvidenceIds: [sourceEvidenceId] }];
  const canon: CanonFact[] = [];
  const ownership: OwnershipRecord[] = [];
  const relationships: RelationshipEdge[] = [];
  const knowledge: KnowledgeClaim[] = [];
  const unresolved: ProjectGraphV1["unresolved"] = [];

  const addFact = (subjectId: string, path: string, predicate: string, value: unknown, temporalClass: TemporalClass = "evergreen") => {
    if (value === "" || value === null || value === undefined || (Array.isArray(value) && value.length === 0)) return undefined;
    const id = stableId("fact", projectId, path);
    canon.push({ id, subjectId, predicate, value, status: "provisional", origin: "approved_project", confidence: 1, visibility: "public", temporalClass, sourceEvidenceIds: [sourceEvidenceId] });
    const entity = entities.find((item) => item.id === subjectId);
    if (entity) entity.factIds.push(id);
    return id;
  };
  addFact(worldEntityId, "document.sparkText", "premise", source.document.sparkText);
  for (const [key, value] of Object.entries(source.document.core)) if (key !== "permanence") addFact(worldEntityId, `document.core.${key}`, `core.${key}`, value);
  const currentFactId = addFact(worldEntityId, "document.status.content", "status.current", source.document.status?.content, "current");
  if (currentFactId) ownership.push({ id: stableId("owner", projectId, "document.status.content"), factId: currentFactId, owner: "mutable_state", rationale: "V2 status is mutable current state, not evergreen lore.", origin: "approved_project" });
  const openingFactIds: string[] = [];
  for (const key of ["firstLocation", "firstNpc", "firstChoice", "firstMessage"] as const) {
    const factId = addFact(worldEntityId, `document.opening.${key}`, `opening.${key}`, source.document.opening?.[key], "initial");
    if (factId) { openingFactIds.push(factId); ownership.push({ id: stableId("owner", projectId, `document.opening.${key}`), factId, owner: key === "firstMessage" ? "first_message" : "scenario", rationale: "Opening-only state belongs to the playable start.", origin: "approved_project" }); }
  }

  const sectionTypes: Array<[keyof LoreBibleDocument, EntityType]> = [["locations", "location"], ["factions", "faction"], ["npcs", "character"], ["items", "item"]];
  const byName = new Map<string, string[]>();
  for (const [section, type] of sectionTypes) for (const [index, entry] of ((source.document[section] || []) as Entry[]).entries()) {
    const path = `document.${section}[${entry.id || index}]`;
    const id = stableId("entity", projectId, path);
    const name = firstText(entry, `${type} ${index + 1}`);
    const entity: EntityRecord = { id, type, name, aliases: [...new Set(entry.keys.filter(Boolean))], importance: type === "character" ? "supporting" : "reference", lifecycle: "active", factIds: [], relationshipIds: [], sourceEvidenceIds: [sourceEvidenceId] };
    entities.push(entity);
    const lookup = name.trim().toLowerCase();
    byName.set(lookup, [...(byName.get(lookup) || []), id]);
    for (const [field, value] of Object.entries(entry.fields)) addFact(id, `${path}.fields.${field}`, field, value);
  }

  const resolve = (name: string) => {
    const matches = byName.get(name.trim().toLowerCase()) || [];
    return matches.length === 1 ? matches[0] : null;
  };
  for (const [index, entry] of source.document.relationshipWeb.entries()) {
    const path = `document.relationshipWeb[${entry.id || index}]`;
    const sourceId = resolve(entry.fields.source || "");
    const targetId = resolve(entry.fields.target || "");
    if (sourceId && targetId && sourceId !== targetId) {
      const id = stableId("relationship", projectId, path);
      relationships.push({ id, sourceEntityId: sourceId, targetEntityId: targetId, publicDynamic: entry.fields.publicDynamic || entry.fields.dynamic || entry.fields.body, privateDynamic: entry.fields.privateDynamic, sourceView: entry.fields.sourceView, targetView: entry.fields.targetView, tension: entry.fields.tension, leverage: entry.fields.leverage, status: "provisional", origin: "approved_project", factIds: [] });
      entities.find((item) => item.id === sourceId)!.relationshipIds.push(id);
      entities.find((item) => item.id === targetId)!.relationshipIds.push(id);
    } else {
      addFact(worldEntityId, path, "relationship.unresolved", entry.fields);
      unresolved.push({ id: stableId("unresolved", projectId, path), code: "migration.relationship_unresolved", path, message: "Relationship endpoints could not be resolved uniquely without guessing.", severity: "minor" });
    }
  }
  for (const [index, entry] of source.document.knowledgeMap.entries()) {
    const path = `document.knowledgeMap[${entry.id || index}]`;
    const entityId = resolve(entry.fields.entity || entry.fields.character || "");
    const content = entry.fields.fact || entry.fields.belief || entry.fields.body;
    if (entityId && content) {
      const factId = addFact(worldEntityId, `${path}.fact`, "knowledge.subject", content)!;
      const allowed = new Set(["knows", "believes", "suspects", "misunderstands", "unaware"]);
      const state = allowed.has(entry.fields.state) ? entry.fields.state as KnowledgeClaim["state"] : "believes";
      knowledge.push({ id: stableId("knowledge", projectId, path), factId, entityId, state, origin: "approved_project" });
    } else unresolved.push({ id: stableId("unresolved", projectId, path), code: "migration.knowledge_unresolved", path, message: "Knowledge claim could not be linked without guessing.", severity: "minor" });
  }

  const graph: ProjectGraphV1 = {
    schema: PROJECT_GRAPH_SCHEMA,
    project: { id: stableId("project", projectId, "root"), name: source.document.title || null, version: "1", status: "active", targetPlatform: "lumiverse", mode: "legacy_migrated", revision: 1 },
    authority: { sourceOrder: ["user", "approved_project", "lumiverse_docs_technical", "external_reference", "generated"] },
    agency: { protectedSubject: "{{user}}", reserved: [...USER_AGENCY_RESERVATIONS] },
    canon, entities, relationships, knowledge,
    temporalSnapshots: openingFactIds.length ? [{ id: stableId("snapshot", projectId, "opening"), label: "Opening state", class: "initial", factIds: openingFactIds, worldTime: null, recordedAt: source.savedAt, origin: "approved_project" }] : [],
    ownership, sources: [{ id: sourceEvidenceId, kind: "saved_project", locator: "SavedLoreBibleProjectV2", checksum: sha256Hex(sourceCanonicalJson), observedAt: options.migratedAt }], dependencies: [], artifacts: [], builds: [],
    validation: { status: "not_run", findings: [], lastRun: null },
    decisions: [{ id: stableId("decision", projectId, "migration-authority"), question: "How should uncertain V2 authored material be classified?", decision: "Preserve as provisional approved-project material until reviewed.", status: "accepted", origin: "approved_project" }],
    unresolved, extensions: { legacySourceSchema: 2 },
  };
  const parsed = parseProjectGraph(graph);
  const validationStatus = parsed.ok ? "pass" : "blocked";
  if ("issues" in parsed) throw new Error(`Migrated Project Graph failed validation: ${parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
  return { graph, receipt: { schema: "lorebible.project-graph-migration/v1", sourceSchema: 2, targetSchema: PROJECT_GRAPH_SCHEMA, sourceSha256: sha256Hex(sourceCanonicalJson), sourceCanonicalJson, migratedAt: options.migratedAt, counts: { entities: entities.length, facts: canon.length, relationships: relationships.length, knowledge: knowledge.length, unresolved: unresolved.length }, decisions: ["V2 remains the live save authority.", "Uncertain extracted material remains provisional."], warnings: unresolved.map((item) => item.message), unresolvedIds: unresolved.map((item) => item.id), validationStatus } };
}

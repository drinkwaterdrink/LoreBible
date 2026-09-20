import type { EntityType, ForgeBuildRecordV1, ForgeCategoryRecordV1, ProjectGraphV1 } from "../../contracts/projectGraph";

export interface ForgeEndpoint {
  status: "resolved" | "missing" | "ambiguous" | "not_applicable";
  targetId: string | null;
  targetKind: "graph_entity" | "forge_entity" | null;
  candidateIds: string[];
}

export interface ForgeLinkedRecord {
  recordId: string;
  kind: "relationship" | "knowledge";
  source?: ForgeEndpoint;
  target?: ForgeEndpoint;
  knownBy?: ForgeEndpoint;
  suspectedBy?: ForgeEndpoint;
  truthFactId?: null;
}

export interface ForgeLinkFinding { recordId: string; path: string; code: string; candidateIds: string[] }
export interface ForgeLinkReport {
  buildId: string;
  graphRevision: number;
  status: "ready" | "unsupported";
  records: ForgeLinkedRecord[];
  findings: ForgeLinkFinding[];
}

interface Candidate { id: string; kind: "graph_entity" | "forge_entity"; type: EntityType; names: string[]; sourceEntryId?: string | null }
const normalize = (value: string) => value.trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
const idLike = (value: string) => /^(entity:|forge-category:)/i.test(value);
const missing = (): ForgeEndpoint => ({ status: "missing", targetId: null, targetKind: null, candidateIds: [] });
const notApplicable = (): ForgeEndpoint => ({ status: "not_applicable", targetId: null, targetKind: null, candidateIds: [] });

function makeCandidates(graph: ProjectGraphV1, records: readonly ForgeCategoryRecordV1[]): Candidate[] {
  const graphCandidates: Candidate[] = graph.entities.map(entity => ({ id: entity.id, kind: "graph_entity", type: entity.type, names: [entity.name, ...entity.aliases] }));
  const forgeCandidates: Candidate[] = records.flatMap(record => record.projection?.kind === "entity" ? [{ id: record.id, kind: "forge_entity" as const, type: record.projection.entityType, names: [record.projection.name ?? record.semanticName ?? ""], sourceEntryId: record.sourceEntryId }] : []);
  return [...graphCandidates, ...forgeCandidates];
}

function resolve(value: string | null, candidates: readonly Candidate[], type: EntityType | null): ForgeEndpoint {
  if (!value || !value.trim() || normalize(value) === "{{user}}") return missing();
  const exactId = candidates.filter(candidate => candidate.id === value || candidate.sourceEntryId === value);
  const matches = exactId.length || idLike(value) ? exactId : candidates.filter(candidate => candidate.names.some(name => name && normalize(name) === normalize(value)));
  const eligible = [...new Map(matches.filter(candidate => type === null || candidate.type === type).map(candidate => [candidate.id, candidate])).values()].sort((a, b) => a.id.localeCompare(b.id));
  if (eligible.length === 0) return missing();
  if (eligible.length > 1) return { status: "ambiguous", targetId: null, targetKind: null, candidateIds: eligible.map(candidate => candidate.id) };
  return { status: "resolved", targetId: eligible[0].id, targetKind: eligible[0].kind, candidateIds: [eligible[0].id] };
}

export function resolveForgeLinks(graph: ProjectGraphV1, buildId: string): ForgeLinkReport {
  const build = graph.builds.find(item => item.id === buildId && item.kind === "forge") as ForgeBuildRecordV1 | undefined;
  const base: ForgeLinkReport = { buildId, graphRevision: graph.project.revision ?? 0, status: "unsupported", records: [], findings: [] };
  if (!build || !Array.isArray(build.categoryRecords)) return base;
  const candidates = makeCandidates(graph, build.categoryRecords);
  const records: ForgeLinkedRecord[] = [];
  const findings: ForgeLinkFinding[] = [];
  const addFinding = (recordId: string, path: string, endpoint: ForgeEndpoint) => {
    if (endpoint.status === "resolved") return;
    findings.push({ recordId, path, code: endpoint.status === "ambiguous" ? "forge.link.ambiguous" : "forge.link.missing", candidateIds: endpoint.candidateIds });
  };
  for (const record of build.categoryRecords) {
    const projection = record.projection;
    if (projection?.kind === "relationship") {
      const source = resolve(projection.sourceName, candidates, null);
      const target = resolve(projection.targetName, candidates, null);
      records.push({ recordId: record.id, kind: "relationship", source, target });
      addFinding(record.id, "source", source);
      addFinding(record.id, "target", target);
      if (source.targetId && source.targetId === target.targetId) findings.push({ recordId: record.id, path: "target", code: "forge.link.self_reference", candidateIds: [source.targetId] });
    } else if (projection?.kind === "knowledge") {
      const knownBy = projection.knownBy ? resolve(projection.knownBy, candidates, "character") : notApplicable();
      const suspectedBy = projection.suspectedBy ? resolve(projection.suspectedBy, candidates, "character") : notApplicable();
      records.push({ recordId: record.id, kind: "knowledge", knownBy, suspectedBy, truthFactId: null });
      if (projection.knownBy) addFinding(record.id, "knownBy", knownBy);
      if (projection.suspectedBy) addFinding(record.id, "suspectedBy", suspectedBy);
      findings.push({ recordId: record.id, path: "truth", code: "forge.link.fact_acceptance_required", candidateIds: [] });
    }
  }
  records.sort((a, b) => a.recordId.localeCompare(b.recordId));
  findings.sort((a, b) => a.recordId.localeCompare(b.recordId) || a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
  return { ...base, status: "ready", records, findings };
}

export function summarizeForgeLinks(report: ForgeLinkReport): { resolved: number; unresolved: number; unsupported: boolean } {
  if (report.status === "unsupported") return { resolved: 0, unresolved: 0, unsupported: true };
  const endpoints = report.records.flatMap(item => item.kind === "relationship" ? [item.source, item.target] : [item.knownBy, item.suspectedBy]).filter((item): item is ForgeEndpoint => item !== undefined);
  return { resolved: endpoints.filter(item => item.status === "resolved").length, unresolved: endpoints.filter(item => item.status !== "resolved" && item.status !== "not_applicable").length + report.findings.filter(item => item.code === "forge.link.self_reference").length, unsupported: false };
}

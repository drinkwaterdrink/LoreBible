import { expect, test } from "bun:test";
import type { ForgeBuildRecordV1, ProjectGraphV1 } from "../../src/contracts/projectGraph";
import { projectForgeSections, deriveForgeSectionsFromCategoryRecords } from "../../src/lib/projectGraph/forgeCategoryRecords";
import { resolveForgeLinks, summarizeForgeLinks } from "../../src/lib/projectGraph/forgeCrossLinks";

function fixture() {
  const records = projectForgeSections("build:one", 2, {
    npcs: [
      { id: "npc:mara", fields: { name: "Mara" } },
      { id: "npc:vale", fields: { name: "Vale" } },
    ],
    relationshipWeb: [{ id: "rel:one", fields: { source: "Mara", target: "Vale", bond: "Former partners" } }],
    knowledgeMap: [{ id: "knowledge:one", fields: { truth: "The bell is cracked", knows: "Mara", suspects: "Vale" } }],
  });
  const build = { id: "build:one", kind: "forge", categoryRecords: records, checkpoint: { sections: deriveForgeSectionsFromCategoryRecords(records) } } as ForgeBuildRecordV1;
  const graph = { project: { revision: 7 }, entities: [], builds: [build] } as unknown as ProjectGraphV1;
  return { graph, build, records };
}

test("resolves unique generated entities by stable proposal ID without promoting canon", () => {
  const { graph, records } = fixture();
  const before = structuredClone(graph);
  const report = resolveForgeLinks(graph, "build:one");
  const relation = report.records.find(item => item.recordId === records[2].id);
  expect(relation?.source).toMatchObject({ status: "resolved", targetId: records[0].id, targetKind: "forge_entity" });
  expect(relation?.target).toMatchObject({ status: "resolved", targetId: records[1].id, targetKind: "forge_entity" });
  expect(graph).toEqual(before);
  expect(graph.relationships).toBeUndefined();
});

test("reports shared names and alias collisions rather than choosing a candidate", () => {
  const { graph, records } = fixture();
  graph.entities = [
    { id: "entity:other", type: "character", name: "Other", aliases: ["Mara"], importance: "major", lifecycle: "active", factIds: [], relationshipIds: [], sourceEvidenceIds: [] },
  ];
  const report = resolveForgeLinks(graph, "build:one");
  expect(report.records.find(item => item.recordId === records[2].id)?.source).toMatchObject({ status: "ambiguous", targetId: null });
  expect(report.findings.map(item => item.code)).toContain("forge.link.ambiguous");
});

test("resolves a renamed graph entity through its former alias with the same stable ID", () => {
  const { graph, records } = fixture();
  graph.entities = [{ id: "entity:mara", type: "character", name: "Captain Mara", aliases: ["Mara"], importance: "major", lifecycle: "active", factIds: [], relationshipIds: [], sourceEvidenceIds: [] }];
  // Remove the generated Mara so its old name has exactly one owner.
  graph.builds[0] = { ...graph.builds[0], categoryRecords: records.slice(1) } as ForgeBuildRecordV1;
  const source = resolveForgeLinks(graph, "build:one").records.find(item => item.recordId === records[2].id)?.source;
  expect(source).toMatchObject({ status: "resolved", targetId: "entity:mara", targetKind: "graph_entity" });
});

test("rejects self-links without changing a generated relationship", () => {
  const { graph, records } = fixture();
  (records[2].projection as { targetName: string }).targetName = "Mara";
  const report = resolveForgeLinks(graph, "build:one");
  expect(report.findings.map(item => item.code)).toContain("forge.link.self_reference");
  expect(records[2].payload).toEqual({ id: "rel:one", fields: { source: "Mara", target: "Vale", bond: "Former partners" } });
});

test("uses explicit stable IDs, rejects unknown IDs, and does not create a user entity", () => {
  const { graph, build } = fixture();
  build.categoryRecords = projectForgeSections("build:one", 2, {
    npcs: [{ id: "npc:mara", fields: { name: "Mara" } }],
    relationshipWeb: [
      { id: "rel:ids", fields: { source: "npc:mara", target: "{{user}}" } },
      { id: "rel:missing", fields: { source: "entity:unknown", target: "Mara" } },
    ],
  });
  const report = resolveForgeLinks(graph, "build:one");
  expect(report.records[0].source).toMatchObject({ status: "resolved", targetId: build.categoryRecords[0].id });
  expect(report.records[0].target.status).toBe("missing");
  expect(report.records[1].source.status).toBe("missing");
});

test("knowledge retains fact dependency and does not split ambiguous people text", () => {
  const { graph, records } = fixture();
  const knowledge = resolveForgeLinks(graph, "build:one").records.find(item => item.recordId === records[3].id);
  expect(knowledge?.knownBy).toMatchObject({ status: "resolved", targetId: records[0].id });
  expect(knowledge?.suspectedBy).toMatchObject({ status: "resolved", targetId: records[1].id });
  expect(knowledge?.truthFactId).toBeNull();
  (records[3].projection as { knownBy: string }).knownBy = "Mara, Vale";
  expect(resolveForgeLinks(graph, "build:one").records.find(item => item.recordId === records[3].id)?.knownBy.status).toBe("missing");
});

test("omitted optional knowledge audiences are not counted as broken links", () => {
  const { graph, records } = fixture();
  (records[3].projection as { knownBy: string | null; suspectedBy: string | null }).knownBy = null;
  (records[3].projection as { knownBy: string | null; suspectedBy: string | null }).suspectedBy = null;
  const report = resolveForgeLinks(graph, "build:one");
  const knowledge = report.records.find(item => item.recordId === records[3].id);
  expect(knowledge?.knownBy?.status).toBe("not_applicable");
  expect(knowledge?.suspectedBy?.status).toBe("not_applicable");
  expect(summarizeForgeLinks(report)).toEqual({ resolved: 2, unresolved: 0, unsupported: false });
});

test("legacy builds are unsupported, while report order and revision are stable", () => {
  const { graph, build } = fixture();
  const first = resolveForgeLinks(graph, "build:one");
  build.categoryRecords = [...build.categoryRecords!].reverse();
  expect(resolveForgeLinks(graph, "build:one")).toEqual(first);
  graph.project.revision = 8;
  expect(resolveForgeLinks(graph, "build:one").graphRevision).toBe(8);
  delete build.categoryRecords;
  const legacy = resolveForgeLinks(graph, "build:one");
  expect(legacy).toMatchObject({ status: "unsupported", records: [] });
  expect(summarizeForgeLinks(legacy)).toEqual({ resolved: 0, unresolved: 0, unsupported: true });
});

test("summary counts unresolved endpoints but never claims acceptance", () => {
  const { graph, records } = fixture();
  (records[2].projection as { targetName: string }).targetName = "Missing";
  const report = resolveForgeLinks(graph, "build:one");
  expect(summarizeForgeLinks(report)).toEqual({ resolved: 3, unresolved: 1, unsupported: false });
});

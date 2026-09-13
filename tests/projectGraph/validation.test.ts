import { expect, test } from "bun:test";
import { parseProjectGraph } from "../../src/lib/projectGraph/validation";
import { beginForgeBatch, completeForgeBatch, createForgeBuild } from "../../src/lib/projectGraph/forgeBuilds";

const graph = () => ({
  schema: "lorebible.project-graph/v1",
  project: { id: "project:one", name: "One", version: "1", status: "active", targetPlatform: "lumiverse", mode: "graph_native" },
  authority: { sourceOrder: ["user", "approved_project", "lumiverse_docs_technical", "external_reference", "generated"] },
  agency: { protectedSubject: "{{user}}", reserved: ["actions", "dialogue", "thoughts", "feelings", "attraction", "consent", "decisions", "relationships", "abilities", "backstory", "next_voluntary_action"] },
  canon: [{ id: "fact:one", subjectId: "entity:one", predicate: "name", value: "A", status: "provisional", origin: "generated", confidence: 1, visibility: "public", temporalClass: "evergreen", sourceEvidenceIds: [] }],
  entities: [{ id: "entity:one", type: "character", name: "A", aliases: [], importance: "major", lifecycle: "active", factIds: ["fact:one"], relationshipIds: [], sourceEvidenceIds: [] }],
  relationships: [], knowledge: [], temporalSnapshots: [], ownership: [], sources: [], dependencies: [], artifacts: [], builds: [],
  validation: { status: "not_run", findings: [], lastRun: null }, decisions: [], unresolved: [], extensions: { retained: { x: 1 } },
});

test("accepts a reference-complete graph and preserves extensions", () => {
  const result = parseProjectGraph(graph());
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.extensions).toEqual({ retained: { x: 1 } });
});

test("rejects duplicate stable IDs and missing references with paths", () => {
  const value = graph();
  value.entities.push({ ...value.entities[0] });
  value.canon[0].subjectId = "entity:missing";
  const result = parseProjectGraph(value);
  expect(result.ok).toBe(false);
  if ("issues" in result) {
    expect(result.issues.some((issue) => issue.path === "entities[1].id")).toBe(true);
    expect(result.issues.some((issue) => issue.path === "canon[0].subjectId")).toBe(true);
  }
});

test("rejects an incomplete agency reservation set", () => {
  const value = graph();
  value.agency.reserved = ["actions"];
  const result = parseProjectGraph(value);
  expect(result.ok).toBe(false);
  if ("issues" in result) expect(result.issues.some((issue) => issue.path === "agency.reserved")).toBe(true);
});

test("requires directional relationships and valid knowledge endpoints", () => {
  const value = graph() as any;
  value.relationships = [{ id: "rel:one", sourceEntityId: "entity:one", targetEntityId: "entity:missing", status: "provisional", origin: "generated", factIds: [] }];
  value.knowledge = [{ id: "knowledge:one", factId: "fact:missing", entityId: "entity:one", state: "believes", origin: "generated" }];
  const result = parseProjectGraph(value);
  expect(result.ok).toBe(false);
  if ("issues" in result) {
    expect(result.issues.some((issue) => issue.path === "relationships[0].targetEntityId")).toBe(true);
    expect(result.issues.some((issue) => issue.path === "knowledge[0].factId")).toBe(true);
  }
});

test("rejects malformed durable Forge builds instead of accepting an unusable checkpoint", () => {
  const value = graph() as any;
  value.builds = [{ id:"build:one", kind:"forge", schema:"lorebible.forge-build/v1", stage:"forge", status:"active", artifactIds:[], sourceRevision:1, executionMode:"continuous", inputFingerprint:"sha256:abc", createdAt:"x", updatedAt:"x", batches:[], checkpoint:{completedBundleCount:1,sections:{core:{}}} }];
  const result = parseProjectGraph(value);
  expect(result.ok).toBe(false);
  if ("issues" in result) expect(result.issues.some((issue) => issue.path === "builds[0].batches")).toBe(true);
});

test("rejects Forge checkpoints that disagree with completed bundle records", () => {
  const value = graph() as any;
  const build = createForgeBuild({ id:"build:one", sourceRevision:1, inputFingerprint:"sha256:abc", executionMode:"continuous", createdAt:"x" });
  build.batches[0].status="complete";build.batches[0].sections={core:{},user:{},worldPhysics:{},status:{}};
  value.builds=[build];
  const result=parseProjectGraph(value);
  expect(result.ok).toBe(false);
  if("issues" in result)expect(result.issues.some((issue)=>issue.path==="builds[0].checkpoint")).toBe(true);
});

test("rejects Forge category records that no longer derive the accepted checkpoint", () => {
  const value = graph() as any;
  let build = createForgeBuild({ id:"build:categories", sourceRevision:1, inputFingerprint:"sha256:abc", executionMode:"continuous", createdAt:"x" });
  build = beginForgeBatch(build,{bundleIndex:0,attemptId:"attempt/one",provider:"gemini",modelId:"gemini-flash",route:"openai_compatible",startedAt:"x"});
  build = completeForgeBatch(build,{bundleIndex:0,attemptId:"attempt/one",commandId:"done",sections:{core:{title:"Accepted"},user:{},worldPhysics:{},status:{}},completedAt:"y"});
  build.categoryRecords![0].payload={title:"Tampered"};value.builds=[build];const parsed=parseProjectGraph(value);
  expect(parsed.ok).toBe(false);if("issues" in parsed)expect(parsed.issues.some(issue=>issue.path.includes("categoryRecords"))).toBe(true);
});

test("reports malformed Forge category records without throwing",()=>{
  const value=graph() as any;const build=createForgeBuild({id:"build:malformed-categories",sourceRevision:1,inputFingerprint:"sha256:abc",executionMode:"continuous",createdAt:"x"}) as any;build.categoryRecords=[null];value.builds=[build];expect(()=>parseProjectGraph(value)).not.toThrow();const parsed=parseProjectGraph(value);expect(parsed.ok).toBe(false);if("issues" in parsed)expect(parsed.issues.some(issue=>issue.path.includes("categoryRecords"))).toBe(true);
});

import { expect, test } from "bun:test";
import type { ForgeJobV1, ProjectGraphV1 } from "../../src/contracts/projectGraph";
import { applyProjectGraphCommand, type ProjectGraphCommand } from "../../src/lib/projectGraph/commands";
import { createForgeBuild, beginForgeBatch, completeForgeBatch } from "../../src/lib/projectGraph/forgeBuilds";

const at = "2026-09-20T12:00:00Z";
const fingerprint = "sha256:source";
const job = (id: string, entryId: string, ordinal=0): ForgeJobV1 => ({ version: 1, id, bundleIndex: 4, ordinal, kind: "bundle5_section", destinations: ["history"], entryIds: [entryId], dependencies: [], schemaId: "forge.bundle5.history/v1", schemaVersion: 1, promptHash: "sha256:prompt", inputFingerprint: fingerprint, estimatedOutputTokens: 500, splitDepth: 0 });
const entry = (id: string) => ({ id, fields: { name: "The Founding", event: "Founded", era: "Past", consequence: "Still remembered" }, keys: ["The Founding"], permanence: "P", locked: false });

function preparedGraph(): ProjectGraphV1 {
  let build = createForgeBuild({ id: "build/1", sourceRevision: 1, inputFingerprint: fingerprint, executionMode: "continuous", createdAt: at });
  const sections = [
    { core: {}, user: {}, worldPhysics: {}, status: {} },
    { locations: [], factions: [] },
    { npcs: [], relationshipWeb: [], knowledgeMap: [] },
    { items: [], secrets: [], conflict: {}, pressureProtocol: "" },
  ];
  sections.forEach((part, index) => {
    build = beginForgeBatch(build, { bundleIndex: index, attemptId: `attempt/${index}`, provider: "gemini", modelId: "flash", route: "gemini_native", startedAt: at });
    build = completeForgeBatch(build, { bundleIndex: index, attemptId: `attempt/${index}`, commandId: `done/${index}`, sections: part, completedAt: at });
  });
  return { schema: "lorebible.project-graph/v1", project: { id: "project/1", name: "World", version: "1", status: "active", targetPlatform: "lumiverse", mode: "graph_native", revision: 2 }, authority: { sourceOrder: ["user"] }, agency: { protectedSubject: "{{user}}", reserved: ["actions", "dialogue", "thoughts", "feelings", "attraction", "consent", "decisions", "relationships", "abilities", "backstory", "next_voluntary_action"] }, canon: [], entities: [], relationships: [], knowledge: [], temporalSnapshots: [], ownership: [], sources: [], dependencies: [], artifacts: [], builds: [build], validation: { status: "not_run", findings: [], lastRun: null }, decisions: [], unresolved: [], extensions: {} };
}
function send(graph: ProjectGraphV1, command: ProjectGraphCommand, commandId: string) {
  return applyProjectGraphCommand(graph, { commandId, expectedRevision: graph.project.revision!, issuedAt: at, command }).graph;
}

test("graph transactions retain a completed specialist across bundle failure and model switch", () => {
  let graph = preparedGraph();
  graph = send(graph, { type: "forge.batch.begin", buildId: "build/1", bundleIndex: 4, attemptId: "attempt/bundle1", provider: "gemini", modelId: "flash", route: "gemini_native", inputFingerprint: fingerprint, sourceRevision: 1 }, "command/begin-bundle");
  graph = send(graph, { type: "forge.jobs.initialize", buildId: "build/1", planHash: "sha256:plan", inputFingerprint: fingerprint, sourceRevision: 1, jobs: [job("job/one", "entry/one"), job("job/two", "entry/two",1)] }, "command/init-jobs");
  graph = send(graph, { type: "forge.job.begin", buildId: "build/1", jobId: "job/one", attemptId: "attempt/job1", provider: "gemini", modelId: "flash", promptHash: "sha256:prompt", inputFingerprint: fingerprint, sourceRevision: 1 }, "command/begin-job1");
  graph = send(graph, { type: "forge.job.complete", buildId: "build/1", jobId: "job/one", attemptId: "attempt/job1", sections: { history: [entry("entry/one")] }, inputFingerprint: fingerprint, sourceRevision: 1 }, "command/complete-job1");
  graph = send(graph, { type: "forge.batch.fail", buildId: "build/1", bundleIndex: 4, attemptId: "attempt/bundle1", code: "REQUEST_TIMEOUT", message: "timeout", inputFingerprint: fingerprint, sourceRevision: 1 }, "command/fail-bundle");
  graph = structuredClone(graph);
  graph = send(graph, { type: "forge.batch.begin", buildId: "build/1", bundleIndex: 4, attemptId: "attempt/bundle2", provider: "openrouter", modelId: "new-model", route: "openai_compatible", inputFingerprint: fingerprint, sourceRevision: 1 }, "command/retry-bundle");
  const ledger = (graph.builds[0] as any).specialistLedger;
  expect(ledger.jobs.map((item: any) => item.status)).toEqual(["complete", "pending"]);
  expect(ledger.jobs[0].sections.history[0].id).toBe("entry/one");
  expect(() => send(graph, { type: "forge.job.begin", buildId: "build/1", jobId: "job/one", attemptId: "attempt/duplicate", provider: "openrouter", modelId: "new-model", promptHash: "sha256:prompt", inputFingerprint: fingerprint, sourceRevision: 1 }, "command/duplicate")).toThrow();
});

test("a saved specialist completion replays idempotently but rejects changed content", () => {
  let graph=preparedGraph();
  graph=send(graph,{type:"forge.batch.begin",buildId:"build/1",bundleIndex:4,attemptId:"attempt/bundle",provider:"gemini",modelId:"flash",route:"gemini_native",inputFingerprint:fingerprint,sourceRevision:1},"begin/bundle");
  graph=send(graph,{type:"forge.jobs.initialize",buildId:"build/1",planHash:"sha256:plan",jobs:[job("job/one","entry/one")],inputFingerprint:fingerprint,sourceRevision:1},"init/jobs");
  graph=send(graph,{type:"forge.job.begin",buildId:"build/1",jobId:"job/one",attemptId:"attempt/job",provider:"gemini",modelId:"flash",promptHash:"sha256:prompt",inputFingerprint:fingerprint,sourceRevision:1},"begin/job");
  const expectedRevision=graph.project.revision!;
  const command:ProjectGraphCommand={type:"forge.job.complete",buildId:"build/1",jobId:"job/one",attemptId:"attempt/job",sections:{history:[entry("entry/one")]},inputFingerprint:fingerprint,sourceRevision:1};
  const envelope={commandId:"complete/job",expectedRevision,issuedAt:at,command};
  graph=applyProjectGraphCommand(graph,envelope).graph;
  const replay=applyProjectGraphCommand(graph,envelope);
  expect(replay.graph.project.revision).toBe(graph.project.revision);
  expect(replay.receipt.changedIds).toEqual([]);
  expect(()=>applyProjectGraphCommand(graph,{...envelope,command:{...command,sections:{history:[entry("changed")]}}})).toThrow();
});

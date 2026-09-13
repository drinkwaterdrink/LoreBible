import { expect, test } from "bun:test";
import type { ProjectGraphV1 } from "../../src/contracts/projectGraph";
import {
  beginForgeBatch,
  completeForgeBatch,
  cancelForgeBatch,
  createForgeBuild,
  failForgeBatch,
  resumeForgeBuild,
  findRecoverableForgeBuild,
} from "../../src/lib/projectGraph/forgeBuilds";

function graph(): ProjectGraphV1 {
  return {
    schema: "lorebible.project-graph/v1",
    project: { id: "project/forge", name: "World", version: "1", status: "active", targetPlatform: "lumiverse", mode: "graph_native", revision: 7 },
    authority: { sourceOrder: ["user", "approved_project", "lumiverse_docs_technical", "external_reference", "generated"] },
    agency: { protectedSubject: "{{user}}", reserved: ["actions", "dialogue", "thoughts", "feelings", "attraction", "consent", "decisions", "relationships", "abilities", "backstory", "next_voluntary_action"] },
    canon: [], entities: [], relationships: [], knowledge: [], temporalSnapshots: [], ownership: [], sources: [], dependencies: [], artifacts: [], builds: [],
    validation: { status: "not_run", findings: [], lastRun: null }, decisions: [], unresolved: [], extensions: {},
  };
}

test("a new Forge build records six explicit pending bundles", () => {
  const build = createForgeBuild({ id: "build/1", sourceRevision: 7, inputFingerprint: "sha256:abc", executionMode: "step_by_step", createdAt: "2026-09-12T10:00:00Z" });
  expect(build.batches).toHaveLength(6);
  expect(build.batches.map((batch) => batch.status)).toEqual(["pending", "pending", "pending", "pending", "pending", "pending"]);
  expect(build.batches[2].expectedKeys).toEqual(["npcs", "relationshipWeb", "knowledgeMap"]);
  expect(build.checkpoint).toEqual({ completedBundleCount: 0, sections: {} });
});

test("accepted bundles resume after reload without regenerating completed work", () => {
  const build = createForgeBuild({ id: "build/1", sourceRevision: 7, inputFingerprint: "sha256:abc", executionMode: "step_by_step", createdAt: "2026-09-12T10:00:00Z" });
  const active = beginForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", provider: "gemini", modelId: "gemini-flash", route: "gemini_native", startedAt: "2026-09-12T10:01:00Z" });
  const completed = completeForgeBatch(active, { bundleIndex: 0, attemptId: "attempt/1", commandId: "complete/1", sections: { core: { title: "A" }, user: {}, worldPhysics: {}, status: {} }, completedAt: "2026-09-12T10:02:00Z" });
  const reloaded = structuredClone(completed);
  expect(resumeForgeBuild(reloaded, "sha256:abc", 7)).toMatchObject({ nextBundleIndex: 1, complete: false });
  expect(reloaded.checkpoint.sections.core).toEqual({ title: "A" });
  expect(reloaded.batches[0].status).toBe("complete");
  expect(reloaded.categoryRecords?.map((record) => record.sectionKey)).toEqual(["core", "user", "worldPhysics", "status"]);
  expect(Object.fromEntries(reloaded.categoryRecords!.map((record) => [record.sectionKey, record.payload]))).toEqual(reloaded.checkpoint.sections);
});

test("a failed retry preserves prior sections and can use a newly selected model", () => {
  let build = createForgeBuild({ id: "build/1", sourceRevision: 7, inputFingerprint: "sha256:abc", executionMode: "continuous", createdAt: "2026-09-12T10:00:00Z" });
  build = beginForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", provider: "nanogpt", modelId: "model-a", route: "openai_compatible", startedAt: "2026-09-12T10:01:00Z" });
  build = completeForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", commandId: "complete/1", sections: { core: {}, user: {}, worldPhysics: {}, status: {} }, completedAt: "2026-09-12T10:02:00Z" });
  build = beginForgeBatch(build, { bundleIndex: 1, attemptId: "attempt/2", provider: "nanogpt", modelId: "model-a", route: "openai_compatible", startedAt: "2026-09-12T10:03:00Z" });
  build = failForgeBatch(build, { bundleIndex: 1, attemptId: "attempt/2", code: "RATE_LIMITED", message: "Provider rate limit.", failedAt: "2026-09-12T10:04:00Z" });
  build = beginForgeBatch(build, { bundleIndex: 1, attemptId: "attempt/3", provider: "openrouter", modelId: "model-b", route: "openai_compatible", startedAt: "2026-09-12T10:05:00Z" });
  expect(build.checkpoint.completedBundleCount).toBe(1);
  expect(build.batches[1].attempts.map((attempt) => attempt.modelId)).toEqual(["model-a", "model-b"]);
  expect(build.batches[1].status).toBe("active");
});

test("continuing a legacy checkpoint backfills records for previously completed bundles",()=>{
  let build=createForgeBuild({id:"build/legacy",sourceRevision:7,inputFingerprint:"sha256:abc",executionMode:"continuous",createdAt:"a"});
  build=beginForgeBatch(build,{bundleIndex:0,attemptId:"attempt/1",provider:"gemini",modelId:"gemini-flash",route:"gemini_native",startedAt:"b"});
  build=completeForgeBatch(build,{bundleIndex:0,attemptId:"attempt/1",commandId:"done/1",sections:{core:{title:"Kept"},user:{},worldPhysics:{},status:{}},completedAt:"c"});
  delete build.categoryRecords;
  build=beginForgeBatch(build,{bundleIndex:1,attemptId:"attempt/2",provider:"gemini",modelId:"gemini-flash",route:"gemini_native",startedAt:"d"});
  build=completeForgeBatch(build,{bundleIndex:1,attemptId:"attempt/2",commandId:"done/2",sections:{locations:[],factions:[]},completedAt:"e"});
  expect(build.checkpoint.sections.core).toEqual({title:"Kept"});
  expect(new Set(build.categoryRecords!.map(record=>record.sectionKey))).toEqual(new Set(["core","user","worldPhysics","status","locations","factions"]));
});

test("persisted attempt metadata is bounded and rejects credential-like values", () => {
  const build = createForgeBuild({ id: "build/1", sourceRevision: 7, inputFingerprint: "sha256:abc", executionMode: "continuous", createdAt: "2026-09-12T10:00:00Z" });
  expect(() => beginForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", provider: "gemini", modelId: "AIzaSyDUMMYEXAMPLEKEY123456789012345", route: "gemini_native", startedAt: "x" })).toThrow("model ID");
  const active = beginForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", provider: "gemini", modelId: "flash", route: "gemini_native", startedAt: "x" });
  const failed = failForgeBatch(active, { bundleIndex: 0, attemptId: "attempt/1", code: "PROVIDER_ERROR", message: `Bearer secret-token-value ${"x".repeat(600)}`, failedAt: "y" });
  expect(failed.batches[0].attempts[0].diagnostic?.message).toBe("The provider rejected this Forge attempt.");
  expect(failed.batches[0].attempts[0].diagnostic?.code).toBe("PROVIDER_ERROR");
});

test("completion is idempotent and rejects missing or partial sections", () => {
  let build = createForgeBuild({ id: "build/1", sourceRevision: 7, inputFingerprint: "sha256:abc", executionMode: "continuous", createdAt: "2026-09-12T10:00:00Z" });
  build = beginForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", provider: "gemini", modelId: "flash", route: "gemini_native", startedAt: "2026-09-12T10:01:00Z" });
  expect(() => completeForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", commandId: "bad", sections: { core: {} }, completedAt: "x" })).toThrow("missing user");
  const once = completeForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", commandId: "complete/1", sections: { core: {}, user: {}, worldPhysics: {}, status: {} }, completedAt: "x" });
  const twice = completeForgeBatch(once, { bundleIndex: 0, attemptId: "attempt/1", commandId: "complete/1", sections: { core: { changed: true }, user: {}, worldPhysics: {}, status: {} }, completedAt: "later" });
  expect(twice).toEqual(once);
});

test("resume blocks stale inputs and source revisions", () => {
  const build = createForgeBuild({ id: "build/1", sourceRevision: 7, inputFingerprint: "sha256:abc", executionMode: "continuous", createdAt: "2026-09-12T10:00:00Z" });
  expect(() => resumeForgeBuild(build, "sha256:different", 7)).toThrow("input fingerprint");
  expect(() => resumeForgeBuild(build, "sha256:abc", 8)).toThrow("source revision");
});

test("cancelling an active bundle preserves completed checkpoints and leaves it retryable", () => {
  let build = createForgeBuild({ id: "build/1", sourceRevision: 7, inputFingerprint: "sha256:abc", executionMode: "continuous", createdAt: "2026-09-12T10:00:00Z" });
  build = beginForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", provider: "gemini", modelId: "flash", route: "gemini_native", startedAt: "2026-09-12T10:01:00Z" });
  build = cancelForgeBatch(build, { bundleIndex: 0, attemptId: "attempt/1", cancelledAt: "2026-09-12T10:02:00Z" });
  expect(build.batches[0].status).toBe("cancelled");
  expect(build.batches[0].attempts[0].status).toBe("cancelled");
  expect(resumeForgeBuild(build, "sha256:abc", 7).nextBundleIndex).toBe(0);
});

test("build state can live inside the canonical graph without changing existing graph identity", () => {
  const value = graph();
  const build = createForgeBuild({ id: "build/1", sourceRevision: 7, inputFingerprint: "sha256:abc", executionMode: "continuous", createdAt: "2026-09-12T10:00:00Z" });
  value.builds.push(build);
  expect(value.project.id).toBe("project/forge");
  expect(value.builds[0].kind).toBe("forge");
});

test("finds the newest durable checkpoint for UI recovery",()=>{
  const value=graph();const older=createForgeBuild({id:"build/old",sourceRevision:7,inputFingerprint:"a",executionMode:"continuous",createdAt:"a"});const newer=createForgeBuild({id:"build/new",sourceRevision:7,inputFingerprint:"b",executionMode:"continuous",createdAt:"b"});
  const active=beginForgeBatch(newer,{bundleIndex:0,attemptId:"attempt/1",provider:"gemini",modelId:"gemini-flash",route:"openai_compatible",startedAt:"c"});const completed=completeForgeBatch(active,{bundleIndex:0,attemptId:"attempt/1",commandId:"done",sections:{core:{title:"Recovered"},user:{},worldPhysics:{},status:{}},completedAt:"d"});value.builds=[older,completed];
  expect(findRecoverableForgeBuild(value,"b")).toMatchObject({buildId:"build/new",completedBundleCount:1,sections:{core:{title:"Recovered"}}});
  expect(findRecoverableForgeBuild(value,"missing")).toBeNull();
});

import { expect, test } from "bun:test";
import { createSpecialistLedger, beginSpecialistJob, completeSpecialistJob, replaceSpecialistJob, mergeSpecialistJobs } from "../../src/lib/projectGraph/forgeSpecialistLedger";
import type { ForgeJobV1 } from "../../src/contracts/projectGraph";

const source = "sha256:source";
const at = "2026-09-20T12:00:00Z";
const job = (id: string, entryIds: string[]): ForgeJobV1 => ({ version: 1, id, bundleIndex: 4, kind: "bundle5_section", destinations: ["history"], entryIds, dependencies: [], schemaId: "forge.bundle5.history/v1", schemaVersion: 1, promptHash: "sha256:prompt", inputFingerprint: source, estimatedOutputTokens: 500, ordinal: 0, splitDepth: 0 });
const history = (id: string) => ({ id, fields: { name: "The Founding", event: "Founded", era: "Past", consequence: "Still remembered" }, keys: ["The Founding"], permanence: "P", locked: false });

test("a validated specialist survives a failed bundle and is reused after reload", () => {
  const first = job("job/one", ["entry/one"]);
  const second = { ...job("job/two", ["entry/two"]), ordinal: 1 };
  let ledger = createSpecialistLedger({ planHash: "sha256:plan", inputFingerprint: source, jobs: [first, second] });
  ledger = beginSpecialistJob(ledger, { jobId: first.id, attemptId: "attempt/job1", provider: "gemini", modelId: "flash", promptHash: first.promptHash, startedAt: at });
  ledger = completeSpecialistJob(ledger, { jobId: first.id, attemptId: "attempt/job1", commandId: "command/job1", sections: { history: [history("entry/one")] }, completedAt: at });
  const reloaded = structuredClone(ledger);
  expect(reloaded.jobs.map(item => item.status)).toEqual(["complete", "pending"]);
  expect(reloaded.jobs[0].sections).toEqual({ history: [history("entry/one")] });
  expect(() => mergeSpecialistJobs(reloaded)).toThrow("unfinished jobs");
  expect(() => beginSpecialistJob(reloaded, { jobId: first.id, attemptId: "attempt/again", provider: "gemini", modelId: "flash", promptHash: first.promptHash, startedAt: at })).toThrow();
});

test("a stale job completion after replacement is rejected and children cover exactly its slots", () => {
  const parent = job("job/parent", ["entry/one", "entry/two"]);
  let ledger = createSpecialistLedger({ planHash: "sha256:plan", inputFingerprint: source, jobs: [parent] });
  ledger = beginSpecialistJob(ledger, { jobId: parent.id, attemptId: "attempt/old", provider: "gemini", modelId: "flash", promptHash: parent.promptHash, startedAt: at });
  const children = [{ ...parent, id: "job/child-a", ordinal: 1, entryIds: ["entry/one"], splitDepth: 1 }, { ...parent, id: "job/child-b", ordinal: 2, entryIds: ["entry/two"], splitDepth: 1 }];
  ledger = replaceSpecialistJob(ledger, { jobId: parent.id, attemptId: "attempt/old", children, replacedAt: at });
  expect(ledger.jobs.map(item => item.status)).toEqual(["superseded", "pending", "pending"]);
  expect(() => completeSpecialistJob(ledger, { jobId: parent.id, attemptId: "attempt/old", commandId: "late", sections: { history: [history("entry/one"), history("entry/two")] }, completedAt: at })).toThrow();
  expect(() => replaceSpecialistJob(ledger, { jobId: "job/child-a", attemptId: "attempt/other", children: [{ ...parent, id: "bad", entryIds: ["entry/one", "entry/two"], splitDepth: 2 }], replacedAt: at })).toThrow();
});

test("the durable command boundary rejects incomplete lore content and duplicate ordering",()=>{
  const first=job("job/one",["entry/one"]);
  expect(()=>createSpecialistLedger({planHash:"sha256:plan",inputFingerprint:source,jobs:[first,{...job("job/two",["entry/two"]),ordinal:first.ordinal}]})).toThrow("ordinals");
  let ledger=createSpecialistLedger({planHash:"sha256:plan",inputFingerprint:source,jobs:[first]});
  ledger=beginSpecialistJob(ledger,{jobId:first.id,attemptId:"attempt/one",provider:"gemini",modelId:"flash",promptHash:first.promptHash,startedAt:at});
  expect(()=>completeSpecialistJob(ledger,{jobId:first.id,attemptId:"attempt/one",commandId:"command/one",sections:{history:[{id:"entry/one",fields:{name:"Too Thin"},keys:[],permanence:"P",locked:false}]},completedAt:at})).toThrow("projected schema");
});

test("the durable ledger accepts and merges an independently completed location bundle",()=>{
  const locationJob={...job("job/location",["entry/location"]),bundleIndex:1,kind:"category_entries",destinations:["locations"],schemaId:"forge.bundle2.locations/v1",ordinal:10} as unknown as ForgeJobV1;
  let ledger=createSpecialistLedger({planHash:"sha256:multi-bundle",inputFingerprint:source,jobs:[locationJob]});
  ledger=beginSpecialistJob(ledger,{jobId:locationJob.id,attemptId:"attempt/location",provider:"gemini",modelId:"flash",promptHash:"sha256:rendered-location-prompt",startedAt:at});
  expect(ledger.jobs[0].attempts[0].promptHash).toBe("sha256:rendered-location-prompt");
  const location={id:"entry/location",fields:{name:"Salt Gate",function:"Checkpoint",mood:"Watchful",whatsWrong:"The guards keep two ledgers."},keys:["Salt Gate"],permanence:"P",locked:false};
  ledger=completeSpecialistJob(ledger,{jobId:locationJob.id,attemptId:"attempt/location",commandId:"complete/location",sections:{locations:[location]},completedAt:at});
  expect(mergeSpecialistJobs(ledger,1)).toEqual({locations:[location]});
});

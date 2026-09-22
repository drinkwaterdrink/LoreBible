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

test("splitting a prerequisite rewires pending dependents to both replacement children",()=>{
  const parent=job("job/cast",["entry/one","entry/two"]);
  const dependent={...job("job/relationship",["entry/relationship"]),ordinal:3,dependencies:[parent.id]};
  let ledger=createSpecialistLedger({planHash:"sha256:plan",inputFingerprint:source,jobs:[parent,dependent]});
  ledger=beginSpecialistJob(ledger,{jobId:parent.id,attemptId:"attempt/cast",provider:"gemini",modelId:"flash",promptHash:parent.promptHash,startedAt:at});
  const children=[{...parent,id:"job/cast-a",ordinal:1,entryIds:["entry/one"],splitDepth:1},{...parent,id:"job/cast-b",ordinal:2,entryIds:["entry/two"],splitDepth:1}];
  ledger=replaceSpecialistJob(ledger,{jobId:parent.id,attemptId:"attempt/cast",children,replacedAt:at});
  expect(ledger.jobs.find(item=>item.job.id===dependent.id)?.job.dependencies).toEqual(children.map(child=>child.id));
  expect(()=>beginSpecialistJob(ledger,{jobId:dependent.id,attemptId:"too-early",provider:"gemini",modelId:"flash",promptHash:dependent.promptHash,startedAt:at})).toThrow("not ready");
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

test("the durable boundary enforces cast tier ownership",()=>{
  const npcJob={...job("job/principal",["entry/principal"]),bundleIndex:2,kind:"category_entries",destinations:["npcs"],categoryId:"principal_cast",categoryLabel:"Principal Cast",schemaId:"forge.bundle3.npcs/v1",ordinal:12} as unknown as ForgeJobV1;
  let ledger=createSpecialistLedger({planHash:"sha256:cast",inputFingerprint:source,jobs:[npcJob]});
  ledger=beginSpecialistJob(ledger,{jobId:npcJob.id,attemptId:"attempt/principal",provider:"test",modelId:"test",promptHash:"sha256:rendered",startedAt:at});
  const entry={id:"entry/principal",fields:{name:"Mara",role:"Archivist",wants:"Restore records",body:"Ink-stained hands",voice:"Dry",notDefault:"Collects tickets",holds:"Knows the route",connection:"Harbor staff",castTier:"roster",independentActivity:"Repairs ledgers"},keys:["Mara"],permanence:"P",locked:false};
  expect(()=>completeSpecialistJob(ledger,{jobId:npcJob.id,attemptId:"attempt/principal",commandId:"complete/principal",sections:{npcs:[entry]},completedAt:at})).toThrow("cast tier");
});

test("the durable job contract requires an owned NPC cast tier category",()=>{
  const malformed={...job("job/unowned-cast",["entry/cast"]),bundleIndex:2,kind:"category_entries",destinations:["npcs"],categoryId:"other",categoryLabel:"Other",schemaId:"forge.bundle3.npcs/v1",ordinal:13} as unknown as ForgeJobV1;
  expect(()=>createSpecialistLedger({planHash:"sha256:cast",inputFingerprint:source,jobs:[malformed]})).toThrow("cast tier category");
});

test("relationship and knowledge specialists accept schema-optional activation keys",()=>{
  const relationshipJob={...job("job/relationship",["entry/relationship"]),bundleIndex:2,kind:"category_entries",destinations:["relationshipWeb"],categoryId:"relationships",categoryLabel:"Relationships",schemaId:"forge.bundle3.relationshipWeb/v1",ordinal:14} as unknown as ForgeJobV1;
  let ledger=createSpecialistLedger({planHash:"sha256:relationship",inputFingerprint:source,jobs:[relationshipJob]});
  ledger=beginSpecialistJob(ledger,{jobId:relationshipJob.id,attemptId:"attempt/relationship",provider:"test",modelId:"test",promptHash:"sha256:rendered",startedAt:at});
  const entry={id:"entry/relationship",fields:{source:"Mara",target:"Ivo",bond:"Coworkers",pressure:"A missing ledger",relation:"Mara supervises Ivo"},permanence:"P",locked:false};
  ledger=completeSpecialistJob(ledger,{jobId:relationshipJob.id,attemptId:"attempt/relationship",commandId:"complete/relationship",sections:{relationshipWeb:[entry]},completedAt:at});
  expect(mergeSpecialistJobs(ledger,2)).toEqual({relationshipWeb:[entry]});
});

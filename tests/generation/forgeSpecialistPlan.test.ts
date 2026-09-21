import {expect,test} from "bun:test";
import {blueprintSelectionFixture} from "../fixtures/blueprintSelection";
import {createForgeSpecialistPlan,hydrateForgeSpecialistJob,compileForgeSpecialistJobPrompt,validateForgeSpecialistJob,splitForgeSpecialistJob,createForgeReplacementSpec,canUseForgeSpecialistsForBatch,hashForgeSpecialistPrompt} from "../../server/generation/forgeSpecialistPlan";
import {compileBundleFiveJobPrompt,createBundleFiveJobSpec,type BundleFiveJob} from "../../server/generation/forgeBundleFiveJobs";

test("one deterministic plan owns bounded Bundle 2 and Bundle 5 category jobs",()=>{
  const selection=structuredClone(blueprintSelectionFixture);
  selection.categories=[
    {...selection.categories[0],id:"locations",label:"Locations",purpose:"Playable places",status:"required",detail:"standard",targetRange:{min:7,ideal:7,max:7}},
    {...selection.categories[0],id:"history",label:"History",purpose:"Consequential past",status:"required",detail:"rich",targetRange:{min:2,ideal:2,max:2}},
  ];
  selection.lorebookRange={min:9,ideal:9,max:9};
  const first=createForgeSpecialistPlan(selection,{},"source context","sha256:source");
  const second=createForgeSpecialistPlan(structuredClone(selection),{},"source context","sha256:source");
  expect(first).toEqual(second);
  expect(first.jobs.filter(job=>job.bundleIndex===1).map(job=>job.entryIds.length)).toEqual([6,1]);
  expect(first.jobs.filter(job=>job.bundleIndex===4&&job.destinations[0]==="history").map(job=>job.entryIds.length)).toEqual([2]);
  expect(first.jobs.filter(job=>job.bundleIndex===4&&["aesthetic","naming"].includes(job.destinations[0]))).toHaveLength(2);
  expect(new Set(first.jobs.map(job=>job.ordinal)).size).toBe(first.jobs.length);
  expect(createForgeSpecialistPlan(selection,{},"later dependency context","sha256:source")).toEqual(first);
});

test("location specialists validate exact slots and split only their unfinished ownership",()=>{
  const selection=structuredClone(blueprintSelectionFixture);
  selection.categories=[{...selection.categories[0],id:"locations",label:"Locations",purpose:"Playable places",status:"required",detail:"standard",targetRange:{min:2,ideal:2,max:2}}];selection.lorebookRange={min:2,ideal:2,max:2};
  const spec=createForgeSpecialistPlan(selection,{},"source context","sha256:source").jobs[0];
  const job=hydrateForgeSpecialistJob(spec);
  const entry=(id:string)=>({id,fields:{name:"Salt Gate",function:"Checkpoint",mood:"Watchful",whatsWrong:"Two ledgers disagree."},keys:["Salt Gate"],permanence:"P",locked:false});
  expect(()=>validateForgeSpecialistJob(job,{locations:[entry("wrong"),entry(spec.entryIds[1])]})).toThrow("changed or duplicated");
  expect(validateForgeSpecialistJob(job,{locations:spec.entryIds.map(entry)}).locations).toHaveLength(2);
  const children=splitForgeSpecialistJob(job)!;
  expect(children.flatMap(child=>child.entryIds)).toEqual(spec.entryIds);
  expect(children.every(child=>child.bundleIndex===1&&child.key==="locations")).toBe(true);
  const replacement=createForgeReplacementSpec(children[0],spec,99);
  expect(replacement).toMatchObject({bundleIndex:1,ordinal:99,destinations:["locations"],entryIds:children[0].entryIds,splitDepth:1,inputFingerprint:"sha256:source"});
  expect(replacement.promptHash).not.toBe(spec.promptHash);
});

test("a location specialist receives only its owned schema and slots",()=>{
  const selection=structuredClone(blueprintSelectionFixture);
  selection.categories=[{...selection.categories[0],id:"locations",label:"Locations",purpose:"Playable places",status:"required",detail:"standard",targetRange:{min:1,ideal:1,max:1}}];
  selection.lorebookRange={min:1,ideal:1,max:1};
  const plan=createForgeSpecialistPlan(selection,{},"source context","sha256:source");
  const job=hydrateForgeSpecialistJob(plan.jobs[0]);
  const prompt=compileForgeSpecialistJobPrompt(job,"source context",null);
  expect(job.key).toBe("locations");
  expect(prompt.userPrompt).toContain(plan.jobs[0].entryIds[0]);
  expect(prompt.userPrompt).toContain('"locations"');
  expect(prompt.userPrompt).not.toContain('"factions"');
  expect(prompt.userPrompt).not.toContain('"history"');
  expect(hashForgeSpecialistPrompt(job,"source context")).not.toBe(plan.jobs[0].promptHash);
});

test("specialists never replace a combined single-request generation batch",()=>{
  expect(canUseForgeSpecialistsForBatch(1,2)).toBe(true);
  expect(canUseForgeSpecialistsForBatch(1,6)).toBe(false);
});

test("a persisted v0.66 Bundle 5 job keeps its original compiler and prompt hash",()=>{
  const legacy:BundleFiveJob={id:"forge-b5:history:0",key:"history",categoryId:"history",categoryLabel:"History",purpose:"Consequential past",entryIds:["history-1","history-2"],schema:{type:"object",properties:{history:{type:"array"}},required:["history"]}};
  const context="accepted Bundle 1 through 4 context";
  const initial=createBundleFiveJobSpec(legacy,7,context,"sha256:source");
  const canonicalLegacy={...legacy,schema:hydrateForgeSpecialistJob(initial).schema};
  const saved=createBundleFiveJobSpec(canonicalLegacy,7,context,"sha256:source");
  const hydrated=hydrateForgeSpecialistJob(saved);
  expect(compileForgeSpecialistJobPrompt(hydrated,context,null)).toEqual(compileBundleFiveJobPrompt(canonicalLegacy,context,null));
  const child=splitForgeSpecialistJob(hydrated)![0];
  expect(createForgeReplacementSpec(child,saved,8,context).promptHash).toBe(createBundleFiveJobSpec(child as BundleFiveJob,8,context,"sha256:source").promptHash);
});

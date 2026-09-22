import {expect,test} from "bun:test";
import {blueprintSelectionFixture} from "../fixtures/blueprintSelection";
import {createForgeSpecialistPlan,hydrateForgeSpecialistJob,compileForgeSpecialistJobPrompt,validateForgeSpecialistJob,splitForgeSpecialistJob,createForgeReplacementSpec,canUseForgeSpecialistsForBatch,hashForgeSpecialistPrompt,canUsePersistedForgeSpecialistsForBundle} from "../../server/generation/forgeSpecialistPlan";
import {compileBundleFiveJobPrompt,createBundleFiveJobSpec,type BundleFiveJob} from "../../server/generation/forgeBundleFiveJobs";
import {createSpecialistLedger,beginSpecialistJob} from "../../src/lib/projectGraph/forgeSpecialistLedger";
import type {ForgeSpecialistLedgerV1} from "../../src/contracts/projectGraph";

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

test("Bundle 3 schedules cast before relationship and knowledge specialists",()=>{
  const selection=structuredClone(blueprintSelectionFixture);
  const category=(id:string,label:string,min:number)=>({...selection.categories[0],id,label,purpose:`Generate ${label}`,status:"required" as const,detail:"standard" as const,targetRange:{min,ideal:min,max:min}});
  selection.categories=[category("principal_cast","Principal Cast",2),category("roster_cast","Roster Cast",2),category("relationships","Relationships",2),category("knowledge","Knowledge",1)];
  selection.principalCastRange={min:2,ideal:2,max:2};selection.rosterCastRange={min:2,ideal:2,max:2};selection.lorebookRange={min:7,ideal:7,max:7};
  const plan=createForgeSpecialistPlan(selection,{},"source context","sha256:source");
  const bundleThree=plan.jobs.filter(job=>job.bundleIndex===2);
  const castIds=bundleThree.filter(job=>job.destinations[0]==="npcs").map(job=>job.id);
  expect(bundleThree.map(job=>job.destinations[0])).toEqual(["npcs","npcs","knowledgeMap","relationshipWeb"]);
  expect(bundleThree.filter(job=>["relationshipWeb","knowledgeMap"].includes(job.destinations[0])).every(job=>job.dependencies.length===castIds.length&&job.dependencies.every(id=>castIds.includes(id)))).toBe(true);
  let ledger=createSpecialistLedger({...plan,inputFingerprint:"sha256:source"});
  const relationship=bundleThree.find(job=>job.destinations[0]==="relationshipWeb")!;
  expect(()=>beginSpecialistJob(ledger,{jobId:relationship.id,attemptId:"too-early",provider:"test",modelId:"test",promptHash:"sha256:rendered",startedAt:"2026-09-21T00:00:00Z"})).toThrow("not ready");
});

test("cast specialists enforce their accepted principal or roster tier",()=>{
  const selection=structuredClone(blueprintSelectionFixture);
  selection.categories=[{...selection.categories[0],id:"principal_cast",label:"Principal Cast",purpose:"Core cast",status:"required",detail:"rich",targetRange:{min:1,ideal:1,max:1}}];
  selection.principalCastRange={min:1,ideal:1,max:1};selection.lorebookRange={min:1,ideal:1,max:1};
  const spec=createForgeSpecialistPlan(selection,{},"source context","sha256:source").jobs.find(job=>job.destinations[0]==="npcs")!;
  const npc=(castTier:string)=>({id:spec.entryIds[0],fields:{name:"Mara Vale",role:"Archivist",wants:"Protect the ferry records",body:"Ink-stained hands",voice:"Measured and dry",notDefault:"Collects discarded tickets",holds:"Knows the old route",connection:"Works with the harbor clerk",castTier,independentActivity:"Restores storm-damaged ledgers"},keys:["Mara Vale"],permanence:"P",locked:false});
  const job=hydrateForgeSpecialistJob(spec);
  expect(()=>validateForgeSpecialistJob(job,{npcs:[npc("roster")]})).toThrow("cast tier");
  expect(validateForgeSpecialistJob(job,{npcs:[npc("principal")]}).npcs).toHaveLength(1);
  expect(compileForgeSpecialistJobPrompt(job,"source context",null).userPrompt).toContain("principal");
});

test("Bundle 4 partitions items and secrets into isolated owned jobs",()=>{
  const selection=structuredClone(blueprintSelectionFixture);
  const category=(id:string,label:string,min:number,detail:"standard"|"rich")=>({...selection.categories[0],id,label,purpose:`Generate ${label}`,status:"required" as const,detail,targetRange:{min,ideal:min,max:min}});
  selection.categories=[category("items","Items",7,"standard"),category("secrets","Secrets",4,"rich")];
  selection.lorebookRange={min:11,ideal:11,max:11};
  const jobs=createForgeSpecialistPlan(selection,{},"source context","sha256:source").jobs.filter(job=>job.bundleIndex===3);
  expect(jobs.filter(job=>job.destinations[0]==="items").map(job=>job.entryIds.length)).toEqual([6,1]);
  expect(jobs.filter(job=>job.destinations[0]==="secrets").map(job=>job.entryIds.length)).toEqual([3,1]);
  expect(jobs.filter(job=>["conflict","pressureProtocol"].includes(job.destinations[0])).map(job=>job.destinations[0])).toEqual(["conflict","pressureProtocol"]);
  const conflict=hydrateForgeSpecialistJob(jobs.find(job=>job.destinations[0]==="conflict")!);
  const protocol=hydrateForgeSpecialistJob(jobs.find(job=>job.destinations[0]==="pressureProtocol")!);
  expect(validateForgeSpecialistJob(conflict,{conflict:{central:"Control of the harbor",opposition:"The guild closes ranks",stakesBad:"The crossing becomes captive",stakesAcceptable:"A costly independent route survives",clock:"The charter vote is Friday",moralKnot:"Exposure also harms ferry workers",theYield:"A public accounting",speedBumps:["The ledger is incomplete"],permanence:"C"}})).toHaveProperty("conflict");
  expect(validateForgeSpecialistJob(protocol,{pressureProtocol:"Escalate one established pressure at a time, then leave room for character response."})).toHaveProperty("pressureProtocol");
  const secret=hydrateForgeSpecialistJob(jobs.find(job=>job.destinations[0]==="secrets")!);
  const prompt=compileForgeSpecialistJobPrompt(secret,"source context",null).userPrompt;
  expect(prompt).toContain("discovery");
  expect(prompt).toContain('"secrets"');
  expect(prompt).not.toContain('"ownedSection": "items"');
  expect(prompt).not.toContain('"whatItDoes"');
});

test("a v0.67 ledger falls back instead of pretending missing Bundle 3 specialists exist",()=>{
  const oldLedger:ForgeSpecialistLedgerV1={version:1,planHash:"sha256:old",inputFingerprint:"sha256:source",jobs:[{job:{version:1,id:"old-b2",bundleIndex:1,ordinal:0,kind:"category_entries",destinations:["locations"],categoryId:"locations",categoryLabel:"Locations",entryIds:["location-1"],dependencies:[],schemaId:"forge.bundle2.locations/v1",schemaVersion:1,promptHash:"sha256:template",inputFingerprint:"sha256:source",estimatedOutputTokens:500,splitDepth:0},status:"complete",attempts:[],sections:{locations:[]}}]};
  expect(canUsePersistedForgeSpecialistsForBundle(oldLedger,2)).toBe(false);
  expect(canUsePersistedForgeSpecialistsForBundle(oldLedger,1)).toBe(true);
  expect(canUsePersistedForgeSpecialistsForBundle(null,2)).toBe(true);
});

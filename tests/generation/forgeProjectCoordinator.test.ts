import {expect,test} from "bun:test";
import {mkdtemp} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import type {ForgeBuildRecordV1,ProjectGraphV1} from "../../src/contracts/projectGraph";
import {createProjectRepository} from "../../server/projects/projectRepository";
import {createForgeProjectCoordinator} from "../../server/generation/forgeProjectCoordinator";
import {beginForgeBatch, completeForgeBatch, createForgeBuild} from "../../src/lib/projectGraph/forgeBuilds";
import {createBundleFiveJobSpec} from "../../server/generation/forgeBundleFiveJobs";

function graph():ProjectGraphV1{return{schema:"lorebible.project-graph/v1",project:{id:"p",name:"World",version:"1",status:"active",targetPlatform:"lumiverse",mode:"graph_native",revision:1},authority:{sourceOrder:["user","approved_project","lumiverse_docs_technical","external_reference","generated"]},agency:{protectedSubject:"{{user}}",reserved:["actions","dialogue","thoughts","feelings","attraction","consent","decisions","relationships","abilities","backstory","next_voluntary_action"]},canon:[],entities:[],relationships:[],knowledge:[],temporalSnapshots:[],ownership:[],sources:[],dependencies:[],artifacts:[],builds:[],validation:{status:"not_run",findings:[],lastRun:null},decisions:[],unresolved:[],extensions:{}}}
const source={sparkText:"A harbor",parse:{nonNegotiables:["harbor"]},canon:{enabled:false},physics:{density:"Standard"},chosenTake:{id:"take-1",title:"Watch"}};

test("coordinates a real persisted bundle and resumes it through a fresh repository",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"lb-forge-coordinator-"));const repo=createProjectRepository(dir);await repo.create(graph());
  const coordinator=createForgeProjectCoordinator(repo,{now:()=>"2026-09-13T00:00:00Z",id:(kind)=>`${kind}/one`});
  const prepared=await coordinator.prepare("p",source,"step_by_step");expect(prepared.resumeSections).toEqual({});
  const attempt=await coordinator.begin(prepared,{bundleIndex:0,provider:"gemini",modelId:"gemini-2.5-flash",route:"openai_compatible"});
  await coordinator.complete(attempt,{core:{},user:{},worldPhysics:{},status:{}});
  const resumed=await createForgeProjectCoordinator(createProjectRepository(dir),{now:()=>"later",id:(kind)=>`${kind}/two`}).prepare("p",source,"step_by_step");
  expect(resumed.nextBundleIndex).toBe(1);expect(resumed.resumeSections).toEqual({core:{},user:{},worldPhysics:{},status:{}});
});

test("an interrupted active attempt is made retryable without losing its checkpoint",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"lb-forge-coordinator-"));const repo=createProjectRepository(dir);await repo.create(graph());
  const coordinator=createForgeProjectCoordinator(repo,{now:()=>"x",id:(kind)=>`${kind}/one`});const prepared=await coordinator.prepare("p",source,"continuous");
  await coordinator.begin(prepared,{bundleIndex:0,provider:"nanogpt",modelId:"google/gemini-flash",route:"openai_compatible"});
  const recovered=await createForgeProjectCoordinator(createProjectRepository(dir),{now:()=>"y",id:(kind)=>`${kind}/two`}).prepare("p",source,"continuous");
  const build=recovered.graph.builds[0] as ForgeBuildRecordV1;expect(build.batches[0].status).toBe("failed");expect(build.batches[0].attempts[0].diagnostic?.code).toBe("CLIENT_DISCONNECTED");expect(recovered.nextBundleIndex).toBe(0);
});

test("fingerprints creative inputs but permits model changes",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"lb-forge-coordinator-"));const repo=createProjectRepository(dir);await repo.create(graph());let sequence=0;const coordinator=createForgeProjectCoordinator(repo,{now:()=>"x",id:(kind)=>`${kind}/${++sequence}`});
  const first=await coordinator.prepare("p",source,"continuous");const same=await coordinator.prepare("p",structuredClone(source),"continuous");expect(same.buildId).toBe(first.buildId);
  const changed=await coordinator.prepare("p",{...source,sparkText:"A mountain"},"continuous");expect(changed.buildId).not.toBe(first.buildId);
});

test("accepts one provider response as six atomic bundle checkpoints",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"lb-forge-coordinator-"));const repo=createProjectRepository(dir);await repo.create(graph());let sequence=0;const coordinator=createForgeProjectCoordinator(repo,{now:()=>"x",id:(kind)=>`${kind}/${++sequence}`});
  const prepared=await coordinator.prepare("p",source,"single_request");const provenance={provider:"gemini",modelId:"gemini-2.5-flash",route:"openai_compatible"};const active=await coordinator.begin(prepared,{bundleIndex:0,...provenance});
  const sections={core:{},user:{},worldPhysics:{},status:{},locations:[],factions:[],npcs:[],relationshipWeb:[],knowledgeMap:[],items:[],secrets:[],conflict:{},pressureProtocol:{},history:[],aesthetic:{},naming:{},pressures:[],additionalLore:[],proceduralRolls:[],opening:{},expansionNotes:{},antiGravity:{},buildNotes:{}};
  const completed=await coordinator.completeRange(active,sections,6,provenance);
  expect(completed.complete).toBe(true);expect((completed.graph.builds[0] as ForgeBuildRecordV1).batches.every(batch=>batch.status==="complete")).toBe(true);expect(completed.resumeSections).toEqual(sections);
  const batches=(completed.graph.builds[0] as ForgeBuildRecordV1).batches;
  expect(batches.every(batch=>batch.acceptedCommandId===batches[0].acceptedCommandId)).toBe(true);
  expect(batches[1].attempts.at(-1)?.id).toBe(`${batches[0].acceptedCommandId}/bundle/1`);
});

test("a new coordinator resumes saved Bundle 5 jobs without repeating completed work",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"lb-forge-specialist-"));const repo=createProjectRepository(dir);
  const initial=graph();
  let build=createForgeBuild({id:"build/existing",sourceRevision:1,inputFingerprint:"sha256:source",executionMode:"continuous",createdAt:"now"});
  const parts=[{core:{},user:{},worldPhysics:{},status:{}},{locations:[],factions:[]},{npcs:[],relationshipWeb:[],knowledgeMap:[]},{items:[],secrets:[],conflict:{},pressureProtocol:{}}];
  for(const [index,sections]of parts.entries()){build=beginForgeBatch(build,{bundleIndex:index,attemptId:`old/${index}`,provider:"gemini",modelId:"flash",route:"gemini_native",startedAt:"now"});build=completeForgeBatch(build,{bundleIndex:index,attemptId:`old/${index}`,commandId:`accepted/${index}`,sections,completedAt:"now"});}
  initial.project.revision=2;initial.builds=[build];await repo.create(initial);
  let counter=0;const coordinator=createForgeProjectCoordinator(repo,{now:()=>"now",id:(kind)=>`${kind}/${++counter}`});
  const prepared={projectId:"p",buildId:build.id,sourceRevision:1,inputFingerprint:build.inputFingerprint,graph:initial,resumeSections:build.checkpoint.sections,nextBundleIndex:4,complete:false};
  const active=await coordinator.begin(prepared,{bundleIndex:4,provider:"gemini",modelId:"flash",route:"gemini_native"});
  const one={id:"b5/history/one",key:"history" as const,entryIds:["entry/one"],schema:{type:"object" as const}};
  const two={id:"b5/history/two",key:"history" as const,entryIds:["entry/two"],schema:{type:"object" as const}};
  const jobs=[one,two].map((job,index)=>createBundleFiveJobSpec(job,index,"source context",build.inputFingerprint));
  await coordinator.ensureJobs(active,{planHash:"sha256:plan",jobs});
  const started=await coordinator.beginJob(active,jobs[0],"gemini","flash");
  const section={history:[{id:"entry/one",fields:{name:"The Founding",event:"Founded",era:"Past",consequence:"Remembered"},keys:["Founding"],permanence:"P",locked:false}]};
  await coordinator.completeJob(active,jobs[0].id,started.attemptId,section);
  await coordinator.fail(active,"REQUEST_TIMEOUT");
  const reopened=createProjectRepository(dir);
  const nextCoordinator=createForgeProjectCoordinator(reopened,{now:()=>"later",id:(kind)=>`${kind}/new`});
  const saved=await reopened.load("p");expect(saved).not.toBeNull();
  const savedBuild=saved!.builds[0]as ForgeBuildRecordV1;expect(savedBuild.specialistLedger?.jobs.map(item=>item.status)).toEqual(["complete","pending"]);
  const nextActive=await nextCoordinator.begin({...prepared,graph:saved!},{bundleIndex:4,provider:"openrouter",modelId:"glm",route:"openai_compatible"});
  const ledger=await nextCoordinator.ensureJobs(nextActive,{planHash:"sha256:plan",jobs});
  expect(ledger.jobs[0].sections).toEqual(section);
  expect(ledger.jobs[1].status).toBe("pending");
});

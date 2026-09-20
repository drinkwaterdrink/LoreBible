import { expect, test } from "bun:test";
import type { ProjectGraphV1 } from "../../src/contracts/projectGraph";
import { createForgeBuild } from "../../src/lib/projectGraph/forgeBuilds";
import { applyProjectGraphCommand, ProjectGraphCommandError } from "../../src/lib/projectGraph/commands";

function graph(): ProjectGraphV1 {
  return { schema:"lorebible.project-graph/v1", project:{id:"p1",name:"World",version:"1",status:"active",targetPlatform:"lumiverse",mode:"graph_native",revision:2}, authority:{sourceOrder:["user","approved_project","lumiverse_docs_technical","external_reference","generated"]}, agency:{protectedSubject:"{{user}}",reserved:["actions","dialogue","thoughts","feelings","attraction","consent","decisions","relationships","abilities","backstory","next_voluntary_action"]}, canon:[], entities:[], relationships:[], knowledge:[], temporalSnapshots:[], ownership:[], sources:[], dependencies:[], artifacts:[], builds:[], validation:{status:"not_run",findings:[],lastRun:null}, decisions:[], unresolved:[], extensions:{} };
}

const sections: Record<string, unknown> = {
  core:{title:"Fixture"}, user:{}, worldPhysics:{}, status:{},
  locations:[], factions:[], npcs:[], relationshipWeb:[], knowledgeMap:[],
  items:[], secrets:[], conflict:{}, pressureProtocol:{},
  history:[], aesthetic:{}, naming:{}, pressures:[], additionalLore:[],
  proceduralRolls:[], opening:{}, expansionNotes:{}, antiGravity:{}, buildNotes:{},
};
const build = createForgeBuild({ id:"build/one", sourceRevision:1, inputFingerprint:"fixture-fingerprint", executionMode:"single_request", createdAt:"2026-01-01T00:00:00Z" });
const input = () => ({ ...graph(), builds:[structuredClone(build)] });

test("forge range completes all bundles in one atomic command", () => {
  const before = structuredClone(input());
  const result = applyProjectGraphCommand(before, { commandId:"range/one", expectedRevision:2, issuedAt:"2026-01-02T00:00:00Z", command:{
    type:"forge.range.complete", buildId:"build/one", startBundleIndex:0, endBundleIndexExclusive:6,
    attemptIds:["attempt/0","attempt/1","attempt/2","attempt/3","attempt/4","attempt/5"],
    sections, provider:"gemini", modelId:"gemini-2.5-flash", route:"openai_compatible",
    inputFingerprint:"fixture-fingerprint", sourceRevision:1,
  }});
  expect(before).toEqual(input());
  expect(result.graph.project.revision).toBe(3);
  expect((result.graph.builds[0] as any).batches.map((batch:any)=>batch.status)).toEqual(Array(6).fill("complete"));
  expect((result.graph.builds[0] as any).batches.map((batch:any)=>batch.attempts.at(-1)?.provider)).toEqual(Array(6).fill("gemini"));
  expect((result.graph.builds[0] as any).checkpoint.completedBundleCount).toBe(6);
  expect((result.graph.builds[0] as any).batches.map((batch:any)=>batch.acceptedCommandId)).toEqual(Array(6).fill("range/one"));
});

test("forge range leaves the graph unchanged when any bundle section is invalid", () => {
  const before = structuredClone(input());
  const invalid: Record<string, unknown> = { ...structuredClone(sections) };
  delete invalid.npcs;
  expect(() => applyProjectGraphCommand(before, { commandId:"range/two", expectedRevision:2, issuedAt:"x", command:{
    type:"forge.range.complete", buildId:"build/one", startBundleIndex:0, endBundleIndexExclusive:6,
    attemptIds:["attempt/0","attempt/1","attempt/2","attempt/3","attempt/4","attempt/5"],
    sections:invalid, provider:"gemini", modelId:"gemini-2.5-flash", route:"openai_compatible",
    inputFingerprint:"fixture-fingerprint", sourceRevision:1,
  } })).toThrow(ProjectGraphCommandError);
  expect(before).toEqual(input());
});

test("replaying an accepted range command is idempotent and a changed replay is rejected", () => {
  const command = {
    type:"forge.range.complete" as const, buildId:"build/one", startBundleIndex:0, endBundleIndexExclusive:6,
    attemptIds:["attempt/0","attempt/1","attempt/2","attempt/3","attempt/4","attempt/5"],
    sections, provider:"gemini", modelId:"gemini-2.5-flash", route:"openai_compatible",
    inputFingerprint:"fixture-fingerprint", sourceRevision:1,
  };
  const envelope={commandId:"range/replay",expectedRevision:2,issuedAt:"2026-01-02T00:00:00Z",command};
  const first=applyProjectGraphCommand(input(),envelope);
  const replay=applyProjectGraphCommand(first.graph,envelope);
  expect(replay.graph).toEqual(first.graph);
  expect(replay.receipt.toRevision).toBe(first.graph.project.revision);
  expect((replay.graph.builds[0] as any).batches.every((batch:any)=>batch.attempts.length===1)).toBe(true);
  expect(()=>applyProjectGraphCommand(first.graph,{...envelope,command:{...command,sections:{...sections,history:[{id:"changed"}]}}})).toThrow(ProjectGraphCommandError);
  expect(()=>applyProjectGraphCommand(first.graph,{...envelope,command:{...command,endBundleIndexExclusive:2,attemptIds:command.attemptIds.slice(0,2)}})).toThrow(ProjectGraphCommandError);
});

test("an accepted range command ID cannot be reused for a later range", () => {
  const first=applyProjectGraphCommand(input(),{commandId:"range/same",expectedRevision:2,issuedAt:"x",command:{
    type:"forge.range.complete",buildId:"build/one",startBundleIndex:0,endBundleIndexExclusive:2,attemptIds:["attempt/0","attempt/1"],sections:Object.fromEntries(Object.entries(sections).filter(([key])=>["core","user","worldPhysics","status","locations","factions"].includes(key))),provider:"gemini",modelId:"gemini-2.5-flash",route:"openai_compatible",inputFingerprint:"fixture-fingerprint",sourceRevision:1,
  }});
  const begun=applyProjectGraphCommand(first.graph,{commandId:"begin/2",expectedRevision:3,issuedAt:"x",command:{type:"forge.batch.begin",buildId:"build/one",bundleIndex:2,attemptId:"attempt/2",provider:"gemini",modelId:"gemini-2.5-flash",route:"openai_compatible",inputFingerprint:"fixture-fingerprint",sourceRevision:1}});
  const before=structuredClone(begun.graph);
  expect(()=>applyProjectGraphCommand(begun.graph,{commandId:"range/same",expectedRevision:4,issuedAt:"x",command:{
    type:"forge.range.complete",buildId:"build/one",startBundleIndex:2,endBundleIndexExclusive:6,attemptIds:["attempt/2","attempt/3","attempt/4","attempt/5"],sections:Object.fromEntries(Object.entries(sections).filter(([key])=>!["core","user","worldPhysics","status","locations","factions"].includes(key))),provider:"gemini",modelId:"gemini-2.5-flash",route:"openai_compatible",inputFingerprint:"fixture-fingerprint",sourceRevision:1,
  }})).toThrow(ProjectGraphCommandError);
  expect(begun.graph).toEqual(before);
});

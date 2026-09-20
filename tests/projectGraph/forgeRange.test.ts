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

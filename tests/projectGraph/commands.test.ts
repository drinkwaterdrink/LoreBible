import { expect, test } from "bun:test";
import type { ProjectGraphV1 } from "../../src/contracts/projectGraph";
import { applyProjectGraphCommand, ProjectGraphCommandError } from "../../src/lib/projectGraph/commands";

function graph(): ProjectGraphV1 {
  return { schema:"lorebible.project-graph/v1", project:{id:"p1",name:"World",version:"1",status:"active",targetPlatform:"lumiverse",mode:"graph_native",revision:1}, authority:{sourceOrder:["user","approved_project","lumiverse_docs_technical","external_reference","generated"]}, agency:{protectedSubject:"{{user}}",reserved:["actions","dialogue","thoughts","feelings","attraction","consent","decisions","relationships","abilities","backstory","next_voluntary_action"]}, canon:[{id:"f1",subjectId:"e1",predicate:"role",value:"Keeper",status:"provisional",origin:"generated",confidence:1,visibility:"public",temporalClass:"evergreen",sourceEvidenceIds:[]}], entities:[{id:"e1",type:"character",name:"Mara",aliases:[],importance:"major",lifecycle:"active",factIds:["f1"],relationshipIds:[],sourceEvidenceIds:[]}], relationships:[],knowledge:[],temporalSnapshots:[],ownership:[],sources:[],dependencies:[],artifacts:[],builds:[],validation:{status:"not_run",findings:[],lastRun:null},decisions:[],unresolved:[],extensions:{ prose:"Mara watches the harbor." } };
}

test("rename preserves identity, records alias, and reports prose impact", () => {
  const input=graph(); const before=structuredClone(input);
  const result=applyProjectGraphCommand(input,{commandId:"c1",expectedRevision:1,issuedAt:"2026-01-01T00:00:00Z",command:{type:"entity.rename",entityId:"e1",name:"Mara Vale"}});
  expect(input).toEqual(before); expect(result.graph.project.revision).toBe(2);
  expect(result.graph.entities[0]).toMatchObject({id:"e1",name:"Mara Vale",aliases:["Mara"]});
  expect(result.receipt.proposedSemanticEdits.some(x=>x.path==="extensions.prose")).toBe(true);
});

test("stale revision and no-op changes fail without mutation", () => {
  const input=graph(); const before=structuredClone(input);
  expect(()=>applyProjectGraphCommand(input,{commandId:"c",expectedRevision:2,issuedAt:"x",command:{type:"entity.rename",entityId:"e1",name:"X"}})).toThrow(ProjectGraphCommandError);
  try { applyProjectGraphCommand(input,{commandId:"c",expectedRevision:1,issuedAt:"x",command:{type:"entity.rename",entityId:"e1",name:"Mara"}}); } catch(e) { expect((e as ProjectGraphCommandError).code).toBe("no_change"); }
  expect(input).toEqual(before);
});

test("canon update preserves provenance and needs explicit promotion", () => {
  const result=applyProjectGraphCommand(graph(),{commandId:"c2",expectedRevision:1,issuedAt:"x",command:{type:"canon.update",factId:"f1",value:"Harbormaster"}});
  expect(result.graph.canon[0]).toMatchObject({id:"f1",value:"Harbormaster",status:"provisional",origin:"generated"});
  const promoted=applyProjectGraphCommand(graph(),{commandId:"c3",expectedRevision:1,issuedAt:"x",command:{type:"canon.update",factId:"f1",value:"Harbormaster",status:"canon"}});
  expect(promoted.graph.canon[0].status).toBe("canon");
});

test("rejects unsafe names and credential-shaped fact values", () => {
  expect(()=>applyProjectGraphCommand(graph(),{commandId:"c",expectedRevision:1,issuedAt:"x",command:{type:"entity.rename",entityId:"e1",name:"bad\nname"}})).toThrow("control");
  try { applyProjectGraphCommand(graph(),{commandId:"c",expectedRevision:1,issuedAt:"x",command:{type:"canon.update",factId:"f1",value:{apiKey:"secret"}}}); } catch(e) { expect((e as ProjectGraphCommandError).code).toBe("credential_rejected"); }
});

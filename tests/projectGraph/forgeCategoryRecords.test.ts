import {expect,test} from "bun:test";
import {deriveForgeSectionsFromCategoryRecords,projectForgeSections} from "../../src/lib/projectGraph/forgeCategoryRecords";

test("projects generated entries into stable typed proposal records",()=>{
  const sections={npcs:[{id:"npc-1",fields:{name:"Mara",role:"Keeper"},keys:["Mara"],permanence:"C",locked:false}],relationshipWeb:[{id:"rel-1",fields:{source:"Mara",target:"Vale",relation:"Mara → Vale"},keys:["Mara","Vale"],permanence:"C",locked:false}],knowledgeMap:[]};
  const first=projectForgeSections("build/one",2,sections);const replay=projectForgeSections("build/one",2,structuredClone(sections));
  expect(first).toEqual(replay);
  expect(first[0]).toMatchObject({schema:"lorebible.forge-category-record/v1",buildId:"build/one",bundleIndex:2,sectionKey:"npcs",categoryId:"character",recordKind:"entity",sourceEntryId:"npc-1",semanticName:"Mara",status:"proposed"});
  expect(first[1]).toMatchObject({sectionKey:"relationshipWeb",categoryId:"relationship",recordKind:"relationship",semanticName:"Mara ↔ Vale"});
  expect(first[2]).toMatchObject({sectionKey:"knowledgeMap",recordKind:"empty_collection",payload:[]});
});

test("derives the exact manuscript sections including empty collections",()=>{
  const sections={locations:[],factions:[{id:"f-1",fields:{name:"Harbor Guild"},keys:["Harbor Guild"],permanence:"C",locked:false}]};
  expect(deriveForgeSectionsFromCategoryRecords(projectForgeSections("build/one",1,sections))).toEqual(sections);
});

test("maps every current Forge section without using prose as category identity",()=>{
  const sections={core:{title:"World"},user:{rolePosition:"Visitor"},worldPhysics:{rules:[]},status:{content:"Now"},items:[],secrets:[],conflict:{central:"Choice"},pressureProtocol:"Escalate",history:[],aesthetic:{colors:[]},naming:{commonNames:[]},pressures:[],proceduralRolls:[],opening:{firstMessage:"Hello"},expansionNotes:{},antiGravity:{},buildNotes:{}};
  const records=projectForgeSections("build/two",0,sections);
  expect(new Set(records.map(record=>record.categoryId))).toEqual(new Set(["world","user","world_rule","state","item","secret","conflict","pressure","history","aesthetic","naming","event","opening","project_note","quality_rule"]));
});

import {expect,test} from "bun:test";
import {deriveForgeSectionsFromCategoryRecords,projectForgeSections} from "../../src/lib/projectGraph/forgeCategoryRecords";

test("projects generated entries into stable typed proposal records",()=>{
  const sections={npcs:[{id:"npc-1",fields:{name:"Mara",role:"Keeper",wants:"Protect the ferry ledger.",castTier:"principal",independentActivity:"Audits crossings after dusk."},keys:["Mara"],permanence:"C",locked:false}],relationshipWeb:[{id:"rel-1",fields:{source:"Mara",target:"Vale",bond:"Former partners",pressure:"A missing payment",relation:"Mara → Vale"},keys:["Mara","Vale"],permanence:"C",locked:false}],knowledgeMap:[]};
  const first=projectForgeSections("build/one",2,sections);const replay=projectForgeSections("build/one",2,structuredClone(sections));
  expect(first).toEqual(replay);
  expect(first[0]).toMatchObject({schema:"lorebible.forge-category-record/v1",buildId:"build/one",bundleIndex:2,sectionKey:"npcs",categoryId:"character",recordKind:"entity",sourceEntryId:"npc-1",semanticName:"Mara",status:"proposed",projection:{kind:"entity",entityType:"character",name:"Mara",castTier:"principal",independentGoal:"Protect the ferry ledger.",independentActivity:"Audits crossings after dusk."}});
  expect(first[1]).toMatchObject({sectionKey:"relationshipWeb",categoryId:"relationship",recordKind:"relationship",semanticName:"Mara ↔ Vale",projection:{kind:"relationship",sourceName:"Mara",targetName:"Vale",publicDynamic:"Former partners",tension:"A missing payment",direction:"Mara → Vale"}});
  expect(first[2]).toMatchObject({sectionKey:"knowledgeMap",recordKind:"empty_collection",payload:[]});
});

test("projects knowledge and temporal boundaries without interpreting prose",()=>{
  const sections={knowledgeMap:[{id:"knowledge-1",fields:{truth:"The lower bell is cracked.",knows:"Mara",suspects:"Vale",surfacesWhen:"The bell is rung."},keys:["lower bell"],permanence:"C",locked:false}],history:[{id:"history-1",fields:{event:"The Bellfall",era:"Thirty years ago",consequence:"Night crossings stopped."},keys:["Bellfall"],permanence:"C",locked:false}],pressures:[{id:"pressure-1",fields:{name:"Flood Tide",force:"Water rises",scope:"Lower quay",clock:"At midnight"},keys:["flood tide"],permanence:"T",locked:false}]};
  const records=projectForgeSections("build/specialists",4,sections);
  expect(records[0].projection).toEqual({kind:"knowledge",truth:"The lower bell is cracked.",knownBy:"Mara",suspectedBy:"Vale",surfacesWhen:"The bell is rung."});
  expect(records[1].projection).toEqual({kind:"temporal_fact",temporalClass:"historical",label:"The Bellfall",timing:"Thirty years ago",consequence:"Night crossings stopped."});
  expect(records[2].projection).toEqual({kind:"temporal_fact",temporalClass:"current",label:"Flood Tide",timing:"At midnight",consequence:"Water rises"});
});

test("legacy NPC payloads receive an unclassified projection without invented activity",()=>{
  const [record]=projectForgeSections("build/legacy",2,{npcs:[{id:"npc-old",fields:{name:"Old Mara",role:"Keeper"},keys:["Old Mara"],permanence:"C",locked:false}]});
  expect(record.projection).toEqual({kind:"entity",entityType:"character",name:"Old Mara",castTier:"unclassified",independentGoal:null,independentActivity:null});
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

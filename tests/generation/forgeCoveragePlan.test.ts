import { expect, test } from "bun:test";
import { auditForgeBundleCoverage, auditForgeCoverage, createForgeCoveragePlan, findForgeCoverageRestartBundle, formatForgeBundleCoverage, shouldAuditForgeCoverage } from "../../server/generation/forgeCoveragePlan";
import { blueprintSelectionFixture } from "../fixtures/blueprintSelection";

test("routes every enabled Blueprint category to a Forge storage destination", () => {
  const selection = structuredClone(blueprintSelectionFixture);
  selection.lorebookRange = { min: 60, ideal: 90, max: 120 };
  selection.categories = [
    { ...selection.categories[0], id: "principal_cast", label: "Principal Cast", status: "required", targetRange: { min: 4, ideal: 6, max: 8 } },
    { ...selection.categories[0], id: "history", label: "History", status: "required", targetRange: { min: 3, ideal: 5, max: 8 } },
    { ...selection.categories[0], id: "economy", label: "Economy", status: "required", targetRange: { min: 3, ideal: 6, max: 9 } },
    { ...selection.categories[0], id: "custom:night-shifts", label: "Night Shifts", status: "required", custom: true, targetRange: { min: 2, ideal: 4, max: 6 } },
  ];
  const plan = createForgeCoveragePlan(selection);
  expect(plan.total).toEqual({ min: 60, ideal: 90, max: 120 });
  expect(plan.categories.map(item => [item.id, item.destination])).toEqual(expect.arrayContaining([
    ["principal_cast", "npcs"], ["history", "history"], ["economy", "additionalLore"], ["custom:night-shifts", "additionalLore"],
  ]));
  const prompt = formatForgeBundleCoverage(plan, ["history", "additionalLore"]);
  expect(prompt).toContain("Economy: generate 3–6 focused entries");
  expect(prompt).toContain("Night Shifts: generate 2–4 focused entries");
});

test("omitted Blueprint categories receive no Forge allocation", () => {
  const selection = structuredClone(blueprintSelectionFixture);
  selection.categories = [{ ...selection.categories[0], id: "factions", label: "Factions", status: "omitted" }];
  expect(createForgeCoveragePlan(selection).categories.find(item=>item.id==="factions")).toMatchObject({id:"factions",forbidden:true});
});

test("coverage audit rejects a manuscript that silently drops planned categories or total entries", () => {
  const selection=structuredClone(blueprintSelectionFixture);
  selection.lorebookRange={min:6,ideal:10,max:14};
  selection.categories=[
    {...selection.categories[0],id:"locations",label:"Locations",status:"required",targetRange:{min:2,ideal:3,max:4}},
    {...selection.categories[0],id:"economy",label:"Economy",status:"required",targetRange:{min:2,ideal:3,max:4}},
  ];
  const findings=auditForgeCoverage(createForgeCoveragePlan(selection),{worldPhysics:{rules:[]},locations:[{},{}],factions:[],npcs:[],relationshipWeb:[],knowledgeMap:[],items:[],secrets:[],history:[],pressures:[],additionalLore:[]});
  expect(findings).toContain("Economy produced 0 of at least 2 planned entries");
  expect(findings).toContain("Lorebook produced 2 of at least 6 planned entries");
});

test("uses accepted top-level cast ranges and audits combined single-request output",()=>{
  const selection=structuredClone(blueprintSelectionFixture);selection.principalCastRange={min:7,ideal:9,max:11};selection.rosterCastRange={min:12,ideal:16,max:20};
  selection.categories=[{...selection.categories[0],id:"principal_cast",label:"Principal Cast"},{...selection.categories[0],id:"roster_cast",label:"Roster Cast"}];
  const plan=createForgeCoveragePlan(selection);
  expect(plan.categories.find(item=>item.id==="principal_cast")?.range).toEqual(selection.principalCastRange);
  expect(plan.categories.find(item=>item.id==="roster_cast")?.range).toEqual(selection.rosterCastRange);
  expect(shouldAuditForgeCoverage(["core","history","additionalLore","opening"])).toBe(true);
});

test("coverage audit rejects material generated for an omitted category",()=>{
  const selection=structuredClone(blueprintSelectionFixture);selection.lorebookRange={min:0,ideal:0,max:10};selection.categories=[{...selection.categories[0],id:"factions",label:"Factions",status:"omitted",targetRange:{min:0,ideal:0,max:0}}];
  expect(auditForgeCoverage(createForgeCoveragePlan(selection),{worldPhysics:{rules:[]},locations:[],factions:[{}],npcs:[],relationshipWeb:[],knowledgeMap:[],items:[],secrets:[],history:[],pressures:[],additionalLore:[]})).toContain("Factions was omitted but produced 1 entry");
});

test("an undersized completed checkpoint restarts from its earliest deficient bundle",()=>{
  const selection=structuredClone(blueprintSelectionFixture);selection.lorebookRange={min:6,ideal:8,max:10};selection.categories=[{...selection.categories[0],id:"factions",label:"Factions",status:"required",targetRange:{min:3,ideal:4,max:5}}];
  expect(findForgeCoverageRestartBundle(createForgeCoveragePlan(selection),{worldPhysics:{rules:[]},locations:[],factions:[{}],npcs:[],relationshipWeb:[],knowledgeMap:[],items:[],secrets:[],history:[],pressures:[],additionalLore:[]})).toBe(0);
});

test("partial step-by-step checkpoints are not compared with final library totals",()=>{
  const selection=structuredClone(blueprintSelectionFixture);selection.lorebookRange={min:80,ideal:120,max:160};
  expect(findForgeCoverageRestartBundle(createForgeCoveragePlan(selection),{core:{},user:{},worldPhysics:{rules:[{}]},status:{}})).toBeNull();
});

test("each bundle validates its own categories before durable acceptance",()=>{
  const selection=structuredClone(blueprintSelectionFixture);selection.lorebookRange={min:0,ideal:10,max:20};selection.categories=[{...selection.categories[0],id:"locations",label:"Locations",status:"required",targetRange:{min:3,ideal:4,max:6}}];
  expect(auditForgeBundleCoverage(createForgeCoveragePlan(selection),{locations:[{}]},["locations","factions"])).toContain("Locations produced 1 of at least 3 planned entries");
});

test("coverage audit enforces accepted total and category ceilings",()=>{
  const selection=structuredClone(blueprintSelectionFixture);selection.lorebookRange={min:1,ideal:2,max:2};selection.categories=[{...selection.categories[0],id:"locations",label:"Locations",status:"required",targetRange:{min:1,ideal:1,max:1}}];
  const document={worldPhysics:{rules:[]},locations:[{},{},{}],factions:[],npcs:[],relationshipWeb:[],knowledgeMap:[],items:[],secrets:[],history:[],pressures:[],additionalLore:[]};
  const findings=auditForgeCoverage(createForgeCoveragePlan(selection),document);
  expect(findings).toContain("Locations produced 3 above the maximum 1 planned entries");expect(findings).toContain("Lorebook produced 3 above the maximum 2 planned entries");
});

import { expect, test } from "bun:test";
import { FORGE_BUNDLE_DEFINITIONS } from "../../server/generation/forgeSchemas";
import { FORGE_BUNDLE_MISSIONS, FORGE_CORRECTION, FORGE_CRAFT, FORGE_PROTOCOL } from "../../server/generation/prompts/forgeDefaults";
import { compileForgePrompt } from "../../server/generation/prompts/compileForgePrompt";
import { renderSchemaContract } from "../../server/generation/schemaContract";
import type { ForgeCoveragePlan } from "../../server/generation/forgeCoveragePlan";

const coverage:Pick<ForgeCoveragePlan,"total"|"categories">={total:{min:1,ideal:2,max:3},categories:[]};

test("Forge prompt constants preserve protected macros and reject legacy generator suffix", () => {
  const protocol=FORGE_PROTOCOL+"\n"+FORGE_CRAFT+"\n"+FORGE_BUNDLE_MISSIONS[4];
  expect(protocol).toContain("{{user}}");
  expect(protocol).not.toContain("no negations in seed content");
  expect(protocol).not.toContain("loaded one-liners only");
  expect(protocol).toContain("History entries");
});

test("compiled Forge prompt carries one schema and explicit zero ownership", () => {
  const plan={...coverage,categories:[{id:"ordinary_life",label:"Ordinary Life",destination:"additionalLore",range:{min:0,ideal:0,max:0},detail:"rich",required:false,forbidden:true}]} as ForgeCoveragePlan;
  const compiled=compileForgePrompt({definition:FORGE_BUNDLE_DEFINITIONS[4],context:"Player history remains player-defined.",coveragePlan:plan,correction:null});
  const schema=renderSchemaContract(FORGE_BUNDLE_DEFINITIONS[4].schema);
  expect(compiled.promptVersion).toBe("forge-prompts/1");
  expect(compiled.systemInstruction).toContain(FORGE_PROTOCOL);
  expect(compiled.systemInstruction).not.toContain("FORMAT DEMONSTRATION ONLY");
  expect(compiled.userPrompt.indexOf(schema)).toBe(compiled.userPrompt.lastIndexOf(schema));
  expect(compiled.userPrompt).toContain("ASSIGNMENT: Bundle 5: History, Aesthetic, Naming, and Pressures");
  expect(compiled.userPrompt).toContain("forge-prompts/1");
  expect(compiled.userPrompt).toContain("SOURCE_CONTEXT");
  expect(compiled.userPrompt).toContain("COVERAGE_DATA");
  expect(compiled.userPrompt).toContain("OUTPUT_SCHEMA");
  expect(compiled.userPrompt).toContain("ordinary_life");
  expect(compiled.userPrompt).toContain("omitted with zero entries owned by this bundle");
  expect(compiled.userPrompt).toContain("{{user}}");
  expect(compiled.userPrompt).not.toContain("Explain your reasoning");
});

test("Forge correction is compiled once and never accumulates", () => {
  const first=compileForgePrompt({definition:FORGE_BUNDLE_DEFINITIONS[4],context:"context",coverageBrief:"coverage",coveragePlan:coverage as ForgeCoveragePlan,correction:null});
  const second=compileForgePrompt({definition:FORGE_BUNDLE_DEFINITIONS[4],context:first.context,coverageBrief:first.coverageBrief,coveragePlan:coverage as ForgeCoveragePlan,correction:"[]"});
  expect(second.userPrompt.match(/CONTRACT CORRECTION/g)).toHaveLength(1);
  expect(second.userPrompt).toContain("[]");
  expect(second.userPrompt).not.toContain("CONTRACT CORRECTION[]");
});

test("combined Forge requests receive each remaining mission exactly once", () => {
  const definition={...FORGE_BUNDLE_DEFINITIONS[0],index:5,keys:[...FORGE_BUNDLE_DEFINITIONS[0].keys,...FORGE_BUNDLE_DEFINITIONS[1].keys],schema:{...FORGE_BUNDLE_DEFINITIONS[0].schema,properties:{...FORGE_BUNDLE_DEFINITIONS[0].schema.properties,...FORGE_BUNDLE_DEFINITIONS[1].schema.properties},required:[...FORGE_BUNDLE_DEFINITIONS[0].schema.required??[],...FORGE_BUNDLE_DEFINITIONS[1].schema.required??[]]}} as typeof FORGE_BUNDLE_DEFINITIONS[number];
  const compiled=compileForgePrompt({definition,context:"context",coveragePlan:coverage as ForgeCoveragePlan,correction:null});
  expect(compiled.userPrompt).toContain("ASSIGNMENT: foundation, player framing");
  expect(compiled.userPrompt.match(/ASSIGNMENT: locations and factions/g)).toHaveLength(1);
});

test("Bundle 6 uses its opening mission rather than Bundle 1 and 2 missions", () => {
  const compiled=compileForgePrompt({definition:FORGE_BUNDLE_DEFINITIONS[5],context:"context",coveragePlan:coverage as ForgeCoveragePlan});
  expect(compiled.userPrompt).toContain("ASSIGNMENT: procedural material, playable opening");
  expect(compiled.userPrompt).not.toContain("ASSIGNMENT: foundation, player framing");
});

test("legacy label-only coverage text cannot replace exact category IDs", () => {
  const plan={...coverage,categories:[{id:"ordinary_life",label:"Ordinary Life",destination:"additionalLore",range:{min:3,ideal:4,max:6},detail:"rich",required:true,forbidden:false}]} as ForgeCoveragePlan;
  const compiled=compileForgePrompt({definition:FORGE_BUNDLE_DEFINITIONS[4],context:"context",coverageBrief:"Ordinary Life: 3-6 entries",coveragePlan:plan});
  expect(compiled.userPrompt).toMatch(/"id":\s*"ordinary_life"/);
  expect(compiled.userPrompt).toMatch(/"destination":\s*"additionalLore"/);
});

test("cast coverage identifies the exact principal and roster tiers", () => {
  const plan={...coverage,categories:[
    {id:"principal_cast",label:"Principal Cast",destination:"npcs",range:{min:2,ideal:3,max:4},detail:"rich",required:true,forbidden:false},
    {id:"roster_cast",label:"Roster Cast",destination:"npcs",range:{min:2,ideal:4,max:6},detail:"standard",required:false,forbidden:false},
  ]} as ForgeCoveragePlan;
  const compiled=compileForgePrompt({definition:FORGE_BUNDLE_DEFINITIONS[2],context:"context",coveragePlan:plan});
  expect(compiled.userPrompt).toMatch(/"id":\s*"principal_cast"[\s\S]*?"castTier":\s*"principal"/);
  expect(compiled.userPrompt).toMatch(/"id":\s*"roster_cast"[\s\S]*?"castTier":\s*"roster"/);
});

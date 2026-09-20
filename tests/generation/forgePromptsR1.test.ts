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

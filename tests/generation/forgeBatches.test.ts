import{expect,test}from"bun:test";
import{createForgeGenerationBatches}from"../../server/generation/forgeBatches";

const bundles=[
  {name:"One",keys:["core"],schema:{type:"OBJECT",properties:{core:{type:"OBJECT"}},required:["core"]},promptModifier:"Write core.",includeExample:true},
  {name:"Two",keys:["locations","factions"],schema:{type:"OBJECT",properties:{locations:{type:"ARRAY"},factions:{type:"ARRAY"}},required:["locations","factions"]},promptModifier:"Write places.",includeExample:false},
];
test("continuous and checkpointed Forge preserve one batch per bundle",()=>{expect(createForgeGenerationBatches(bundles,0,2,"continuous")).toHaveLength(2);expect(createForgeGenerationBatches(bundles,1,2,"step_by_step")[0]).toMatchObject({startBundleIndex:1,completedBundleCount:2});});
test("single-request Forge combines all remaining schemas and prompts into one provider batch",()=>{const batches=createForgeGenerationBatches(bundles,0,2,"single_request");expect(batches).toHaveLength(1);expect(batches[0]).toMatchObject({startBundleIndex:0,completedBundleCount:2,bundle:{keys:["core","locations","factions"],schema:{properties:{core:{type:"OBJECT"},locations:{type:"ARRAY"},factions:{type:"ARRAY"}},required:["core","locations","factions"]},includeExample:true}});expect(batches[0].bundle.promptModifier).toContain("Write core.");expect(batches[0].bundle.promptModifier).toContain("Write places.");});
test("single-request resume asks only for unfinished bundles",()=>{const batches=createForgeGenerationBatches(bundles,1,2,"single_request");expect(batches[0].bundle.keys).toEqual(["locations","factions"]);expect(batches[0].bundle.schema.required).toEqual(["locations","factions"]);});

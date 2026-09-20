import { expect, test } from "bun:test";
import { createForgeResumePlan, FORGE_BUNDLE_KEYS, selectForgeBundleSections } from "../../server/generation/forgeResume";

test("a fresh continuous Forge starts at bundle one and runs all bundles",()=>{
  expect(createForgeResumePlan({},"continuous")).toMatchObject({startBundleIndex:0,endBundleIndexExclusive:6,completedBundleCount:0});
});

test("selects only expected bundle sections and reports provider spillover",()=>{
  const selected=selectForgeBundleSections({locations:[{id:"l"}],factions:[],keys:["stray"],comment:"extra"},["locations","factions"]);
  expect(selected.sections).toEqual({locations:[{id:"l"}],factions:[]});
  expect(selected.ignoredKeys).toEqual(["comment","keys"]);
});

test("rejects a bundle that omits an expected section",()=>{
  expect(()=>selectForgeBundleSections({locations:[]},["locations","factions"])).toThrow("missing factions");
});

test("resume starts after the last complete contiguous bundle",()=>{
  const sections=Object.fromEntries([...FORGE_BUNDLE_KEYS[0],...FORGE_BUNDLE_KEYS[1]].map(key=>[key,{saved:true}]));
  expect(createForgeResumePlan(sections,"continuous")).toMatchObject({startBundleIndex:2,endBundleIndexExclusive:6,completedBundleCount:2});
});

test("a v0.60 bundle-five checkpoint is preserved when supplemental lore needs a migration",()=>{
  const old={core:{},user:{},worldPhysics:{},status:{},locations:[],factions:[],npcs:[],relationshipWeb:[],knowledgeMap:[],items:[],secrets:[],conflict:{},pressureProtocol:"",history:[],aesthetic:{},naming:{},pressures:[]};
  const before=structuredClone(old);
  expect(()=>createForgeResumePlan(old,"continuous",{requireAdditionalLore:true})).toThrow("preserved");
  expect(old).toEqual(before);
});

test("step by step runs exactly one incomplete bundle",()=>{
  const sections=Object.fromEntries(FORGE_BUNDLE_KEYS[0].map(key=>[key,{saved:true}]));
  expect(createForgeResumePlan(sections,"step_by_step")).toMatchObject({startBundleIndex:1,endBundleIndexExclusive:2,completedBundleCount:1});
});

test("rejects partial, noncontiguous, and unknown checkpoint sections",()=>{
  expect(()=>createForgeResumePlan({core:{}},"continuous")).toThrow("partial bundle 1");
  expect(()=>createForgeResumePlan({locations:{},factions:{}},"continuous")).toThrow("noncontiguous");
  expect(()=>createForgeResumePlan({surprise:{}},"continuous")).toThrow("unknown section");
});

export type ForgeExecutionMode="continuous"|"step_by_step"|"single_request";
export const FORGE_BUNDLE_KEYS=[
  ["core","user","worldPhysics","status"],
  ["locations","factions"],
  ["npcs","relationshipWeb","knowledgeMap"],
  ["items","secrets","conflict","pressureProtocol"],
  ["history","aesthetic","naming","pressures"],
  ["proceduralRolls","opening","expansionNotes","antiGravity","buildNotes"],
] as const;
const KNOWN=new Set<string>(FORGE_BUNDLE_KEYS.flat());

export interface ForgeResumePlan{startBundleIndex:number;endBundleIndexExclusive:number;completedBundleCount:number;resumeSections:Record<string,unknown>}

export function selectForgeBundleSections(result:unknown,expectedKeys:readonly string[]):{sections:Record<string,unknown>;ignoredKeys:string[]}{
  if(!result||typeof result!=="object"||Array.isArray(result))throw new Error("Forge bundle response must be an object.");
  const source=result as Record<string,unknown>; const sections:Record<string,unknown>={};
  for(const key of expectedKeys){if(!Object.hasOwn(source,key))throw new Error(`Forge bundle is missing ${key}.`);sections[key]=source[key];}
  const ignoredKeys=Object.keys(source).filter(key=>!expectedKeys.includes(key)).sort();
  return{sections,ignoredKeys};
}

export function createForgeResumePlan(input:unknown,mode:ForgeExecutionMode):ForgeResumePlan{
  if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("Forge checkpoint must be an object.");
  const sections=input as Record<string,unknown>;
  for(const key of Object.keys(sections))if(!KNOWN.has(key))throw new Error(`Forge checkpoint contains unknown section ${key}.`);
  let completed=0; let foundGap=false;
  for(let index=0;index<FORGE_BUNDLE_KEYS.length;index++){
    const present=FORGE_BUNDLE_KEYS[index].filter(key=>Object.hasOwn(sections,key)).length;
    if(present>0&&present<FORGE_BUNDLE_KEYS[index].length)throw new Error(`Forge checkpoint contains partial bundle ${index+1}.`);
    if(present===FORGE_BUNDLE_KEYS[index].length){if(foundGap)throw new Error("Forge checkpoint contains noncontiguous bundles.");completed++;}else foundGap=true;
  }
  const end=mode==="step_by_step"?Math.min(completed+1,FORGE_BUNDLE_KEYS.length):FORGE_BUNDLE_KEYS.length;
  return{startBundleIndex:completed,endBundleIndexExclusive:end,completedBundleCount:completed,resumeSections:structuredClone(sections)};
}

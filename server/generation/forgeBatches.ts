import type{ForgeExecutionMode}from"./forgeResume";
import type{JsonSchema}from"../../src/contracts/generation";

export interface ForgeBundleDefinition{ name:string;keys:readonly string[];schema:{type?:unknown;properties?:Readonly<Record<string,unknown>>;required?:readonly string[]};promptModifier?:string;includeExample?:boolean }
export interface ForgeGenerationBatch<T extends ForgeBundleDefinition=ForgeBundleDefinition>{bundle:T;startBundleIndex:number;completedBundleCount:number}

export function createForgeGenerationBatches<T extends ForgeBundleDefinition>(bundles:readonly T[],startBundleIndex:number,endBundleIndexExclusive:number,mode:ForgeExecutionMode):ForgeGenerationBatch[]{
  const remaining=bundles.slice(startBundleIndex,endBundleIndexExclusive);
  if(mode!=="single_request")return remaining.map((bundle,index)=>({bundle,startBundleIndex:startBundleIndex+index,completedBundleCount:startBundleIndex+index+1}));
  if(!remaining.length)return[];
  const combined:ForgeBundleDefinition={name:"Complete manuscript in one provider request",keys:remaining.flatMap(bundle=>[...bundle.keys]),schema:{type:"object",properties:Object.assign({},...remaining.map(bundle=>bundle.schema.properties??{})),required:remaining.flatMap(bundle=>[...bundle.schema.required??[]])},promptModifier:remaining.map(bundle=>bundle.promptModifier??"").join("\n\n"),includeExample:remaining.some(bundle=>bundle.includeExample)};
  return[{bundle:combined,startBundleIndex,completedBundleCount:endBundleIndexExclusive}];
}

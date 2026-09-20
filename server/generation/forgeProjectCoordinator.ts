import {randomUUID} from "node:crypto";
import type{ForgeBuildRecordV1,ProjectGraphV1}from"../../src/contracts/projectGraph.js";
import{canonicalizeJson,sha256Hex}from"../../src/lib/projectGraph/canonicalJson.js";
import{resumeForgeBuild}from"../../src/lib/projectGraph/forgeBuilds.js";
import type{ProjectGraphCommand}from"../../src/lib/projectGraph/commands.js";
import type{ProjectRepository}from"../projects/projectRepository.js";
import{FORGE_BUNDLE_KEYS,type ForgeExecutionMode}from"./forgeResume.js";
import type{BlueprintSelectionV1}from"../../src/contracts/blueprintSelection.js";

export interface ForgeCreativeSource{sparkText:unknown;parse:unknown;canon:unknown;physics:unknown;chosenTake:unknown;blueprintSelection?:BlueprintSelectionV1}
export interface PreparedForgeProject{projectId:string;buildId:string;sourceRevision:number;inputFingerprint:string;graph:ProjectGraphV1;resumeSections:Record<string,unknown>;nextBundleIndex:number;complete:boolean}
export interface ActiveForgeAttempt extends PreparedForgeProject{bundleIndex:number;attemptId:string}
interface Dependencies{now?:()=>string;id?:(kind:"build"|"attempt"|"command")=>string}

export function createForgeInputFingerprint(source:ForgeCreativeSource){return`sha256:${sha256Hex(canonicalizeJson({forgePipelineVersion:2,source}))}`;}

export function createForgeProjectCoordinator(repository:ProjectRepository,deps:Dependencies={}){
  const now=deps.now??(()=>new Date().toISOString());const id=deps.id??((kind)=>`${kind}/${randomUUID()}`);
  async function apply(projectId:string,command:ProjectGraphCommand,commandId=id("command")){const graph=await repository.load(projectId);if(!graph)throw new Error("Prepared Project Graph was not found.");return(await repository.apply(projectId,{commandId,expectedRevision:graph.project.revision!,issuedAt:now(),command})).graph;}
  function context(graph:ProjectGraphV1,build:ForgeBuildRecordV1):PreparedForgeProject{const resumed=resumeForgeBuild(build,build.inputFingerprint,build.sourceRevision);return{projectId:graph.project.id,buildId:build.id,sourceRevision:build.sourceRevision,inputFingerprint:build.inputFingerprint,graph,resumeSections:resumed.sections,nextBundleIndex:resumed.nextBundleIndex,complete:resumed.complete};}
  function find(graph:ProjectGraphV1,fingerprint:string){return[...graph.builds].reverse().find((item)=>item.kind==="forge"&&(item as ForgeBuildRecordV1).inputFingerprint===fingerprint)as ForgeBuildRecordV1|undefined;}
  return{
    async prepare(projectId:string,source:ForgeCreativeSource,executionMode:ForgeExecutionMode){const fingerprint=createForgeInputFingerprint(source);let graph=await repository.load(projectId);if(!graph)throw new Error("Prepared Project Graph was not found.");let build=find(graph,fingerprint);
      if(build&&build.lastTransitionRevision!==graph.project.revision)build=undefined;
      if(!build){const buildId=id("build");graph=await apply(projectId,{type:"forge.initialize",buildId,inputFingerprint:fingerprint,executionMode});build=graph.builds.find((item)=>item.id===buildId)as ForgeBuildRecordV1;}
      if(build.status==="active"){const batch=build.batches.find((item)=>item.status==="active");const attempt=batch?.attempts.find((item)=>item.status==="active");if(batch&&attempt){graph=await apply(projectId,{type:"forge.batch.fail",buildId:build.id,bundleIndex:batch.index,attemptId:attempt.id,code:"CLIENT_DISCONNECTED",message:"Interrupted before completion.",inputFingerprint:build.inputFingerprint,sourceRevision:build.sourceRevision});build=graph.builds.find((item)=>item.id===build!.id)as ForgeBuildRecordV1;}}
      return context(graph,build);
    },
    async begin(prepared:PreparedForgeProject,input:{bundleIndex:number;provider:string;modelId:string;route:string}){const attemptId=id("attempt");const graph=await apply(prepared.projectId,{type:"forge.batch.begin",buildId:prepared.buildId,bundleIndex:input.bundleIndex,attemptId,provider:input.provider,modelId:input.modelId,route:input.route,inputFingerprint:prepared.inputFingerprint,sourceRevision:prepared.sourceRevision});return{...context(graph,graph.builds.find((item)=>item.id===prepared.buildId)as ForgeBuildRecordV1),bundleIndex:input.bundleIndex,attemptId};},
    async complete(active:ActiveForgeAttempt,sections:Record<string,unknown>){const graph=await apply(active.projectId,{type:"forge.batch.complete",buildId:active.buildId,bundleIndex:active.bundleIndex,attemptId:active.attemptId,sections,inputFingerprint:active.inputFingerprint,sourceRevision:active.sourceRevision});return context(graph,graph.builds.find((item)=>item.id===active.buildId)as ForgeBuildRecordV1);},
    async completeRange(active:ActiveForgeAttempt,sections:Record<string,unknown>,endBundleIndexExclusive:number,provenance:{provider:string;modelId:string;route:string}){const commandId=id("command");const attemptIds=FORGE_BUNDLE_KEYS.slice(active.bundleIndex,endBundleIndexExclusive).map((_,offset)=>offset===0?active.attemptId:`${commandId}/bundle/${active.bundleIndex+offset}`);const graph=await apply(active.projectId,{type:"forge.range.complete",buildId:active.buildId,startBundleIndex:active.bundleIndex,endBundleIndexExclusive,attemptIds,sections,provider:provenance.provider,modelId:provenance.modelId,route:provenance.route,inputFingerprint:active.inputFingerprint,sourceRevision:active.sourceRevision},commandId);return context(graph,graph.builds.find((item)=>item.id===active.buildId) as ForgeBuildRecordV1);},
    async fail(active:ActiveForgeAttempt,code:string){const graph=await apply(active.projectId,{type:"forge.batch.fail",buildId:active.buildId,bundleIndex:active.bundleIndex,attemptId:active.attemptId,code,message:"Provider attempt failed.",inputFingerprint:active.inputFingerprint,sourceRevision:active.sourceRevision});return context(graph,graph.builds.find((item)=>item.id===active.buildId)as ForgeBuildRecordV1);},
    async cancel(active:ActiveForgeAttempt){const graph=await apply(active.projectId,{type:"forge.batch.cancel",buildId:active.buildId,bundleIndex:active.bundleIndex,attemptId:active.attemptId,inputFingerprint:active.inputFingerprint,sourceRevision:active.sourceRevision});return context(graph,graph.builds.find((item)=>item.id===active.buildId)as ForgeBuildRecordV1);},
  };
}

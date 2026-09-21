import type { CanonStatus, ForgeBuildRecordV1, ForgeJobV1, ProjectGraphV1, TemporalClass, Visibility } from "../../contracts/projectGraph";
import { canonicalizeJson } from "./canonicalJson";
import { beginForgeBatch, cancelForgeBatch, completeForgeBatch, completeForgeRange, createForgeBuild, failForgeBatch, ForgeBuildError } from "./forgeBuilds";
import { parseProjectGraph } from "./validation";
import { beginSpecialistJob, completeSpecialistJob, createSpecialistLedger, replaceSpecialistJob, stopSpecialistJob, ForgeSpecialistError } from "./forgeSpecialistLedger";

export type ProjectGraphCommand =
  | { type:"entity.rename"; entityId:string; name:string }
  | { type:"canon.update"; factId:string; value:unknown; status?:CanonStatus; visibility?:Visibility; temporalClass?:TemporalClass }
  | { type:"forge.initialize"; buildId:string; inputFingerprint:string; executionMode:"continuous"|"step_by_step"|"single_request" }
  | { type:"forge.batch.begin"; buildId:string; bundleIndex:number; attemptId:string; provider:string; modelId:string; route:string; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.batch.complete"; buildId:string; bundleIndex:number; attemptId:string; sections:Record<string,unknown>; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.range.complete"; buildId:string; startBundleIndex:number; endBundleIndexExclusive:number; attemptIds:string[]; sections:Record<string,unknown>; provider:string; modelId:string; route:string; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.batch.fail"; buildId:string; bundleIndex:number; attemptId:string; code:string; message:string; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.batch.cancel"; buildId:string; bundleIndex:number; attemptId:string; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.jobs.initialize"; buildId:string; planHash:string; jobs:ForgeJobV1[]; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.job.begin"; buildId:string; jobId:string; attemptId:string; provider:string; modelId:string; promptHash:string; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.job.complete"; buildId:string; jobId:string; attemptId:string; sections:Record<string,unknown>; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.job.fail"; buildId:string; jobId:string; attemptId:string; code:string; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.job.cancel"; buildId:string; jobId:string; attemptId:string; inputFingerprint:string; sourceRevision:number }
  | { type:"forge.job.replace"; buildId:string; jobId:string; attemptId:string; children:ForgeJobV1[]; inputFingerprint:string; sourceRevision:number };
export interface ProjectGraphCommandEnvelope { commandId:string; expectedRevision:number; issuedAt:string; command:ProjectGraphCommand }
export interface ChangeImpact { targetId:string; path:string; classification:"automatic_structural_edit"|"proposed_semantic_edit"; reason:string }
export interface ProjectGraphChangeResult { graph:ProjectGraphV1; receipt:{schema:"lorebible.project-graph-change/v1";commandId:string;projectId:string;fromRevision:number;toRevision:number;changedIds:string[];automaticChanges:ChangeImpact[];proposedSemanticEdits:ChangeImpact[];unaffectedSummary:string[];appliedAt:string} }
export type CommandErrorCode="invalid_command"|"revision_conflict"|"missing_target"|"no_change"|"invalid_graph"|"credential_rejected";
export class ProjectGraphCommandError extends Error { constructor(message:string,public code:CommandErrorCode,public expectedRevision?:number,public actualRevision?:number){super(message);this.name="ProjectGraphCommandError";} }

function rejectCredentials(value:unknown,path="value"):void { if(!value||typeof value!=="object")return; for(const [k,v] of Object.entries(value)){if(/^(api[_-]?key|credential|access[_-]?token|secret[_-]?key)$/i.test(k))throw new ProjectGraphCommandError(`Credential-shaped field rejected at ${path}.${k}.`,"credential_rejected");rejectCredentials(v,`${path}.${k}`);} }
function proseImpacts(value:unknown,needle:string,path="",out:ChangeImpact[]=[]):ChangeImpact[]{ if(typeof value==="string"&&value.includes(needle))out.push({targetId:"project",path,classification:"proposed_semantic_edit",reason:`Text may reference the former entity name '${needle}'.`}); else if(value&&typeof value==="object")for(const [k,v] of Object.entries(value))proseImpacts(v,needle,path?`${path}.${k}`:k,out); return out; }
function forgeBuild(graph:ProjectGraphV1,id:string):ForgeBuildRecordV1{const build=graph.builds.find(item=>item.id===id);if(!build||build.kind!=="forge")throw new ProjectGraphCommandError("Forge build was not found.","missing_target");return build as ForgeBuildRecordV1;}
function forgeTransition<T>(work:()=>T):T{try{return work();}catch(error){if(error instanceof ForgeBuildError||error instanceof ForgeSpecialistError)throw new ProjectGraphCommandError(error.message,"invalid_command");throw error;}}
function verifyForgeTransition(build:ForgeBuildRecordV1,command:{inputFingerprint:string;sourceRevision:number},revision:number){if(build.inputFingerprint!==command.inputFingerprint||build.sourceRevision!==command.sourceRevision)throw new ProjectGraphCommandError("Forge build input or source revision is stale.","invalid_command");if(build.lastTransitionRevision!==revision)throw new ProjectGraphCommandError("Project changed outside this Forge build; start a new build from current canon.","invalid_command");}

function acceptedRangeReplay(input:ProjectGraphV1,envelope:ProjectGraphCommandEnvelope):ProjectGraphChangeResult|null{
  const command=envelope.command;
  if(command.type!=="forge.range.complete")return null;
  const build=input.builds.find(item=>item.id===command.buildId);
  if(!build||build.kind!=="forge")return null;
  const forgeBuild=build as ForgeBuildRecordV1;
  const allAccepted=forgeBuild.batches.filter(batch=>batch.acceptedCommandId===envelope.commandId);
  if(!allAccepted.length)return null;
  const batches=forgeBuild.batches.slice(command.startBundleIndex,command.endBundleIndexExclusive);
  if(batches.length!==command.attemptIds.length||batches.length===0)throw new ProjectGraphCommandError("Forge range replay does not match the accepted command.","invalid_command");
  const accepted=batches.map(batch=>batch.acceptedCommandId===envelope.commandId);
  rejectCredentials(command.sections);
  const acceptedRangeMatches=allAccepted.length===batches.length&&allAccepted.every((batch,index)=>batch.index===command.startBundleIndex+index);
  const acceptedSections=Object.assign({},...batches.map(batch=>batch.sections??{}));
  if(!accepted.every(Boolean)||!acceptedRangeMatches||canonicalizeJson(command.sections)!==canonicalizeJson(acceptedSections)||forgeBuild.inputFingerprint!==command.inputFingerprint||forgeBuild.sourceRevision!==command.sourceRevision)throw new ProjectGraphCommandError("Forge range replay does not match the accepted command.","invalid_command");
  const matches=batches.every((batch,index)=>{
    const attempt=batch.attempts.at(-1);
    const selected=Object.fromEntries(batch.expectedKeys.map(key=>[key,command.sections[key]]));
    return batch.status==="complete"&&attempt?.id===command.attemptIds[index]&&attempt.provider===command.provider&&attempt.modelId===command.modelId&&attempt.route===command.route&&canonicalizeJson(batch.sections)===canonicalizeJson(selected);
  });
  if(!matches)throw new ProjectGraphCommandError("Forge range replay does not match the accepted command.","invalid_command");
  const revision=input.project.revision;
  return {graph:structuredClone(input),receipt:{schema:"lorebible.project-graph-change/v1",commandId:envelope.commandId,projectId:input.project.id,fromRevision:revision,toRevision:revision,changedIds:[],automaticChanges:[],proposedSemanticEdits:[],unaffectedSummary:["The Forge range command was already accepted; no records changed."],appliedAt:envelope.issuedAt}};
}

function acceptedJobReplay(input:ProjectGraphV1,envelope:ProjectGraphCommandEnvelope):ProjectGraphChangeResult|null{
  const command=envelope.command;
  if(command.type!=="forge.job.complete")return null;
  const build=input.builds.find(item=>item.id===command.buildId)as ForgeBuildRecordV1|undefined;
  const accepted=build?.specialistLedger?.jobs.find(item=>item.acceptedCommandId===envelope.commandId);
  if(!accepted)return null;
  rejectCredentials(command.sections);
  if(accepted.job.id!==command.jobId||accepted.status!=="complete"||accepted.attempts.at(-1)?.id!==command.attemptId||
    build?.inputFingerprint!==command.inputFingerprint||build.sourceRevision!==command.sourceRevision||
    canonicalizeJson(accepted.sections)!==canonicalizeJson(command.sections))throw new ProjectGraphCommandError("Forge specialist replay does not match the accepted command.","invalid_command");
  const revision=input.project.revision!;
  return{graph:structuredClone(input),receipt:{schema:"lorebible.project-graph-change/v1",commandId:envelope.commandId,projectId:input.project.id,fromRevision:revision,toRevision:revision,changedIds:[],automaticChanges:[],proposedSemanticEdits:[],unaffectedSummary:["The Forge specialist job was already accepted; no records changed."],appliedAt:envelope.issuedAt}};
}

export function applyProjectGraphCommand(input:ProjectGraphV1,envelope:ProjectGraphCommandEnvelope):ProjectGraphChangeResult{
  if(!envelope.commandId?.trim()||!Number.isSafeInteger(envelope.expectedRevision)||envelope.expectedRevision<1)throw new ProjectGraphCommandError("Invalid command envelope.","invalid_command");
  const revision=input.project.revision;
  if(!Number.isSafeInteger(revision)||revision!<1)throw new ProjectGraphCommandError("Graph revision is invalid.","invalid_graph");
  const replay=acceptedRangeReplay(input,envelope)??acceptedJobReplay(input,envelope);
  if(replay)return replay;
  if(envelope.expectedRevision!==revision)throw new ProjectGraphCommandError("Project revision conflict.","revision_conflict",envelope.expectedRevision,revision);
  const graph=structuredClone(input); const automaticChanges:ChangeImpact[]=[]; let proposedSemanticEdits:ChangeImpact[]=[]; const changedIds:string[]=[];
  if(envelope.command.type==="entity.rename"){
    const command=envelope.command; const entity=graph.entities.find(x=>x.id===command.entityId); if(!entity)throw new ProjectGraphCommandError("Entity was not found.","missing_target");
    const name=command.name.trim(); if(!name)throw new ProjectGraphCommandError("Entity name is required.","invalid_command"); if(/\p{Cc}/u.test(name))throw new ProjectGraphCommandError("Entity name cannot contain control characters.","invalid_command"); if(name===entity.name)throw new ProjectGraphCommandError("Rename makes no change.","no_change");
    const old=entity.name; entity.name=name; if(old&&!entity.aliases.includes(old))entity.aliases.push(old); changedIds.push(entity.id); automaticChanges.push({targetId:entity.id,path:`entities.${entity.id}.name`,classification:"automatic_structural_edit",reason:"Stable entity display name changed and former name was retained as an alias."}); proposedSemanticEdits=proseImpacts(graph.extensions,old,"extensions");
  } else if(envelope.command.type==="canon.update"){
    const command=envelope.command; rejectCredentials(command.value); canonicalizeJson(command.value);
    const fact=graph.canon.find(x=>x.id===command.factId); if(!fact)throw new ProjectGraphCommandError("Canon fact was not found.","missing_target");
    const next={value:command.value,status:command.status??fact.status,visibility:command.visibility??fact.visibility,temporalClass:command.temporalClass??fact.temporalClass};
    if(canonicalizeJson({value:fact.value,status:fact.status,visibility:fact.visibility,temporalClass:fact.temporalClass})===canonicalizeJson(next))throw new ProjectGraphCommandError("Fact update makes no change.","no_change");
    Object.assign(fact,next); changedIds.push(fact.id); automaticChanges.push({targetId:fact.id,path:`canon.${fact.id}`,classification:"automatic_structural_edit",reason:"Explicit canon fact fields were updated without changing identity or provenance."});
  } else if(envelope.command.type==="forge.initialize"){
    const command=envelope.command;if(graph.builds.some(item=>item.id===command.buildId))throw new ProjectGraphCommandError("Build ID already exists.","invalid_command");
    const build=forgeTransition(()=>createForgeBuild({id:command.buildId,sourceRevision:revision,inputFingerprint:command.inputFingerprint,executionMode:command.executionMode,createdAt:envelope.issuedAt}));graph.builds.push(build);changedIds.push(build.id);automaticChanges.push({targetId:build.id,path:`builds.${build.id}`,classification:"automatic_structural_edit",reason:"Durable Forge build and six pending bundle records were initialized."});
  } else if(envelope.command.type==="forge.batch.begin"){
    const command=envelope.command;const index=graph.builds.findIndex(item=>item.id===command.buildId);const build=forgeBuild(graph,command.buildId);verifyForgeTransition(build,command,revision);const next=forgeTransition(()=>beginForgeBatch(build,{bundleIndex:command.bundleIndex,attemptId:command.attemptId,provider:command.provider,modelId:command.modelId,route:command.route,startedAt:envelope.issuedAt}));next.lastTransitionRevision=revision+1;graph.builds[index]=next;changedIds.push(build.id);automaticChanges.push({targetId:build.id,path:`builds.${build.id}.batches.${command.bundleIndex}`,classification:"automatic_structural_edit",reason:"Forge provider attempt began without altering completed bundle content."});
  } else if(envelope.command.type==="forge.batch.complete"){
    const command=envelope.command;rejectCredentials(command.sections);canonicalizeJson(command.sections);const index=graph.builds.findIndex(item=>item.id===command.buildId);const build=forgeBuild(graph,command.buildId);verifyForgeTransition(build,command,revision);const next=forgeTransition(()=>completeForgeBatch(build,{bundleIndex:command.bundleIndex,attemptId:command.attemptId,commandId:envelope.commandId,sections:command.sections,completedAt:envelope.issuedAt}));next.lastTransitionRevision=revision+1;graph.builds[index]=next;changedIds.push(build.id);automaticChanges.push({targetId:build.id,path:`builds.${build.id}.checkpoint`,classification:"automatic_structural_edit",reason:"Validated Forge bundle sections were accepted into the durable checkpoint."});
  } else if(envelope.command.type==="forge.range.complete"){
    const command=envelope.command;rejectCredentials(command.sections);canonicalizeJson(command.sections);const index=graph.builds.findIndex(item=>item.id===command.buildId);const build=forgeBuild(graph,command.buildId);verifyForgeTransition(build,command,revision);const next=forgeTransition(()=>completeForgeRange(build,{startBundleIndex:command.startBundleIndex,endBundleIndexExclusive:command.endBundleIndexExclusive,attemptIds:command.attemptIds,commandId:envelope.commandId,sections:command.sections,provider:command.provider,modelId:command.modelId,route:command.route,completedAt:envelope.issuedAt}));next.lastTransitionRevision=revision+1;graph.builds[index]=next;changedIds.push(build.id);automaticChanges.push({targetId:build.id,path:`builds.${build.id}.checkpoint`,classification:"automatic_structural_edit",reason:"A validated combined Forge response was accepted as one atomic bundle range."});
  } else if(envelope.command.type==="forge.batch.fail"){
    const command=envelope.command;const index=graph.builds.findIndex(item=>item.id===command.buildId);const build=forgeBuild(graph,command.buildId);verifyForgeTransition(build,command,revision);const next=forgeTransition(()=>failForgeBatch(build,{bundleIndex:command.bundleIndex,attemptId:command.attemptId,code:command.code,message:command.message,failedAt:envelope.issuedAt}));next.lastTransitionRevision=revision+1;graph.builds[index]=next;changedIds.push(build.id);automaticChanges.push({targetId:build.id,path:`builds.${build.id}.batches.${command.bundleIndex}`,classification:"automatic_structural_edit",reason:"Forge failure diagnostics were recorded while preserving accepted sections."});
  } else if(envelope.command.type==="forge.batch.cancel"){
    const command=envelope.command;const index=graph.builds.findIndex(item=>item.id===command.buildId);const build=forgeBuild(graph,command.buildId);verifyForgeTransition(build,command,revision);const next=forgeTransition(()=>cancelForgeBatch(build,{bundleIndex:command.bundleIndex,attemptId:command.attemptId,cancelledAt:envelope.issuedAt}));next.lastTransitionRevision=revision+1;graph.builds[index]=next;changedIds.push(build.id);automaticChanges.push({targetId:build.id,path:`builds.${build.id}.batches.${command.bundleIndex}`,classification:"automatic_structural_edit",reason:"Forge cancellation was recorded without discarding accepted sections."});
  } else if(envelope.command.type.startsWith("forge.job") || envelope.command.type==="forge.jobs.initialize"){
    const command=envelope.command;
    const index=graph.builds.findIndex(item=>item.id===command.buildId);
    const build=forgeBuild(graph,command.buildId);
    verifyForgeTransition(build,command,revision);
    if(build.batches[4]?.status!=="active")throw new ProjectGraphCommandError("Bundle 5 must be active for specialist changes.","invalid_command");
    const next=structuredClone(build);
    if(command.type==="forge.jobs.initialize"){
      if(next.specialistLedger)throw new ProjectGraphCommandError("Specialist plan already exists.","invalid_command");
      next.specialistLedger=forgeTransition(()=>createSpecialistLedger({planHash:command.planHash,inputFingerprint:command.inputFingerprint,jobs:command.jobs}));
    }else{
      const ledger=next.specialistLedger;
      if(!ledger)throw new ProjectGraphCommandError("Specialist plan is missing.","invalid_command");
      if(command.type==="forge.job.begin")next.specialistLedger=forgeTransition(()=>beginSpecialistJob(ledger,{jobId:command.jobId,attemptId:command.attemptId,provider:command.provider,modelId:command.modelId,promptHash:command.promptHash,startedAt:envelope.issuedAt}));
      else if(command.type==="forge.job.complete"){
        rejectCredentials(command.sections);canonicalizeJson(command.sections);
        next.specialistLedger=forgeTransition(()=>completeSpecialistJob(ledger,{jobId:command.jobId,attemptId:command.attemptId,commandId:envelope.commandId,sections:command.sections,completedAt:envelope.issuedAt}));
      }else if(command.type==="forge.job.replace")next.specialistLedger=forgeTransition(()=>replaceSpecialistJob(ledger,{jobId:command.jobId,attemptId:command.attemptId,children:command.children,replacedAt:envelope.issuedAt}));
      else next.specialistLedger=forgeTransition(()=>stopSpecialistJob(ledger,{jobId:command.jobId,attemptId:command.attemptId,status:command.type==="forge.job.cancel"?"cancelled":"failed",failureCode:command.type==="forge.job.fail"?command.code:undefined,stoppedAt:envelope.issuedAt}));
    }
    next.lastTransitionRevision=revision+1;next.updatedAt=envelope.issuedAt;graph.builds[index]=next;changedIds.push(build.id);automaticChanges.push({targetId:build.id,path:`builds.${build.id}.specialistLedger`,classification:"automatic_structural_edit",reason:"Durable specialist progress changed without altering accepted bundle content."});
  } else throw new ProjectGraphCommandError("Unsupported command.","invalid_command");
  graph.project.revision=revision+1; const parsed=parseProjectGraph(graph); if("issues" in parsed)throw new ProjectGraphCommandError("Command produced an invalid graph.","invalid_graph");
  return {graph,receipt:{schema:"lorebible.project-graph-change/v1",commandId:envelope.commandId,projectId:graph.project.id,fromRevision:revision,toRevision:revision+1,changedIds,automaticChanges,proposedSemanticEdits,unaffectedSummary:["Stable IDs and unrelated records were preserved."],appliedAt:envelope.issuedAt}};
}

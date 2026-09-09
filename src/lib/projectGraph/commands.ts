import type { CanonStatus, ProjectGraphV1, TemporalClass, Visibility } from "../../contracts/projectGraph";
import { canonicalizeJson } from "./canonicalJson";
import { parseProjectGraph } from "./validation";

export type ProjectGraphCommand = { type:"entity.rename"; entityId:string; name:string } | { type:"canon.update"; factId:string; value:unknown; status?:CanonStatus; visibility?:Visibility; temporalClass?:TemporalClass };
export interface ProjectGraphCommandEnvelope { commandId:string; expectedRevision:number; issuedAt:string; command:ProjectGraphCommand }
export interface ChangeImpact { targetId:string; path:string; classification:"automatic_structural_edit"|"proposed_semantic_edit"; reason:string }
export interface ProjectGraphChangeResult { graph:ProjectGraphV1; receipt:{schema:"lorebible.project-graph-change/v1";commandId:string;projectId:string;fromRevision:number;toRevision:number;changedIds:string[];automaticChanges:ChangeImpact[];proposedSemanticEdits:ChangeImpact[];unaffectedSummary:string[];appliedAt:string} }
export type CommandErrorCode="invalid_command"|"revision_conflict"|"missing_target"|"no_change"|"invalid_graph"|"credential_rejected";
export class ProjectGraphCommandError extends Error { constructor(message:string,public code:CommandErrorCode,public expectedRevision?:number,public actualRevision?:number){super(message);this.name="ProjectGraphCommandError";} }

function rejectCredentials(value:unknown,path="value"):void { if(!value||typeof value!=="object")return; for(const [k,v] of Object.entries(value)){if(/^(api[_-]?key|credential|access[_-]?token|secret[_-]?key)$/i.test(k))throw new ProjectGraphCommandError(`Credential-shaped field rejected at ${path}.${k}.`,"credential_rejected");rejectCredentials(v,`${path}.${k}`);} }
function proseImpacts(value:unknown,needle:string,path="",out:ChangeImpact[]=[]):ChangeImpact[]{ if(typeof value==="string"&&value.includes(needle))out.push({targetId:"project",path,classification:"proposed_semantic_edit",reason:`Text may reference the former entity name '${needle}'.`}); else if(value&&typeof value==="object")for(const [k,v] of Object.entries(value))proseImpacts(v,needle,path?`${path}.${k}`:k,out); return out; }

export function applyProjectGraphCommand(input:ProjectGraphV1,envelope:ProjectGraphCommandEnvelope):ProjectGraphChangeResult{
  if(!envelope.commandId?.trim()||!Number.isSafeInteger(envelope.expectedRevision)||envelope.expectedRevision<1)throw new ProjectGraphCommandError("Invalid command envelope.","invalid_command");
  const revision=input.project.revision;
  if(!Number.isSafeInteger(revision)||revision!<1)throw new ProjectGraphCommandError("Graph revision is invalid.","invalid_graph");
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
  } else throw new ProjectGraphCommandError("Unsupported command.","invalid_command");
  graph.project.revision=revision+1; const parsed=parseProjectGraph(graph); if("issues" in parsed)throw new ProjectGraphCommandError("Command produced an invalid graph.","invalid_graph");
  return {graph,receipt:{schema:"lorebible.project-graph-change/v1",commandId:envelope.commandId,projectId:graph.project.id,fromRevision:revision,toRevision:revision+1,changedIds,automaticChanges,proposedSemanticEdits,unaffectedSummary:["Stable IDs and unrelated records were preserved."],appliedAt:envelope.issuedAt}};
}

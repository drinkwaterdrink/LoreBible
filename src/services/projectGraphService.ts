import type { ProjectGraphV1 } from "../contracts/projectGraph";
import type { SavedLoreBibleProjectV2 } from "../lib/projectPersistence";
import type { ProjectGraphArtifactPreview } from "../lib/projectGraph/artifactCompiler";
import type { ProjectGraphChangeResult } from "../lib/projectGraph/commands";
export interface PreparedProjectGraphSummary{id:string;name:string|null;revision:number;status:string;legacyDocumentId:string|null}
export class ProjectGraphApiError extends Error{constructor(message:string,public code:string,public status:number,public actualRevision?:number){super(message);this.name="ProjectGraphApiError";}}
function redact(value:unknown,path="response"):void{if(!value||typeof value!=="object")return;for(const[k,v]of Object.entries(value)){if(/^(api[_-]?key|credential|access[_-]?token|secret[_-]?key)$/i.test(k))throw new Error(`Project Graph API returned credential-shaped data at ${path}.${k}.`);redact(v,`${path}.${k}`);}}
async function json<T>(response:Response):Promise<T>{const body=await response.json().catch(()=>({}));redact(body);if(!response.ok){const e=(body as any).error||{};throw new ProjectGraphApiError(e.message||`Project request failed (${response.status}).`,e.code||"request_failed",response.status,e.actualRevision);}return body as T;}
export async function listPreparedProjectGraphs(){return(await json<{projects:PreparedProjectGraphSummary[]}>(await fetch("/api/projects/graph"))).projects;}
export async function prepareProjectGraph(project:SavedLoreBibleProjectV2){return json<{status:string;graph:ProjectGraphV1}>(await fetch("/api/projects/graph/migrate-v2",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(project)}));}
export async function loadProjectGraph(id:string){return(await json<{graph:ProjectGraphV1}>(await fetch(`/api/projects/graph/${encodeURIComponent(id)}`))).graph;}
export async function renameGraphEntity(id:string,revision:number,entityId:string,name:string){return json<ProjectGraphChangeResult>(await fetch(`/api/projects/graph/${encodeURIComponent(id)}/commands`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({commandId:crypto.randomUUID(),expectedRevision:revision,issuedAt:new Date().toISOString(),command:{type:"entity.rename",entityId,name}})}));}
export async function compileGraphPreview(id:string){return json<ProjectGraphArtifactPreview>(await fetch(`/api/projects/graph/${encodeURIComponent(id)}/compile-preview`));}

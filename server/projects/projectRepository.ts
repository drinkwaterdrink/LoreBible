import { copyFile, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { ProjectGraphV1 } from "../../src/contracts/projectGraph.js";
import { canonicalizeJson, sha256Hex } from "../../src/lib/projectGraph/canonicalJson.js";
import { applyProjectGraphCommand, ProjectGraphCommandError, type ProjectGraphChangeResult, type ProjectGraphCommandEnvelope } from "../../src/lib/projectGraph/commands.js";
import { parseProjectGraph } from "../../src/lib/projectGraph/validation.js";

export type RepositoryErrorCode="invalid"|"missing"|"exists"|"corrupt_primary"|"io"|"credential_rejected"|"recovery_conflict"|"invalid_backup";
export class ProjectRepositoryError extends Error{constructor(message:string,public code:RepositoryErrorCode,public recoveryAvailable=false){super(message);this.name="ProjectRepositoryError";}}
export interface ProjectRecoveryStatus{primaryChecksum:string|null;backupChecksum:string|null;backupValid:boolean;backupExists:boolean}
export interface ProjectRepositorySummary{id:string;name:string|null;revision:number;status:string}
export interface ProjectRepository{list():Promise<ProjectRepositorySummary[]>;load(id:string):Promise<ProjectGraphV1|null>;create(graph:ProjectGraphV1):Promise<ProjectGraphV1>;apply(id:string,envelope:ProjectGraphCommandEnvelope):Promise<ProjectGraphChangeResult>;inspectRecovery(id:string):Promise<ProjectRecoveryStatus>;restoreBackup(id:string,expectedPrimaryChecksum:string|null):Promise<ProjectGraphV1>}

export function resolveDefaultProjectRepositoryPath():string{const base=process.platform==="win32"?(process.env.LOCALAPPDATA||join(homedir(),"AppData","Local")):(process.env.XDG_CONFIG_HOME||join(homedir(),".config"));return join(base,"LoreBible","projects");}
const missing=(e:unknown)=>(e as NodeJS.ErrnoException)?.code==="ENOENT";
function validId(id:string){return typeof id==="string"&&id.length>0&&id.length<=300&&!/\p{Cc}/u.test(id)}
function credentials(value:unknown,path="graph"):string|null{if(!value||typeof value!=="object")return null;for(const[k,v]of Object.entries(value)){if(/^(api[_-]?key|credential|access[_-]?token|secret[_-]?key)$/i.test(k))return`${path}.${k}`;const found=credentials(v,`${path}.${k}`);if(found)return found;}return null;}

export function createProjectRepository(root:string):ProjectRepository{
  const queues=new Map<string,Promise<unknown>>();
  const paths=(id:string)=>{if(!validId(id))throw new ProjectRepositoryError("Invalid project ID.","invalid");const dir=join(root,Buffer.from(id).toString("base64url"));return{dir,primary:join(dir,"project.json"),backup:join(dir,"project.json.bak"),temp:join(dir,"project.json.tmp"),rejected:join(dir,"project.json.rejected")};};
  async function parsedFile(path:string,code:RepositoryErrorCode):Promise<ProjectGraphV1|null>{let raw:string;try{raw=await readFile(path,"utf8");}catch(e){if(missing(e))return null;throw new ProjectRepositoryError("Project file could not be read.","io");}try{const value=JSON.parse(raw);const parsed=parseProjectGraph(value);if("issues"in parsed)throw new Error("invalid graph");return parsed.value;}catch{throw new ProjectRepositoryError(code==="corrupt_primary"?"Project file is corrupt.":"Recovery backup is invalid.",code);}}
  function validate(graph:ProjectGraphV1){const secret=credentials(graph);if(secret)throw new ProjectRepositoryError(`Credential-shaped field rejected at ${secret}.`,"credential_rejected");const parsed=parseProjectGraph(graph);if("issues"in parsed)throw new ProjectRepositoryError("Project Graph validation failed.","invalid");if(!Number.isSafeInteger(parsed.value.project.revision)||parsed.value.project.revision!<1)throw new ProjectRepositoryError("Project revision is invalid.","invalid");return parsed.value;}
  async function checksum(path:string){try{return sha256Hex(await readFile(path,"utf8"));}catch(e){if(missing(e))return null;throw e;}}
  async function atomicWrite(graph:ProjectGraphV1,makeBackup=true){const p=paths(graph.project.id);const value=canonicalizeJson(validate(graph));await mkdir(p.dir,{recursive:true});await rm(p.temp,{force:true});await writeFile(p.temp,value,{encoding:"utf8",mode:0o600});const verify=await readFile(p.temp,"utf8");if(sha256Hex(verify)!==sha256Hex(value)||"issues"in parseProjectGraph(JSON.parse(verify)))throw new ProjectRepositoryError("Staged project verification failed.","io");if(makeBackup)try{await copyFile(p.primary,p.backup);}catch(e){if(!missing(e))throw e;}await rename(p.temp,p.primary);return(await parsedFile(p.primary,"corrupt_primary"))!;}
  function queued<T>(id:string,work:()=>Promise<T>):Promise<T>{const prior=queues.get(id)||Promise.resolve();const next=prior.catch(()=>undefined).then(work);queues.set(id,next);return next.finally(()=>{if(queues.get(id)===next)queues.delete(id);});}
  const repo:ProjectRepository={
    async list(){try{const dirs=await readdir(root,{withFileTypes:true});const out:ProjectRepositorySummary[]=[];for(const d of dirs)if(d.isDirectory())try{const g=await parsedFile(join(root,d.name,"project.json"),"corrupt_primary");if(g)out.push({id:g.project.id,name:g.project.name,revision:g.project.revision!,status:g.project.status});}catch{}return out;}catch(e){if(missing(e))return[];throw new ProjectRepositoryError("Repository could not be listed.","io");}},
    async load(id){return parsedFile(paths(id).primary,"corrupt_primary");},
    async create(graph){const valid=validate(graph);return queued(valid.project.id,async()=>{const p=paths(valid.project.id);if(await parsedFile(p.primary,"corrupt_primary"))throw new ProjectRepositoryError("Project already exists.","exists");return atomicWrite(valid,false);});},
    async apply(id,envelope){return queued(id,async()=>{const current=await repo.load(id);if(!current)throw new ProjectRepositoryError("Project was not found.","missing");let result;try{result=applyProjectGraphCommand(current,envelope);}catch(e){if(e instanceof ProjectGraphCommandError)throw e;throw e;}await atomicWrite(result.graph,true);return result;});},
    async inspectRecovery(id){const p=paths(id);const primaryChecksum=await checksum(p.primary);const backupChecksum=await checksum(p.backup);let backupValid=false;if(backupChecksum)try{backupValid=Boolean(await parsedFile(p.backup,"invalid_backup"));}catch{}return{primaryChecksum,backupChecksum,backupValid,backupExists:backupChecksum!==null};},
    async restoreBackup(id,expected){return queued(id,async()=>{const p=paths(id);const actual=await checksum(p.primary);if(actual!==expected)throw new ProjectRepositoryError("Primary changed since recovery was inspected.","recovery_conflict");const backup=await parsedFile(p.backup,"invalid_backup");if(!backup)throw new ProjectRepositoryError("Recovery backup was not found.","invalid_backup");try{await copyFile(p.primary,p.rejected);}catch(e){if(!missing(e))throw e;}return atomicWrite(backup,false);});},
  };return repo;
}

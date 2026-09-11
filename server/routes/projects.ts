import type { Express, Request, Response } from "express";
import { ProjectGraphCommandError } from "../../src/lib/projectGraph/commands.js";
import { ProjectRepositoryError, type ProjectRepository } from "../projects/projectRepository.js";
import { migrateSavedProjectV2ToGraph } from "../../src/lib/projectGraph/migrateSavedProjectV2.js";
import { compileProjectGraphArtifacts } from "../../src/lib/projectGraph/artifactCompiler.js";
import { parseBlueprintPreviewRequest, type BlueprintParseIssue } from "../../src/contracts/blueprint.js";
import { createBlueprintPlan } from "../../src/lib/blueprint/planner.js";

function blueprintRequestError(issues:BlueprintParseIssue[]){
  const credentialRejected=issues.some(issue=>issue.message.includes("Credential-shaped"));
  return {status:credentialRejected?422:400,error:{code:credentialRejected?"credential_rejected":"invalid_blueprint_request",message:credentialRejected?"Credential-shaped fields are not allowed.":"Blueprint preview request is invalid."}};
}
function blueprintRevisionError(expectedRevision:number,actualRevision:number){return {code:"revision_conflict",message:"Project revision changed since this preview request.",expectedRevision,actualRevision};}

function failure(res:Response,error:unknown){
  if(error instanceof ProjectGraphCommandError){const status=error.code==="missing_target"?404:error.code==="credential_rejected"?422:error.code==="revision_conflict"||error.code==="no_change"?409:400;return res.status(status).json({error:{code:error.code,message:error.message,expectedRevision:error.expectedRevision,actualRevision:error.actualRevision}});}
  if(error instanceof ProjectRepositoryError){const status=error.code==="missing"?404:error.code==="exists"||error.code==="recovery_conflict"?409:error.code==="credential_rejected"?422:error.code==="corrupt_primary"?503:error.code==="io"?500:400;return res.status(status).json({error:{code:error.code,message:error.message,recoveryAvailable:error.recoveryAvailable}});}
  return res.status(500).json({error:{code:"internal",message:"Project operation failed."}});
}
export function registerProjectRoutes(app:Express,{repository}:{repository:ProjectRepository}){
  app.get("/api/projects/graph",async(_req,res)=>{try{res.json({projects:await repository.list()});}catch(e){failure(res,e);}});
  app.post("/api/projects/graph",async(req,res)=>{try{res.status(201).json({graph:await repository.create(req.body)});}catch(e){failure(res,e);}});
  app.post("/api/projects/graph/migrate-v2",async(req,res)=>{try{const migrated=migrateSavedProjectV2ToGraph(req.body,{migratedAt:new Date().toISOString()});const existing=await repository.load(migrated.graph.project.id);if(existing){const prior=(existing.extensions.migrationReceipt as any)?.sourceSha256;if(existing.project.revision===1&&prior===migrated.receipt.sourceSha256)return res.status(200).json({status:"already_prepared",graph:existing,receipt:migrated.receipt});return res.status(409).json({error:{code:"graph_exists_modified",message:"A prepared graph already exists and has different source or edits."}});}const graph=await repository.create(migrated.graph);res.status(201).json({status:"prepared",graph,receipt:migrated.receipt});}catch(e){failure(res,e);}});
  app.get("/api/projects/graph/:projectId/compile-preview",async(req,res)=>{try{const graph=await repository.load(req.params.projectId);if(!graph)return res.status(404).json({error:{code:"missing",message:"Project was not found."}});res.json(compileProjectGraphArtifacts(graph));}catch(e){failure(res,e);}});
  app.post("/api/projects/graph/:projectId/blueprint-preview",async(req,res)=>{try{const parsed=parseBlueprintPreviewRequest(req.body);if("issues" in parsed){const rejected=blueprintRequestError(parsed.issues);return res.status(rejected.status).json({error:rejected.error});}const graph=await repository.load(req.params.projectId);if(!graph)return res.status(404).json({error:{code:"missing",message:"Project was not found."}});if(graph.project.revision!==parsed.value.expectedRevision)return res.status(409).json({error:blueprintRevisionError(parsed.value.expectedRevision,graph.project.revision!)});const context={...parsed.value.context,projectId:graph.project.id,projectRevision:graph.project.revision!};return res.json({plan:createBlueprintPlan({graph,context},{createdAt:new Date().toISOString()})});}catch(e){return failure(res,e);}});
  app.get("/api/projects/graph/:projectId",async(req,res)=>{try{const graph=await repository.load(req.params.projectId);if(!graph)return res.status(404).json({error:{code:"missing",message:"Project was not found."}});res.json({graph});}catch(e){failure(res,e);}});
  app.post("/api/projects/graph/:projectId/commands",async(req,res)=>{try{res.json(await repository.apply(req.params.projectId,req.body));}catch(e){failure(res,e);}});
  app.get("/api/projects/graph/:projectId/recovery",async(req,res)=>{try{res.json({recovery:await repository.inspectRecovery(req.params.projectId)});}catch(e){failure(res,e);}});
  app.post("/api/projects/graph/:projectId/recovery/restore",async(req,res)=>{try{res.json({graph:await repository.restoreBackup(req.params.projectId,req.body?.expectedPrimaryChecksum??null)});}catch(e){failure(res,e);}});
}

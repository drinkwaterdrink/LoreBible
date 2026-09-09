import type { Express, Request, Response } from "express";
import { ProjectGraphCommandError } from "../../src/lib/projectGraph/commands.js";
import { ProjectRepositoryError, type ProjectRepository } from "../projects/projectRepository.js";

function failure(res:Response,error:unknown){
  if(error instanceof ProjectGraphCommandError){const status=error.code==="missing_target"?404:error.code==="credential_rejected"?422:error.code==="revision_conflict"||error.code==="no_change"?409:400;return res.status(status).json({error:{code:error.code,message:error.message,expectedRevision:error.expectedRevision,actualRevision:error.actualRevision}});}
  if(error instanceof ProjectRepositoryError){const status=error.code==="missing"?404:error.code==="exists"||error.code==="recovery_conflict"?409:error.code==="credential_rejected"?422:error.code==="corrupt_primary"?503:error.code==="io"?500:400;return res.status(status).json({error:{code:error.code,message:error.message,recoveryAvailable:error.recoveryAvailable}});}
  return res.status(500).json({error:{code:"internal",message:"Project operation failed."}});
}
export function registerProjectRoutes(app:Express,{repository}:{repository:ProjectRepository}){
  app.get("/api/projects/graph",async(_req,res)=>{try{res.json({projects:await repository.list()});}catch(e){failure(res,e);}});
  app.post("/api/projects/graph",async(req,res)=>{try{res.status(201).json({graph:await repository.create(req.body)});}catch(e){failure(res,e);}});
  app.get("/api/projects/graph/:projectId",async(req,res)=>{try{const graph=await repository.load(req.params.projectId);if(!graph)return res.status(404).json({error:{code:"missing",message:"Project was not found."}});res.json({graph});}catch(e){failure(res,e);}});
  app.post("/api/projects/graph/:projectId/commands",async(req,res)=>{try{res.json(await repository.apply(req.params.projectId,req.body));}catch(e){failure(res,e);}});
  app.get("/api/projects/graph/:projectId/recovery",async(req,res)=>{try{res.json({recovery:await repository.inspectRecovery(req.params.projectId)});}catch(e){failure(res,e);}});
  app.post("/api/projects/graph/:projectId/recovery/restore",async(req,res)=>{try{res.json({graph:await repository.restoreBackup(req.params.projectId,req.body?.expectedPrimaryChecksum??null)});}catch(e){failure(res,e);}});
}

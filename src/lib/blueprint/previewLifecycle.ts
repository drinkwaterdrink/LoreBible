import type { BlueprintPlanV1 } from "../../contracts/blueprint";
import type { ProjectGraphV1 } from "../../contracts/projectGraph";
import type { SavedLoreBibleProjectV2 } from "../projectPersistence";
import type { PreparedProjectGraphSummary } from "../../services/projectGraphService";
import { ProjectGraphApiError } from "../../services/projectGraphService";

export function findBlueprintSourceProject(graphId:string,summaries:Pick<PreparedProjectGraphSummary,"id"|"legacyDocumentId">[],projects:SavedLoreBibleProjectV2[]):SavedLoreBibleProjectV2|undefined{const documentId=summaries.find(item=>item.id===graphId)?.legacyDocumentId;return documentId?projects.find(item=>item.document.id===documentId):undefined;}
export function shouldClearBlueprintPlan(plan:BlueprintPlanV1|null,graph:ProjectGraphV1):boolean{if(!plan)return false;return plan.source.projectId!==graph.project.id||plan.source.projectRevision!==(graph.project.revision??1);}
export function getBlueprintFailure(error:unknown,hasPriorPlan:boolean):{message:string;reloadRequired:boolean}{const base=error instanceof Error?error.message:"Blueprint preview failed.";return{message:`${base}${hasPriorPlan?" The previous proposal is still available.":""}`,reloadRequired:error instanceof ProjectGraphApiError&&error.code==="revision_conflict"};}
export function abortBlueprintRequest(controller:AbortController|null):void{controller?.abort();}

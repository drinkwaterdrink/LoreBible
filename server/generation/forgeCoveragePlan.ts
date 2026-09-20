import type { BlueprintSelectionV1 } from "../../src/contracts/blueprintSelection.js";
import type { EstimateRange } from "../../src/contracts/blueprint.js";

export type ForgeLoreDestination = "rules"|"locations"|"factions"|"npcs"|"relationshipWeb"|"knowledgeMap"|"items"|"secrets"|"history"|"pressures"|"additionalLore";
export interface ForgeCoverageCategory { id:string; label:string; destination:ForgeLoreDestination; range:EstimateRange; detail:BlueprintSelectionV1["categories"][number]["detail"]; required:boolean; forbidden:boolean }
export interface ForgeCoveragePlan { total:EstimateRange; categories:ForgeCoverageCategory[] }

const DESTINATIONS:Record<string,ForgeLoreDestination>={
  principal_cast:"npcs",roster_cast:"npcs",locations:"locations",relationships:"relationshipWeb",
  factions:"factions",items:"items",secrets:"secrets",history:"history",
};

export function createForgeCoveragePlan(selection:BlueprintSelectionV1):ForgeCoveragePlan{
  const categories=selection.categories.map(category=>({id:category.id,label:category.label,destination:DESTINATIONS[category.id]??"additionalLore",range:{...(category.id==="principal_cast"?selection.principalCastRange:category.id==="roster_cast"?selection.rosterCastRange:category.targetRange)},detail:category.detail,required:category.status==="required",forbidden:category.status==="omitted"||category.targetRange.max===0}));
  const plannedMinimum=categories.filter(category=>!category.forbidden).reduce((sum,category)=>sum+category.range.min,0);const remainder=Math.max(0,selection.lorebookRange.min-plannedMinimum);
  if(remainder)categories.push({id:"lore",label:"Cross-category Lore",destination:"additionalLore",range:{min:remainder,ideal:Math.max(remainder,selection.lorebookRange.ideal-plannedMinimum),max:Math.max(remainder,selection.lorebookRange.max-plannedMinimum)},detail:"rich",required:true,forbidden:false});
  return {total:{...selection.lorebookRange},categories};
}

export function formatForgeBundleCoverage(plan:ForgeCoveragePlan,destinations:readonly string[]):string{
  const relevant=plan.categories.filter(category=>destinations.includes(category.destination));
  if(!relevant.length)return "";
  return `\nBLUEPRINT COVERAGE FOR THIS BUNDLE (minimum–ideal; do not pad beyond useful coverage):\n${relevant.map(category=>category.forbidden?`- ${category.label}: OMITTED; generate zero entries.`:`- ${category.label}: generate ${category.range.min}–${category.range.ideal} focused entries${category.required?"; REQUIRED":""}. Store in ${category.destination}.`).join("\n")}\nEvery entry needs a concise proper semantic name. Never use labels such as History 1, Secret 2, Rule 3, or Entry 4.`;
}

function array(value:unknown):unknown[]{return Array.isArray(value)?value:[];}
function normalized(value:unknown):string{return typeof value==="string"?value.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""):"";}
export function countForgeCategory(category:ForgeCoverageCategory,document:Record<string,any>):number{
  if(category.id==="principal_cast")return array(document.npcs).filter((entry:any)=>entry?.fields?.castTier==="principal").length;
  if(category.id==="roster_cast")return array(document.npcs).filter((entry:any)=>entry?.fields?.castTier==="roster").length;
  if(category.destination==="additionalLore")return array(document.additionalLore).filter((entry:any)=>normalized(entry?.fields?.categoryId)===normalized(category.id)||normalized(entry?.fields?.categoryLabel)===normalized(category.label)).length;
  if(category.destination==="rules")return array(document.worldPhysics?.rules).length;
  return array(document[category.destination]).length;
}

const categoryCount=countForgeCategory;

export function countForgeTotalEntries(document:Record<string,any>):number{
  return [array(document.worldPhysics?.rules),array(document.locations),array(document.factions),array(document.npcs),array(document.relationshipWeb),array(document.knowledgeMap),array(document.items),array(document.secrets),array(document.history),array(document.pressures),array(document.additionalLore)].reduce((sum,entries)=>sum+entries.length,0);
}

export function auditForgeCoverage(plan:ForgeCoveragePlan,document:Record<string,any>):string[]{
  const findings=plan.categories.flatMap(category=>{const count=categoryCount(category,document);if(category.forbidden&&count>0)return[`${category.label} was omitted but produced ${count} ${count===1?"entry":"entries"}`];if(!category.forbidden&&count<category.range.min)return[`${category.label} produced ${count} of at least ${category.range.min} planned entries`];return !category.forbidden&&count>category.range.max?[`${category.label} produced ${count} above the maximum ${category.range.max} planned entries`]:[];});
  const total=countForgeTotalEntries(document);
  if(total<plan.total.min)findings.push(`Lorebook produced ${total} of at least ${plan.total.min} planned entries`);
  if(total>plan.total.max)findings.push(`Lorebook produced ${total} above the maximum ${plan.total.max} planned entries`);
  return findings;
}

export function auditForgeBundleCoverage(plan:ForgeCoveragePlan,document:Record<string,any>,bundleKeys:readonly string[]):string[]{
  const scoped={...plan,categories:plan.categories.filter(category=>bundleKeys.includes(category.destination))};
  const findings=scoped.categories.flatMap(category=>{const count=categoryCount(category,document);if(category.forbidden&&count>0)return[`${category.label} was omitted but produced ${count} ${count===1?"entry":"entries"}`];if(!category.forbidden&&count<category.range.min)return[`${category.label} produced ${count} of at least ${category.range.min} planned entries`];return !category.forbidden&&count>category.range.max?[`${category.label} produced ${count} above the maximum ${category.range.max} planned entries`]:[];});
  return shouldAuditForgeCoverage(bundleKeys)?[...findings,...auditForgeCoverage({...plan,categories:[]},document)]:findings;
}

export function shouldAuditForgeCoverage(bundleKeys:readonly string[]):boolean{return bundleKeys.includes("additionalLore");}

export class ForgeCoverageConflictError extends Error {
  constructor() {
    super("The saved Forge checkpoint conflicts with the selected Blueprint coverage. Completed bundles were preserved; choose compatible settings or explicitly start a new build.");
    this.name="ForgeCoverageConflictError";
  }
}

export function assertForgeCheckpointCoverage(plan:ForgeCoveragePlan,document:Record<string,any>):void{
  if(!Object.hasOwn(document,"additionalLore"))return;
  if(auditForgeCoverage(plan,document).length)throw new ForgeCoverageConflictError();
}

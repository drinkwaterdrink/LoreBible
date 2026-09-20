import type { ForgeBundleDefinition } from "../forgeSchemas";
import type { ForgeCoveragePlan } from "../forgeCoveragePlan";
import { renderSchemaContract } from "../schemaContract";
import { FORGE_BUNDLE_MISSIONS, FORGE_CORRECTION, FORGE_CRAFT, FORGE_PROTOCOL, FORGE_SHARED_CONSTITUTION } from "./forgeDefaults";

export interface CompiledForgePrompt {
  systemInstruction: string;
  userPrompt: string;
  promptVersion: string;
  missions: readonly string[];
  context: string;
  coverageBrief: string;
}

export function formatForgeCoverageData(plan: ForgeCoveragePlan | null, destinations: readonly string[]): string {
  if (!plan) return "No coverage plan was supplied; generate only the schema-owned sections required by the assignment.";
  const relevant=plan.categories.filter(category=>destinations.includes(category.destination));
  const rows=relevant.map(category=>({id:category.id,label:category.label,destination:category.destination,status:category.forbidden?"omitted with zero entries owned by this bundle":"assigned",min:category.range.min,target:category.range.ideal,max:category.range.max,detail:category.detail,required:category.required}));
  const omitted=plan.categories.filter(category=>!destinations.includes(category.destination)).map(category=>({id:category.id,destination:category.destination,ownedBy:"another bundle",entryCount:0}));
  return `COVERAGE_DATA\n${JSON.stringify({total:plan.total,categories:[...rows,...omitted]},null,2)}`;
}

export function compileForgePrompt(input: {
  definition: ForgeBundleDefinition;
  context: string;
  coverageBrief?: string;
  coveragePlan?: ForgeCoveragePlan | null;
  correction?: string | null;
}): CompiledForgePrompt {
  const definition=input.definition;
  const coveragePlan=input.coveragePlan ?? null;
  const missions=definition.index===5
    ? [FORGE_BUNDLE_MISSIONS[0],FORGE_BUNDLE_MISSIONS[1]]
    : [FORGE_BUNDLE_MISSIONS[definition.index] ?? definition.name];
  const mission=missions.join("\n\n");
  const coverageBrief=input.coverageBrief ?? formatForgeCoverageData(coveragePlan,definition.keys);
  const schema=renderSchemaContract(definition.schema);
  const assignment=`ASSIGNMENT: ${definition.name}\nPrompt version: forge-prompts/1\n${mission}\n\n${coverageBrief}\n\nSOURCE_CONTEXT\n${input.context}\n\nOUTPUT_SCHEMA\n${schema}`;
  const userPrompt=input.correction ? `${assignment}\n\n${FORGE_CORRECTION}\n${input.correction}` : assignment;
  return {systemInstruction:`${FORGE_PROTOCOL}\n\n${FORGE_SHARED_CONSTITUTION}\n\n${FORGE_CRAFT}`,userPrompt,promptVersion:"forge-prompts/1",missions,context:input.context,coverageBrief};
}

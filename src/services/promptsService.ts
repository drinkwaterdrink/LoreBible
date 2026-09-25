import type { PromptProfileDraftV1, PromptProfileV1 } from "../contracts/prompts";
import type { PromptOverrideV1 } from "../contracts/prompts";
import type { BlueprintSelectionV1 } from "../contracts/blueprintSelection";
import type { PromptRegistryEntry } from "../lib/prompts/registry";

export interface PromptCatalog { registryVersion: string; features: PromptRegistryEntry[]; profiles: PromptProfileV1[]; }
export interface PromptCompilePreview {
  featureId: string; jobId: string; schemaId: string; snapshotHash: string; promptHash: string;
  systemInstruction: string; userPrompt: string;
  disclosure: { includesPrivateProjectContext: true; generationPerformed: false; manuscriptMutated: false };
}
async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(body.message || `Prompt request failed with HTTP ${response.status}.`);
  return body as T;
}
export async function listPromptCatalog(): Promise<PromptCatalog> { return json(await fetch("/api/prompts")); }
export async function createPromptProfile(input: PromptProfileDraftV1): Promise<PromptProfileV1> {
  return (await json<{ profile: PromptProfileV1 }>(await fetch("/api/prompts/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }))).profile;
}
export async function updatePromptProfile(id: string, input: PromptProfileDraftV1, expectedRevision: number): Promise<PromptProfileV1> {
  return (await json<{ profile: PromptProfileV1 }>(await fetch(`/api/prompts/profiles/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, expectedRevision }) }))).profile;
}
export async function deletePromptProfile(id: string, expectedRevision: number): Promise<void> {
  const response = await fetch(`/api/prompts/profiles/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision }) });
  if (!response.ok) await json(response);
}
export async function compilePromptPreview(input: { featureId: string; profileId: string | null; projectOverrides: PromptOverrideV1[]; selection: BlueprintSelectionV1; sourceContext: string }): Promise<PromptCompilePreview> {
  return (await json<{ preview: PromptCompilePreview }>(await fetch("/api/prompts/compile-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }))).preview;
}

import type { ProviderId } from "../contracts/generation";

export interface CuratedModel {
  id: string;
  label: string;
  reasoning: "required" | "optional" | "none";
  providers: readonly ProviderId[];
}
const COMPATIBLE_PROVIDERS = ["openrouter", "nanogpt"] as const;
export const CURATED_MODELS: readonly CuratedModel[] = [
  { id: "deepseek/deepseek-v4-pro-0813:thinking", label: "DeepSeek V4 Pro 0813 · Thinking", reasoning: "required", providers: COMPATIBLE_PROVIDERS },
  { id: "z-ai/glm-5.3:thinking", label: "GLM 5.3 · Thinking", reasoning: "required", providers: COMPATIBLE_PROVIDERS },
  { id: "z-ai/glm-5.3", label: "GLM 5.3", reasoning: "optional", providers: COMPATIBLE_PROVIDERS },
  { id: "deepseek/deepseek-v4-pro-0813", label: "DeepSeek V4 Pro 0813", reasoning: "optional", providers: COMPATIBLE_PROVIDERS },
  { id: "z-ai/glm-5.3-flash", label: "GLM 5.3 Flash", reasoning: "optional", providers: COMPATIBLE_PROVIDERS },
  { id: "moonshotai/kimi-k2.7-code", label: "Kimi K2.7 Code", reasoning: "optional", providers: COMPATIBLE_PROVIDERS },
  { id: "qwen/qwen3.8-27b-uncensored:thinking", label: "Qwen 3.8 27B Uncensored · Thinking", reasoning: "required", providers: COMPATIBLE_PROVIDERS },
  { id: "moonshotai/kimi-k2.6:thinking", label: "Kimi K2.6 · Thinking", reasoning: "required", providers: COMPATIBLE_PROVIDERS },
  { id: "meta/muse-spark-1.3-contributor", label: "Muse Spark 1.3 Contributor", reasoning: "optional", providers: COMPATIBLE_PROVIDERS },
] as const;
export const GEMINI_CURATED_MODELS: readonly CuratedModel[] = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", reasoning: "required", providers: ["gemini"] },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", reasoning: "required", providers: ["gemini"] },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", reasoning: "required", providers: ["gemini"] },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", reasoning: "required", providers: ["gemini"] },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", reasoning: "required", providers: ["gemini"] },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", reasoning: "optional", providers: ["gemini"] },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", reasoning: "optional", providers: ["gemini"] },
] as const;
export function getCatalogForProvider(provider: ProviderId): readonly CuratedModel[] {
  if (provider === "gemini") return GEMINI_CURATED_MODELS;
  return CURATED_MODELS.filter((model) => model.providers.includes(provider));
}
export function findCuratedModel(provider: ProviderId, modelId: string): CuratedModel | undefined {
  return getCatalogForProvider(provider).find((model) => model.id === modelId);
}

import type { ProviderId } from "../../src/contracts/generation";

type FetchImplementation = (input: string, init?: RequestInit) => Promise<Response>;

export class ModelDiscoveryTimeoutError extends Error {
  constructor() {
    super("Model discovery timed out.");
    this.name = "ModelDiscoveryTimeoutError";
  }
}

const SAFE_MODEL_ID = /^.{1,200}$/u;

function normalizedId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().replace(/^models\//, "");
  return SAFE_MODEL_ID.test(id) && !/\p{Cc}/u.test(id) ? id : null;
}

function isTextCapable(provider: ProviderId, model: Record<string, unknown>): boolean {
  if (provider === "gemini" && Array.isArray(model.supportedGenerationMethods)) {
    return model.supportedGenerationMethods.includes("generateContent");
  }
  const architecture = model.architecture && typeof model.architecture === "object"
    ? model.architecture as Record<string, unknown>
    : null;
  const modalities = architecture?.output_modalities ?? model.output_modalities;
  if (Array.isArray(modalities)) return modalities.includes("text");
  if (provider === "gemini") {
    const id = normalizedId(model.id ?? model.name)?.toLowerCase() || "";
    if (/(?:embedding|image|veo|lyria|tts|transcribe|native-audio|live|robotics|computer-use|deep-research|aqa)/.test(id)) return false;
  }
  return true;
}

export interface ProviderModelCatalogItem { id: string; label: string; created?: number; }

export function normalizeProviderModelCatalog(provider: ProviderId, payload: unknown): ProviderModelCatalogItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as { data?: unknown; models?: unknown };
  const records = Array.isArray(root.data) ? root.data : Array.isArray(root.models) ? root.models : [];
  const seen = new Set<string>();
  const result: ProviderModelCatalogItem[] = [];
  for (const candidate of records) {
    if (!candidate || typeof candidate !== "object") continue;
    const model = candidate as Record<string, unknown>;
    if (!isTextCapable(provider, model)) continue;
    const id = normalizedId(model.id ?? model.name);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const display = typeof model.name === "string" && !model.name.startsWith("models/") ? model.name.trim() : id;
    const created = typeof model.created === "number" && Number.isSafeInteger(model.created) && model.created >= 0 ? model.created : undefined;
    result.push({ id, label: display || id, ...(created === undefined ? {} : { created }) });
  }
  return result;
}

export function normalizeProviderModels(provider: ProviderId, payload: unknown): string[] {
  return normalizeProviderModelCatalog(provider, payload).map((model) => model.id);
}

export async function fetchProviderModels(
  fetchImpl: FetchImplementation,
  url: string,
  headers: HeadersInit,
  timeoutMs = 8_000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { headers, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new ModelDiscoveryTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

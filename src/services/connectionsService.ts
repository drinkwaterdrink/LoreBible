import type { ModelSelection, ProviderId } from "../contracts/generation";
import type { RuntimeInfo } from "../lib/runtimeDiagnostics";

export interface ConnectionProfile {
  id: string;
  name: string;
  provider: ProviderId;
  baseUrl: string;
  keyHint: string | null;
  hasSecret: boolean;
  createdAt: string;
  updatedAt: string;
  lastTestedAt: string | null;
  lastTestStatus: "untested" | "available" | "unavailable" | "error";
  customModelIds: string[];
}

export interface AvailableModel {
  id: string;
  label: string;
  reasoning: "required" | "optional";
  available?: boolean;
  custom?: boolean;
  providerReported?: boolean;
  created?: number;
  popularRank?: number;
  subscriptionIncluded?: boolean;
}

async function readJson<T>(response: Response, options?: { missingRouteMessage?: string }): Promise<T> {
  const raw = await response.text().catch(() => "");
  let body: unknown = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = raw; }
  assertRedactedPayload(body);
  if (!response.ok) {
    const providerMessage = body && typeof body === "object" ? (body as { message?: string; error?: string }).message || (body as { error?: string }).error : "";
    const fallback = response.status === 404 && options?.missingRouteMessage && typeof body !== "object" ? options.missingRouteMessage : `Request failed with HTTP ${response.status}`;
    throw new Error(providerMessage || fallback);
  }
  return body as T;
}

function assertRedactedPayload(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { value.forEach(assertRedactedPayload); return; }
  for (const [key, nested] of Object.entries(value)) {
    if (key === "apiKey" || key === "secretCiphertext") throw new Error("The connection API returned secret material; refusing to expose it in the browser.");
    assertRedactedPayload(nested);
  }
}

export async function listConnections(): Promise<ConnectionProfile[]> {
  return (await readJson<{ profiles: ConnectionProfile[] }>(await fetch("/api/connections"))).profiles;
}

export async function saveConnection(input: { id?: string; name: string; provider: ProviderId; apiKey?: string; customModelIds?: string[] }): Promise<ConnectionProfile> {
  const method = input.id ? "PUT" : "POST";
  const url = input.id ? `/api/connections/${encodeURIComponent(input.id)}` : "/api/connections";
  const payload: { id?: string; name: string; provider: ProviderId; apiKey?: string; customModelIds?: string[] } = { ...input };
  if (!payload.apiKey?.trim()) delete payload.apiKey;
  const body = await readJson<{ profile: ConnectionProfile }>(await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
  return body.profile;
}

export async function deleteConnection(id: string): Promise<void> {
  await readJson<unknown>(await fetch(`/api/connections/${encodeURIComponent(id)}`, { method: "DELETE" }));
}

export async function testConnection(id: string): Promise<{ status: string; provider: ProviderId; modelCount: number }> {
  return readJson(await fetch(`/api/connections/${encodeURIComponent(id)}/test`, { method: "POST" }));
}

export async function listConnectionModels(id: string, signal?: AbortSignal): Promise<AvailableModel[]> {
  return (await readJson<{ models: AvailableModel[] }>(await fetch(`/api/connections/${encodeURIComponent(id)}/models`, { signal }))).models;
}

export async function testModelGeneration(id: string, modelId: string): Promise<{ status: "generated"; provider: ProviderId; modelId: string }> {
  return readJson(await fetch(`/api/connections/${encodeURIComponent(id)}/generation-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelId }),
  }), { missingRouteMessage: "The selected-model test is unavailable on this server. Restart LoreBible from the current shortcut and reload the page." });
}

export async function getRuntimeInfo(): Promise<RuntimeInfo> {
  return readJson<RuntimeInfo>(await fetch("/api/health"));
}

export interface CatalogRequestTracker {
  begin(): number;
  isCurrent(token: number): boolean;
  invalidate(): void;
}

export function createCatalogRequestTracker(): CatalogRequestTracker {
  let current = 0;
  return {
    begin: () => ++current,
    isCurrent: (token) => token === current,
    invalidate: () => { current += 1; },
  };
}

export function isCompleteModelSelection(selection: ModelSelection | null): selection is { profileId: string; modelId: string } {
  return Boolean(selection?.profileId && selection.modelId);
}

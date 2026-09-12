import type { Application, Request, Response as ExpressResponse } from "express";
import { isProviderId, type ProviderId } from "../../src/contracts/generation.js";
import { getCatalogForProvider } from "../../src/lib/modelCatalog.js";
import { ProfileStoreError, type ProfileStore } from "../secrets/profileStore.js";
import { fetchProviderModels, ModelDiscoveryTimeoutError, normalizeProviderModelCatalog } from "../model/modelDiscovery.js";
import { nanoGptSubscriptionModelsUrl, parseNanoGptPopularModelIds } from "../model/nanoGptCatalog.js";
import { createModelGateway, ModelGatewayError } from "../model/gateway.js";

interface ConnectionRouteDependencies {
  store: ProfileStore;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<globalThis.Response>;
  environmentGeminiKey?: string;
  discoveryTimeoutMs?: number;
}

function errorResponse(res: ExpressResponse, error: unknown): void {
  if (error instanceof ProfileStoreError) {
    const status = error.code === "missing" ? 404 : error.code === "invalid" ? 400 : 500;
    res.status(status).json({ code: error.code === "corrupt" ? "PROFILE_STORE_CORRUPT" : "INVALID_PROFILE", message: error.message });
    return;
  }
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Connection profile operation failed." });
}

function providerFromBody(value: unknown): ProviderId {
  if (!isProviderId(value)) throw new ProfileStoreError("provider must be gemini, openrouter, or nanogpt.", "invalid");
  return value;
}

function normalizeProviderModelId(id: string): string {
  return id.startsWith("models/") ? id.slice("models/".length) : id;
}

function environmentProfile(key: string | undefined) {
  if (!key) return null;
  return {
    id: "environment-gemini",
    name: "Environment Gemini",
    provider: "gemini" as const,
    baseUrl: "https://generativelanguage.googleapis.com",
    keyHint: "configured",
    hasSecret: true,
    createdAt: "",
    updatedAt: "",
    lastTestedAt: null,
    lastTestStatus: "untested" as const,
    customModelIds: [],
  };
}

export function registerConnectionRoutes(app: Application, dependencies: ConnectionRouteDependencies): void {
  const fetchImpl = dependencies.fetchImpl || fetch;
  const discoveryTimeoutMs = dependencies.discoveryTimeoutMs ?? 8_000;
  const getProfile = async (id: string) => id === "environment-gemini" ? environmentProfile(dependencies.environmentGeminiKey) : dependencies.store.getMetadata(id);
  const getSecret = async (id: string) => id === "environment-gemini" ? dependencies.environmentGeminiKey || null : dependencies.store.getSecret(id);
  const gateway = createModelGateway(dependencies.store, fetchImpl);

  app.get("/api/connections", async (_req: Request, res: ExpressResponse) => {
    try {
      const profiles = await dependencies.store.list();
      const environment = environmentProfile(dependencies.environmentGeminiKey);
      res.json({ profiles: environment ? [environment, ...profiles] : profiles });
    } catch (error) { errorResponse(res, error); }
  });

  app.post("/api/connections", async (req: Request, res: ExpressResponse) => {
    try {
      const profile = await dependencies.store.upsert({ name: String(req.body?.name || ""), provider: providerFromBody(req.body?.provider), apiKey: typeof req.body?.apiKey === "string" ? req.body.apiKey : undefined, customModelIds: req.body?.customModelIds === undefined ? undefined : req.body.customModelIds });
      res.status(201).json({ profile });
    } catch (error) { errorResponse(res, error); }
  });

  app.put("/api/connections/:id", async (req: Request, res: ExpressResponse) => {
    try {
      if (req.params.id === "environment-gemini") return res.status(409).json({ code: "READ_ONLY_PROFILE", message: "Environment Gemini is configured outside the application." });
      const profile = await dependencies.store.upsert({ id: req.params.id, name: String(req.body?.name || ""), provider: providerFromBody(req.body?.provider), apiKey: typeof req.body?.apiKey === "string" ? req.body.apiKey : undefined, customModelIds: req.body?.customModelIds === undefined ? undefined : req.body.customModelIds });
      res.json({ profile });
    } catch (error) { errorResponse(res, error); }
  });

  app.delete("/api/connections/:id", async (req: Request, res: ExpressResponse) => {
    try {
      if (req.params.id === "environment-gemini") return res.status(409).json({ code: "READ_ONLY_PROFILE", message: "Environment Gemini is configured outside the application." });
      await dependencies.store.delete(req.params.id);
      res.status(204).end();
    } catch (error) { errorResponse(res, error); }
  });

  app.post("/api/connections/:id/test", async (req: Request, res: ExpressResponse) => {
    const profile = await getProfile(req.params.id);
    if (!profile) return res.status(404).json({ code: "PROFILE_NOT_FOUND", message: "Connection profile was not found." });
    const key = await getSecret(req.params.id);
    if (!key) return res.status(400).json({ code: "CREDENTIAL_MISSING", message: "This connection profile has no API key." });
    if (req.params.id === "environment-gemini") return res.json({ status: "available", provider: profile.provider, modelCount: 0 });
    try {
      const response = await fetchProviderModels(fetchImpl, `${profile.baseUrl}/models${profile.provider === "nanogpt" ? "?detailed=true" : ""}`, { Authorization: `Bearer ${key}`, Accept: "application/json" }, discoveryTimeoutMs);
      if (response.status === 401 || response.status === 403) {
        if (req.params.id !== "environment-gemini") await dependencies.store.setTestStatus(req.params.id, "error");
        return res.status(401).json({ code: "AUTHENTICATION_FAILED", message: "The provider rejected this API key." });
      }
      if (!response.ok) {
        if (req.params.id !== "environment-gemini") await dependencies.store.setTestStatus(req.params.id, "unavailable");
        return res.status(503).json({ code: "PROVIDER_UNAVAILABLE", message: `Provider returned HTTP ${response.status}.` });
      }
      const payload: unknown = await response.json();
      const models = payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data.length : 0;
      if (req.params.id !== "environment-gemini") await dependencies.store.setTestStatus(req.params.id, "available");
      return res.json({ status: "available", provider: profile.provider, modelCount: models });
    } catch { return res.status(503).json({ code: "PROVIDER_UNAVAILABLE", message: "Unable to reach the provider." }); }
  });

  app.get("/api/connections/:id/models", async (req: Request, res: ExpressResponse) => {
    const profile = await getProfile(req.params.id);
    if (!profile) return res.status(404).json({ code: "PROFILE_NOT_FOUND", message: "Connection profile was not found." });
    const catalog = getCatalogForProvider(profile.provider);
    if (req.params.id === "environment-gemini") return res.json({ models: catalog });
    const key = await getSecret(req.params.id);
    if (!key) return res.status(400).json({ code: "CREDENTIAL_MISSING", message: "This connection profile has no API key." });
    try {
      const response = await fetchProviderModels(fetchImpl, `${profile.baseUrl}/models${profile.provider === "nanogpt" ? "?detailed=true" : ""}`, { Authorization: `Bearer ${key}`, Accept: "application/json" }, discoveryTimeoutMs);
      if (!response.ok) return res.status(503).json({ code: response.status === 401 || response.status === 403 ? "AUTHENTICATION_FAILED" : "PROVIDER_UNAVAILABLE", message: "Unable to retrieve provider models." });
      const payload: unknown = await response.json();
      const providerModels = normalizeProviderModelCatalog(profile.provider, payload);
      const available = new Set(providerModels.map((model) => model.id));
      let subscriptionIds = new Set<string>();
      let popularRanks = new Map<string, number>();
      if (profile.provider === "nanogpt") {
        const supplemental = await Promise.allSettled([
          fetchProviderModels(fetchImpl, nanoGptSubscriptionModelsUrl(profile.baseUrl), { Authorization: `Bearer ${key}`, Accept: "application/json" }, discoveryTimeoutMs),
          fetchProviderModels(fetchImpl, "https://cake.nano-gpt.com/models/text", { Accept: "text/html" }, discoveryTimeoutMs),
        ]);
        if (supplemental[0].status === "fulfilled" && supplemental[0].value.ok) {
          const subscriptionPayload: unknown = await supplemental[0].value.json().catch(() => null);
          subscriptionIds = new Set(normalizeProviderModelCatalog("nanogpt", subscriptionPayload).map((model) => model.id));
        }
        if (supplemental[1].status === "fulfilled" && supplemental[1].value.ok) {
          const html = await supplemental[1].value.text().catch(() => "");
          popularRanks = new Map(parseNanoGptPopularModelIds(html).map((id, index) => [id, index + 1]));
        }
      }
      const curatedIds = new Set(catalog.map((model) => model.id));
      const customIds = new Set(profile.customModelIds.map(normalizeProviderModelId));
      const custom = profile.customModelIds
        .filter((id) => !curatedIds.has(id))
        .map((id) => ({ id, label: id, reasoning: "optional" as const, available: true, custom: true }));
      const metadata = new Map(providerModels.map((model) => [model.id, model]));
      const decorate = <T extends { id: string }>(model: T) => ({ ...model, ...(metadata.get(model.id)?.created === undefined ? {} : { created: metadata.get(model.id)!.created }), ...(subscriptionIds.has(model.id) ? { subscriptionIncluded: true } : {}), ...(popularRanks.has(model.id) ? { popularRank: popularRanks.get(model.id) } : {}) });
      const providerReported = providerModels
        .filter((model) => !curatedIds.has(model.id) && !customIds.has(model.id))
        .map((model) => decorate({ ...model, reasoning: "optional" as const, available: true, providerReported: true }));
      res.json({ models: [...catalog.map((model) => decorate({ ...model, available: available.has(model.id) })), ...custom.map(decorate), ...providerReported] });
    } catch (error) {
      if (error instanceof ModelDiscoveryTimeoutError) {
        return res.status(504).json({ code: "MODEL_DISCOVERY_TIMEOUT", message: "Model discovery timed out. Retry, or add the exact model ID as a custom model." });
      }
      res.status(503).json({ code: "PROVIDER_UNAVAILABLE", message: "Unable to retrieve provider models." });
    }
  });

  app.post("/api/connections/:id/generation-test", async (req: Request, res: ExpressResponse) => {
    const modelId = typeof req.body?.modelId === "string" ? req.body.modelId.trim() : "";
    if (!modelId || modelId.length > 200 || /\p{Cc}/u.test(modelId)) return res.status(400).json({ code: "MODEL_UNAVAILABLE", message: "Choose a valid model before testing generation." });
    try {
      const result = await gateway.generate({
        profileId: req.params.id,
        modelId,
        systemInstruction: "Return only the requested JSON.",
        userPrompt: "Return {\"ok\":true}.",
        responseSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false },
        reasoningEffort: "low",
        stageName: "Connection generation test",
        timeoutMs: 30_000,
        inactivityTimeoutMs: 30_000,
        overallTimeoutMs: 45_000,
        maxOutputTokens: 64,
      });
      if (!result.parsed || typeof result.parsed !== "object" || (result.parsed as { ok?: unknown }).ok !== true) throw new ModelGatewayError("The model did not return the requested structured response.", "INVALID_STRUCTURED_OUTPUT", 502, result.provenance.provider);
      res.json({ status: "generated", provider: result.provenance.provider, modelId });
    } catch (error) {
      if (error instanceof ModelGatewayError) return res.status(error.status).json({ code: error.code, message: error.message });
      res.status(500).json({ code: "INTERNAL_ERROR", message: "Model generation test failed." });
    }
  });
}

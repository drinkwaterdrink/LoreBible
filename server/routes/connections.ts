import type { Application, Request, Response as ExpressResponse } from "express";
import { isProviderId, type ProviderId } from "../../src/contracts/generation.js";
import { getCatalogForProvider } from "../../src/lib/modelCatalog.js";
import { ProfileStoreError, type ProfileStore } from "../secrets/profileStore.js";

interface ConnectionRouteDependencies {
  store: ProfileStore;
  fetchImpl?: (input: string, init?: RequestInit) => Promise<globalThis.Response>;
  environmentGeminiKey?: string;
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
  const getProfile = async (id: string) => id === "environment-gemini" ? environmentProfile(dependencies.environmentGeminiKey) : dependencies.store.getMetadata(id);
  const getSecret = async (id: string) => id === "environment-gemini" ? dependencies.environmentGeminiKey || null : dependencies.store.getSecret(id);

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
      const response = await fetchImpl(`${profile.baseUrl}/models`, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" } });
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
      const response = await fetchImpl(`${profile.baseUrl}/models`, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" } });
      if (!response.ok) return res.status(503).json({ code: response.status === 401 || response.status === 403 ? "AUTHENTICATION_FAILED" : "PROVIDER_UNAVAILABLE", message: "Unable to retrieve provider models." });
      const payload: unknown = await response.json();
      const available = new Set(payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: Array<{ id?: unknown }> }).data
          .map((model) => typeof model.id === "string" ? normalizeProviderModelId(model.id.trim()) : "")
          .filter((id) => id.length > 0 && id.length <= 200 && !/\p{Cc}/u.test(id))
        : []);
      const curatedIds = new Set(catalog.map((model) => model.id));
      const customIds = new Set(profile.customModelIds.map(normalizeProviderModelId));
      const custom = profile.customModelIds
        .filter((id) => !curatedIds.has(id))
        .map((id) => ({ id, label: id, reasoning: "optional" as const, available: true, custom: true }));
      const providerReported = [...available]
        .filter((id) => !curatedIds.has(id) && !customIds.has(id))
        .map((id) => ({ id, label: id, reasoning: "optional" as const, available: true, providerReported: true }));
      res.json({ models: [...catalog.map((model) => ({ ...model, available: available.has(model.id) })), ...custom, ...providerReported] });
    } catch { res.status(503).json({ code: "PROVIDER_UNAVAILABLE", message: "Unable to retrieve provider models." }); }
  });
}

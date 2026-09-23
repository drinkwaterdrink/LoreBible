import type { Application, Request, Response } from "express";
import { PROMPT_REGISTRY, PROMPT_REGISTRY_VERSION } from "../../src/lib/prompts/registry.js";
import { PromptProfileStoreError, type PromptProfileStore } from "../prompts/promptProfileStore.js";

function errorResponse(res: Response, error: unknown) {
  if (error instanceof PromptProfileStoreError) {
    const status = error.code === "missing" ? 404 : error.code === "conflict" ? 409 : error.code === "invalid" ? 400 : 500;
    const code = error.code === "conflict" ? "PROMPT_PROFILE_CONFLICT" : error.code === "missing" ? "PROMPT_PROFILE_NOT_FOUND" : error.code === "corrupt" ? "PROMPT_PROFILE_STORE_CORRUPT" : "INVALID_PROMPT_PROFILE";
    res.status(status).json({ code, message: error.message }); return;
  }
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Prompt profile operation failed." });
}
function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new PromptProfileStoreError("expectedRevision must be a positive integer.", "invalid");
  return Number(value);
}

export function registerPromptRoutes(app: Application, dependencies: { store: PromptProfileStore }): void {
  app.get("/api/prompts", async (_req: Request, res: Response) => {
    try { res.json({ registryVersion: PROMPT_REGISTRY_VERSION, features: PROMPT_REGISTRY, profiles: await dependencies.store.list() }); }
    catch (error) { errorResponse(res, error); }
  });
  app.post("/api/prompts/profiles", async (req: Request, res: Response) => {
    try { res.status(201).json({ profile: await dependencies.store.create({ name: req.body?.name, overrides: req.body?.overrides }) }); }
    catch (error) { errorResponse(res, error); }
  });
  app.put("/api/prompts/profiles/:id", async (req: Request, res: Response) => {
    try { res.json({ profile: await dependencies.store.update(req.params.id, { name: req.body?.name, overrides: req.body?.overrides }, revision(req.body?.expectedRevision)) }); }
    catch (error) { errorResponse(res, error); }
  });
  app.delete("/api/prompts/profiles/:id", async (req: Request, res: Response) => {
    try { await dependencies.store.delete(req.params.id, revision(req.body?.expectedRevision)); res.status(204).end(); }
    catch (error) { errorResponse(res, error); }
  });
}

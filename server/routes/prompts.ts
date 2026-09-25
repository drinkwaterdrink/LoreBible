import type { Application, Request, Response } from "express";
import { PROMPT_REGISTRY, PROMPT_REGISTRY_VERSION } from "../../src/lib/prompts/registry.js";
import { PromptProfileStoreError, type PromptProfileStore } from "../prompts/promptProfileStore.js";
import { parsePromptOverridesV1 } from "../../src/contracts/prompts.js";
import { parseBlueprintSelectionV1 } from "../../src/contracts/blueprintSelection.js";
import { compilePromptPreview } from "../prompts/promptCompilePreview.js";

function errorResponse(res: Response, error: unknown) {
  if (error instanceof PromptProfileStoreError) {
    const status = error.code === "missing" ? 404 : error.code === "conflict" ? 409 : error.code === "invalid" ? 400 : 500;
    const code = error.code === "conflict" ? "PROMPT_PROFILE_CONFLICT" : error.code === "missing" ? "PROMPT_PROFILE_NOT_FOUND" : error.code === "corrupt" ? "PROMPT_PROFILE_STORE_CORRUPT" : "INVALID_PROMPT_PROFILE";
    res.status(status).json({ code, message: error.message }); return;
  }
  if (error instanceof TypeError) { res.status(400).json({ code: "INVALID_PROMPT_PREVIEW", message: error.message }); return; }
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
  app.post("/api/prompts/compile-preview", async (req: Request, res: Response) => {
    try {
      const source = req.body;
      if (!source || typeof source !== "object" || Array.isArray(source) || Object.getPrototypeOf(source) !== Object.prototype) throw new TypeError("Prompt preview request must be a plain object.");
      const allowed = ["featureId", "profileId", "projectOverrides", "selection", "sourceContext"];
      const unknown = Object.keys(source).find((key) => !allowed.includes(key));
      if (unknown) throw new TypeError(`Unknown prompt preview field: ${unknown}.`);
      if (typeof source.featureId !== "string") throw new TypeError("Prompt preview featureId is required.");
      if (source.profileId !== null && typeof source.profileId !== "string") throw new TypeError("Prompt preview profileId must be a string or null.");
      if (typeof source.sourceContext !== "string" || !source.sourceContext.trim()) throw new TypeError("Prompt preview sourceContext is required.");
      if (source.sourceContext.length > 500_000) throw new TypeError("Prompt preview sourceContext must be 500,000 characters or fewer.");
      const parsedSelection = parseBlueprintSelectionV1(source.selection);
      if (!parsedSelection.ok) {
        const firstIssue = "issues" in parsedSelection ? parsedSelection.issues[0]?.message : null;
        throw new TypeError(`Prompt preview Blueprint is invalid: ${firstIssue || "invalid selection"}`);
      }
      const profiles = await dependencies.store.list();
      const profile = source.profileId === null ? null : profiles.find((item) => item.id === source.profileId) ?? null;
      if (source.profileId !== null && !profile) throw new PromptProfileStoreError(`Prompt profile ${source.profileId} was not found.`, "missing");
      res.json({ preview: compilePromptPreview({ featureId: source.featureId, profile, projectOverrides: parsePromptOverridesV1(source.projectOverrides), selection: parsedSelection.value, sourceContext: source.sourceContext }) });
    } catch (error) { errorResponse(res, error); }
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

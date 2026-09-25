import type { Application, Request, Response } from "express";
import { PROMPT_REGISTRY, PROMPT_REGISTRY_VERSION } from "../../src/lib/prompts/registry.js";
import { PromptProfileStoreError, type PromptProfileStore } from "../prompts/promptProfileStore.js";
import { parsePromptOverridesV1 } from "../../src/contracts/prompts.js";
import { parseBlueprintSelectionV1 } from "../../src/contracts/blueprintSelection.js";
import { compilePromptPreview } from "../prompts/promptCompilePreview.js";
import { preparePromptCompilation } from "../prompts/promptCompilePreview.js";
import { parseModelSelection } from "../../src/contracts/generation.js";
import { ModelGatewayError, type ModelGateway } from "../model/gateway.js";
import { validateForgeSpecialistJob } from "../generation/forgeSpecialistPlan.js";
import { createRequestAbortSignal } from "../generation/requestLifecycle.js";
import { sendGenerationFailure } from "../generation/failureResponse.js";

function errorResponse(res: Response, error: unknown, invalidCode = "INVALID_PROMPT_PREVIEW") {
  if (error instanceof PromptProfileStoreError) {
    const status = error.code === "missing" ? 404 : error.code === "conflict" ? 409 : error.code === "invalid" ? 400 : 500;
    const code = error.code === "conflict" ? "PROMPT_PROFILE_CONFLICT" : error.code === "missing" ? "PROMPT_PROFILE_NOT_FOUND" : error.code === "corrupt" ? "PROMPT_PROFILE_STORE_CORRUPT" : "INVALID_PROMPT_PROFILE";
    res.status(status).json({ code, message: error.message }); return;
  }
  if (error instanceof TypeError) { res.status(400).json({ code: invalidCode, message: error.message }); return; }
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Prompt profile operation failed." });
}
function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new PromptProfileStoreError("expectedRevision must be a positive integer.", "invalid");
  return Number(value);
}

export function registerPromptRoutes(app: Application, dependencies: { store: PromptProfileStore; gateway?: Pick<ModelGateway, "generate"> | null }): void {
  const activePromptTests = new Map<string, AbortController>();
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
  app.post("/api/prompts/test", async (req: Request, res: Response) => {
    const lifecycle = createRequestAbortSignal(req, res);
    let testId = "";
    let testController: AbortController | null = null;
    const relayDisconnect = () => testController?.abort(lifecycle.signal.reason);
    try {
      const source = req.body;
      if (!source || typeof source !== "object" || Array.isArray(source) || Object.getPrototypeOf(source) !== Object.prototype) throw new TypeError("Prompt test request must be a plain object.");
      const allowed = ["testId", "featureId", "profileId", "projectOverrides", "selection", "sourceContext", "modelSelection"];
      const unknown = Object.keys(source).find((key) => !allowed.includes(key));
      if (unknown) throw new TypeError(`Unknown prompt test field: ${unknown}.`);
      if (typeof source.testId !== "string" || !/^[A-Za-z0-9_-]{8,80}$/.test(source.testId)) throw new TypeError("Prompt test testId must contain 8-80 letters, numbers, underscores, or hyphens.");
      testId = source.testId;
      if (activePromptTests.has(testId)) throw new TypeError("A prompt test with this ID is already active.");
      if (typeof source.featureId !== "string") throw new TypeError("Prompt test featureId is required.");
      if (source.profileId !== null && typeof source.profileId !== "string") throw new TypeError("Prompt test profileId must be a string or null.");
      if (typeof source.sourceContext !== "string" || !source.sourceContext.trim()) throw new TypeError("Prompt test sourceContext is required.");
      if (source.sourceContext.length > 500_000) throw new TypeError("Prompt test sourceContext must be 500,000 characters or fewer.");
      const selection = parseBlueprintSelectionV1(source.selection);
      if (!selection.ok) {
        const firstIssue = "issues" in selection ? selection.issues[0]?.message : null;
        throw new TypeError(`Prompt test Blueprint is invalid: ${firstIssue || "invalid selection"}`);
      }
      const model = parseModelSelection(source.modelSelection);
      if (!dependencies.gateway || !model.profileId || !model.modelId) throw new ModelGatewayError("Choose a connection and model before running a disposable prompt test.", "CREDENTIAL_MISSING", 401);
      const profiles = await dependencies.store.list();
      const profile = source.profileId === null ? null : profiles.find((item) => item.id === source.profileId) ?? null;
      if (source.profileId !== null && !profile) throw new PromptProfileStoreError(`Prompt profile ${source.profileId} was not found.`, "missing");
      const prepared = preparePromptCompilation({ featureId: source.featureId, profile, projectOverrides: parsePromptOverridesV1(source.projectOverrides), selection: selection.value, sourceContext: source.sourceContext });
      testController = new AbortController();
      activePromptTests.set(testId, testController);
      lifecycle.signal.addEventListener("abort", relayDisconnect, { once: true });
      const result = await dependencies.gateway.generate({
        profileId: model.profileId, modelId: model.modelId,
        systemInstruction: prepared.preview.systemInstruction, userPrompt: prepared.preview.userPrompt,
        responseSchema: prepared.specialist.schema, structuredOutputPolicy: "single_document",
        reasoningEffort: "medium", stageName: "Prompt Studio disposable test",
        timeoutMs: 120_000, inactivityTimeoutMs: 60_000, overallTimeoutMs: 480_000, maxOutputTokens: 12_000,
        signal: testController.signal,
      });
      let raw: unknown;
      try { raw = result.parsed === undefined ? JSON.parse(result.text) : result.parsed; }
      catch { throw new ModelGatewayError("The model returned invalid structured output for this prompt test.", "INVALID_STRUCTURED_OUTPUT", 502, result.provenance.provider); }
      let candidate: Record<string, unknown>;
      try { candidate = validateForgeSpecialistJob(prepared.specialist, raw); }
      catch { throw new ModelGatewayError("The model response did not satisfy the selected specialist schema.", "INVALID_STRUCTURED_OUTPUT", 502, result.provenance.provider); }
      res.json({
        candidate,
        compilation: { featureId: prepared.preview.featureId, jobId: prepared.preview.jobId, schemaId: prepared.preview.schemaId, snapshotHash: prepared.preview.snapshotHash, promptHash: prepared.preview.promptHash },
        provenance: { provider: result.provenance.provider, modelRequested: result.provenance.modelRequested, modelReported: result.provenance.modelReported, usage: result.provenance.usage, finishReason: result.provenance.finishReason, structuredOutputMode: result.provenance.structuredOutputMode },
        disclosure: { disposable: true, manuscriptMutated: false, checkpointMutated: false },
      });
    } catch (error) {
      if (!lifecycle.signal.aborted) {
        if (testController?.signal.aborted) sendGenerationFailure(res, new ModelGatewayError("The disposable prompt test was cancelled.", "CLIENT_DISCONNECTED", 499), { operation: "prompt-test" });
        else if (error instanceof PromptProfileStoreError || error instanceof TypeError) errorResponse(res, error, "INVALID_PROMPT_TEST");
        else sendGenerationFailure(res, error, { operation: "prompt-test" });
      }
    } finally {
      lifecycle.signal.removeEventListener("abort", relayDisconnect);
      if (testId && activePromptTests.get(testId) === testController) activePromptTests.delete(testId);
      lifecycle.dispose();
    }
  });
  app.post("/api/prompts/test/:testId/cancel", (req: Request, res: Response) => {
    const controller = activePromptTests.get(req.params.testId);
    if (!controller) return res.status(404).json({ code: "PROMPT_TEST_NOT_ACTIVE", message: "That disposable prompt test is not active." });
    controller.abort(new DOMException("Prompt test cancelled", "AbortError"));
    res.status(202).json({ status: "cancelling" });
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

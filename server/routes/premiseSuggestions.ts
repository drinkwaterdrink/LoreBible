import type { Express } from "express";
import type { ModelGateway } from "../model/gateway.js";
import { ModelGatewayError } from "../model/gateway.js";
import { parseModelSelection } from "../../src/contracts/generation.js";
import { parsePremiseSuggestionSet } from "../../src/contracts/premiseSuggestions.js";
import { createRequestAbortSignal, createSseSession } from "../generation/requestLifecycle.js";
import { normalizeGenerationFailure } from "../generation/failureResponse.js";

export interface PremiseSuggestionRouteDependencies {
  gateway: Pick<ModelGateway, "generate"> | null;
}

const responseSchema = {
  type: "object" as const,
  properties: {
    schemaVersion: { type: "integer" as const, enum: [1] },
    suggestions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          title: { type: "string" as const },
          premise: { type: "string" as const },
          category: { type: "string" as const },
          inspirationNote: { type: "string" as const },
        },
        required: ["id", "title", "premise", "category"],
        additionalProperties: false,
      },
    },
  },
  required: ["schemaVersion", "suggestions"],
  additionalProperties: false,
};

export function registerPremiseSuggestionRoutes(app: Express, dependencies: PremiseSuggestionRouteDependencies): void {
  app.post("/api/premise-suggestions", async (req, res) => {
    const lifecycle = createRequestAbortSignal(req, res);
    const session = createSseSession(res, "premises");
    const finishFailure = (error: unknown) => {
      const failure = normalizeGenerationFailure(error, { operation: "premise-suggestions" });
      session.finish({
        type: "error",
        task: "premises",
        message: failure.message,
        code: failure.code,
        action: failure.action,
        retryable: failure.retryable,
        retryAfterMs: failure.retryAfterMs,
      });
    };
    try {
      const rawSelection = req.body?.settings?.modelSelection;
      const selection = rawSelection == null ? null : parseModelSelection(rawSelection);
      if (!dependencies.gateway || !selection?.profileId || !selection.modelId) {
        throw new ModelGatewayError("Choose a connection and model before generating fresh premises.", "CREDENTIAL_MISSING", 401);
      }
      session.startHeartbeat();
      session.send({ type: "progress", task: "premises", phase: "writer", label: "Drafting four fresh premises", completedSteps: 0, totalSteps: 1 });
      const response = await dependencies.gateway.generate({
        profileId: selection.profileId,
        modelId: selection.modelId,
        systemInstruction: "You are LoreBible's premise ideation specialist. Preserve player agency. Return only the requested structured data.",
        userPrompt: `Create exactly four original, structurally distinct roleplay-world premises.

Each premise must be specific, playable, and meaningfully different in scale, social structure, primary activity, and source of tension. Do not make institutions, conspiracies, secrets, violence, romance, supernatural systems, factions, debt, survival, or ticking clocks mandatory defaults. Ordinary life and low-conflict premises are valid. Never prescribe {{user}}'s feelings, dialogue, attraction, decisions, destiny, or voluntary actions.

Give each candidate a short unique ID, evocative title, one-to-three-sentence premise, concise category, and optional inspiration note. Return schemaVersion 1 and exactly four suggestions.`,
        responseSchema,
        reasoningEffort: "medium",
        stageName: "Fresh Premises",
        timeoutMs: 120_000,
        inactivityTimeoutMs: 60_000,
        overallTimeoutMs: 180_000,
        maxOutputTokens: 2400,
        onContentDelta: (delta) => session.send({ type: "output_delta", task: "premises", characters: delta.length }),
        onReasoningDelta: (delta) => session.send({ type: "reasoning", task: "premises", delta }),
        onUsage: (usage) => session.send({ type: "usage", task: "premises", usage }),
        onProviderActivity: () => session.send({ type: "provider_activity", task: "premises", at: Date.now() }),
        signal: lifecycle.signal,
      });
      const raw = response.parsed === undefined ? JSON.parse(response.text) : response.parsed;
      let result;
      try { result = parsePremiseSuggestionSet(raw); }
      catch (error) { throw new ModelGatewayError(error instanceof Error ? error.message : "The provider returned invalid premise suggestions.", "INVALID_STRUCTURED_OUTPUT", 502); }
      session.send({ type: "progress", task: "premises", phase: "complete", label: "Four fresh premises ready", completedSteps: 1, totalSteps: 1 });
      session.finish({ type: "done", task: "premises", result });
    } catch (error) {
      if (!lifecycle.signal.aborted) finishFailure(error);
    } finally {
      session.dispose();
      lifecycle.dispose();
    }
  });
}

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { GENERATOR_RULES, FORMAT_EXAMPLE, checkContamination, CREATIVE_CONSTITUTION_PROMPT } from "./src/lib/systemPrompt.js";
import { cleanAngleLabel } from "./src/lib/deterministicBundles.js";
import { calculateLocalGravityAudit, auditOpeningMessageLocal, performVoiceCheckLocal } from "./src/lib/testBenchService.js";
import {
  UNIVERSAL_DIMENSIONS,
  DRAMATIC_ENGINES_CATALOG,
  DISTINCTIVENESS_CRITIC_PROMPT,
  buildDivergenceModeGuidance,
  buildSemanticRerollGuidance,
} from "./src/lib/divergenceEngine.js";
import {
  buildAuthorFlavorPrompt,
  selectAutoAuthor,
  selectAutoAuthorsForBranches,
  getAuthorProfile,
} from "./src/lib/authorProfiles.js";
import { AuthorFlavorStrength, AuthorId } from "./src/types";
import { parseModelSelection, type GenerationProvenance, type ModelSelection } from "./src/contracts/generation.js";
import { parseCanonicalSparkDNA } from "./src/contracts/spark.js";
import { createWindowsDpapiProtector } from "./server/secrets/dpapi.js";
import { createProfileStore, resolveDefaultProfileStorePath, type ProfileStore } from "./server/secrets/profileStore.js";
import { registerConnectionRoutes } from "./server/routes/connections.js";
import { createModelGateway, ModelGatewayError, type ModelGateway } from "./server/model/gateway.js";
import { lowerReasoningEffort } from "./server/model/providerTimeouts.js";
import { abortableDelay, createRequestAbortSignal, createSseSession } from "./server/generation/requestLifecycle.js";
import { normalizeGenerationFailure, sendGenerationFailure } from "./server/generation/failureResponse.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Connection profiles are persisted outside the repository and encrypted with
// Windows DPAPI. The route layer is isolated so generation can report a
// truthful, actionable error when no profile store is available.
let connectionStore: ProfileStore | null = null;
let modelGateway: ModelGateway | null = null;
try {
  connectionStore = createProfileStore(
    resolveDefaultProfileStorePath(),
    createWindowsDpapiProtector(),
  );
  modelGateway = createModelGateway(connectionStore);
  registerConnectionRoutes(app, {
    store: connectionStore,
    environmentGeminiKey: process.env.GEMINI_API_KEY,
  });
} catch (error) {
  console.warn("[Connections] Profile routes unavailable:", error instanceof Error ? error.message : error);
}

function resolveRequestedModelSelection(value: unknown): ModelSelection | null {
  if (value == null) return null;
  const selection = parseModelSelection(value);
  if (!selection.profileId && !selection.modelId) return null;
  if (!selection.profileId || !selection.modelId) throw new TypeError("Both modelSelection.profileId and modelSelection.modelId are required.");
  return selection;
}

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const ENV_GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || null;

function getRawErrorString(err: any): string {
  if (!err) return "";
  const parts: string[] = [];
  if (typeof err === "string") parts.push(err);
  if (typeof err?.message === "string") parts.push(err.message);
  if (typeof err?.statusText === "string") parts.push(err.statusText);
  try {
    parts.push(JSON.stringify(err));
  } catch {}
  return parts.join(" ");
}

function parseRetryDelayMs(err: any): number | null {
  try {
    const raw = getRawErrorString(err);
    const retryInfoMatch = raw.match(/"retryDelay":\s*"([0-9.]+)s"/i);
    if (retryInfoMatch) {
      return Math.ceil(parseFloat(retryInfoMatch[1]) * 1000) + 1000;
    }
    const pleaseRetryMatch = raw.match(/Please retry in ([0-9.]+)s/i);
    if (pleaseRetryMatch) {
      return Math.ceil(parseFloat(pleaseRetryMatch[1]) * 1000) + 1000;
    }
  } catch {}
  return null;
}

function isDailyQuotaExhausted(err: any): boolean {
  const raw = getRawErrorString(err);
  return raw.includes("PerDay") || raw.includes("GenerateRequestsPerDay");
}

function isHighDemandError(err: any): boolean {
  const raw = getRawErrorString(err);
  return raw.includes("503") || raw.includes("UNAVAILABLE") || raw.includes("high demand");
}

function cleanErrorMessage(err: any): string {
  if (!err) return "Unknown error during model generation.";
  const raw = getRawErrorString(err);

  if (isHighDemandError(err)) {
    return "The selected model service is currently experiencing high demand.";
  }
  if (isDailyQuotaExhausted(err)) {
    return "The daily free-tier quota has been reached for the active models. Please wait for the quota reset or configure an API key in Settings.";
  }
  if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED") || raw.includes("quota")) {
    const delay = parseRetryDelayMs(err);
    if (delay) {
      return `Rate limit reached. Please wait ${Math.ceil(delay / 1000)} seconds before retrying.`;
    }
    return "API rate limit reached. Please wait a moment and try again.";
  }
  if (typeof err?.message === "string") {
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.error?.message) return parsed.error.message;
    } catch {}
    return err.message.slice(0, 300);
  }
  return "Model call failed. Please check your connection or try again.";
}

async function callGeminiGenerate(
  ai: GoogleGenAI,
  config: any,
  thinkingLevel: ThinkingLevel = ThinkingLevel.MEDIUM,
  signal?: AbortSignal,
): Promise<any> {
  let lastError: any = null;
  if (!ENV_GEMINI_MODEL) {
    throw new ModelGatewayError("Choose a connection and model before generating.", "CREDENTIAL_MISSING", 401);
  }
  const model = ENV_GEMINI_MODEL;
  for (let modelAttempt = 1; modelAttempt <= 2; modelAttempt++) {
      try {
        signal?.throwIfAborted();
        const isGemini3 = model.startsWith("gemini-3.");
        const requestPayload = {
          ...config,
          model,
          config: {
            ...(config.config || {}),
            ...(isGemini3 ? { thinkingConfig: { thinkingLevel } } : {}),
            ...(signal ? { abortSignal: signal } : {}),
          },
        };
        const res = await ai.models.generateContent(requestPayload);
        return res;
      } catch (err: any) {
        lastError = err;
        const raw = getRawErrorString(err);

        // If rate limit with short retry delay (<= 8s), wait and retry once
        const delayMs = parseRetryDelayMs(err);
        if (delayMs && delayMs <= 8000 && modelAttempt < 2) {
          console.log(`[Rate Limit on ${model}] Waiting ${delayMs}ms before retry...`);
          if (signal) await abortableDelay(delayMs, signal); else await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        break;
      }
    }
  throw new ModelGatewayError(cleanErrorMessage(lastError), isDailyQuotaExhausted(lastError) ? "QUOTA_EXHAUSTED" : isHighDemandError(lastError) ? "PROVIDER_UNAVAILABLE" : "INTERNAL_ERROR", isDailyQuotaExhausted(lastError) ? 429 : isHighDemandError(lastError) ? 503 : 500, "gemini");
}

async function executeSelectedModelWithRetry<T>(params: {
  gateway: ModelGateway;
  selection: ModelSelection;
  systemInstruction: string;
  userPrompt: string;
  responseSchema?: any;
  stageName: string;
  sparkText: string;
  maxAttempts?: number;
  thinkingLevel?: ThinkingLevel;
  signal?: AbortSignal;
  onAttempt?: (attempt: number, maxAttempts: number, stageName: string) => void;
  onMetadata?: (provenance: GenerationProvenance) => void;
  onContentDelta?: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
  onUsage?: (usage: { inputTokens?: number; outputTokens?: number; reasoningTokens?: number }) => void;
  onProviderActivity?: () => void;
}): Promise<T> {
  const { gateway, selection, responseSchema, stageName, sparkText, maxAttempts = 3, thinkingLevel = ThinkingLevel.MEDIUM } = params;
  let reasoningEffort: "low" | "medium" | "high" = thinkingLevel === ThinkingLevel.LOW ? "low" : thinkingLevel === ThinkingLevel.HIGH ? "high" : "medium";
  let lastErr: unknown = null;
  let userPrompt = params.userPrompt;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      params.signal?.throwIfAborted();
      const attemptLabel = attempt > 1 && lastErr instanceof ModelGatewayError && lastErr.code === "REQUEST_TIMEOUT"
        ? `${stageName} · retrying with ${reasoningEffort} reasoning after timeout`
        : stageName;
      params.onAttempt?.(attempt, maxAttempts, attemptLabel);
      if (attempt > 1) {
        const delay = Math.min(12000, (attempt - 1) * 1500);
        if (params.signal) await abortableDelay(delay, params.signal); else await new Promise((resolve) => setTimeout(resolve, delay));
      }
      const response = await gateway.generate({
        profileId: selection.profileId as string,
        modelId: selection.modelId as string,
        systemInstruction: params.systemInstruction,
        userPrompt,
        responseSchema,
        reasoningEffort,
        stageName,
        timeoutMs: 150_000,
        inactivityTimeoutMs: 60_000,
        overallTimeoutMs: 480_000,
        onContentDelta: params.onContentDelta,
        onReasoningDelta: params.onReasoningDelta,
        onUsage: params.onUsage,
        onProviderActivity: params.onProviderActivity,
        signal: params.signal,
      });
      if (!params.onUsage && !params.onReasoningDelta) params.onMetadata?.(response.provenance);
      let parsed: any = response.parsed;
      if (parsed === undefined) parsed = JSON.parse(response.text);
      const contaminatedTerm = checkContamination(parsed);
      if (contaminatedTerm) {
        if (attempt < maxAttempts) {
          userPrompt += `\n\nCRITICAL: The previous generation contained the banned illustrative term "${contaminatedTerm}". Generate fresh content faithful to: "${sparkText}".`;
          continue;
        }
        throw new ModelGatewayError(`Structured output contained a banned illustrative term: ${contaminatedTerm}.`, "INVALID_STRUCTURED_OUTPUT", 502);
      }
      return parsed as T;
    } catch (error) {
      if (params.signal?.aborted || (error instanceof ModelGatewayError && error.code === "CLIENT_DISCONNECTED")) throw error;
      lastErr = error;
      console.log(`[Notice in ${stageName} selected-model attempt ${attempt}/${maxAttempts}]:`, cleanErrorMessage(error));
      if (error instanceof ModelGatewayError && error.code === "REQUEST_TIMEOUT") reasoningEffort = lowerReasoningEffort(reasoningEffort);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(cleanErrorMessage(lastErr));
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    environmentModel: ENV_GEMINI_MODEL,
  });
});

/**
 * Shared Context Builder
 * Single source of truth for constructing prompt context across all stages.
 */
export function buildSharedContext(params: {
  sparkText: string;
  parse?: any;
  canon?: any;
  chosenTake?: any;
  physics?: any;
  existingDoc?: any;
}): string {
  const { sparkText, parse, canon, chosenTake, physics, existingDoc } = params;
  const nonNegs = parse?.nonNegotiables || [];
  const regWords = parse?.registerWords || [];
  const userRole = parse?.userRole || null;

  let ctx = `NON-NEGOTIABLE PREMISE: "${sparkText}".
Everything generated must be recognisably part of this world.
Required elements: ${JSON.stringify(nonNegs)}.
Required register: ${JSON.stringify(regWords)}.
Player character: ALWAYS leave the player character reference as {{user}}; NEVER generate a persona name for the user.`;

  if (userRole) {
    ctx += `\nPlayer starting position: ${userRole}.`;
  }

  if (canon?.enabled && canon.franchiseName) {
    ctx += `\n\nCANON MODE ACTIVE:
Franchise: ${canon.franchiseName}
Fidelity tier: ${canon.fidelity || "Adjacent"}
MANDATORY INSTRUCTIONS FOR CANON MODE:
1. Use real in-universe proper nouns, factions, licensing, technologies, and vocabulary from ${canon.franchiseName}.
2. Reinterpret mundanity as the authentic logistics and material realities OF THIS WORLD (${canon.franchiseName}) — supply lines, protocols, maintenance, and jurisdictional borders.
3. Keep metaphysical and world rules consistent with canon.`;
  }

  if (chosenTake) {
    ctx += `\n\nCHOSEN PREMISE ANGLE:
Title: ${chosenTake.title}
Pitch: ${chosenTake.pitch}
Angle: ${chosenTake.angle}
What's Strange: ${chosenTake.whatsStrange}
Tone: ${chosenTake.genreTone}`;
  }

  if (physics) {
    ctx += `\n\nWORLD CONSTRAINTS:
- Density: ${physics.density || "Standard"}
- Strangeness: ${physics.strangeness || 3}/5
- Mundanity: ${physics.mundanity || 4}/5
- Violence: ${physics.violence || "Moderate"}
- Horror: ${physics.horror || "Psych"}
- Romance: ${physics.romance || "Subplot"}
- Pacing: ${physics.pacing || "Slow burn"}`;

    // Strictly OMIT Linguistic Base when Canon Mode is active
    if (!canon?.enabled && physics.linguisticBase && physics.linguisticBase.trim()) {
      ctx += `\n- Linguistic Base: ${physics.linguisticBase}`;
    }

    if (physics.mustInclude && physics.mustInclude.trim()) {
      ctx += `\n- Author Must-Include: "${physics.mustInclude.trim()}"`;
    }
    if (physics.mustAvoid && physics.mustAvoid.trim()) {
      ctx += `\n- Author Must-Avoid: "${physics.mustAvoid.trim()}"`;
    }
  }

  // If previous sections were already generated in preceding bundles, provide their context
  if (existingDoc) {
    ctx += `\n\nALREADY ESTABLISHED SECTIONS (Hold full continuity and coherence with these):`;
    if (existingDoc.core) {
      ctx += `\n- Title: "${existingDoc.core.title}"`;
      ctx += `\n- Core Rule: "${existingDoc.core.theRule}"`;
      ctx += `\n- Core Cost: "${existingDoc.core.theCost}"`;
      ctx += `\n- Situation: "${existingDoc.core.theSituation}"`;
      ctx += `\n- Pressure: "${existingDoc.core.thePressure}"`;
    }
    if (existingDoc.user) {
      ctx += `\n- User Position: "${existingDoc.user.rolePosition}"`;
      ctx += `\n- User Starts With: "${existingDoc.user.startsWith}"`;
    }
    if (existingDoc.worldPhysics) {
      ctx += `\n- Authority Check: "${existingDoc.worldPhysics.authorityCheck}"`;
      ctx += `\n- Power Ceiling: "${existingDoc.worldPhysics.powerCeiling}"`;
    }
    if (existingDoc.locations && existingDoc.locations.length > 0) {
      const locNames = existingDoc.locations.map((l: any) => l.fields?.name || l.id).join(", ");
      ctx += `\n- Established Locations: ${locNames}`;
    }
    if (existingDoc.factions && existingDoc.factions.length > 0) {
      const facNames = existingDoc.factions.map((f: any) => f.fields?.name || f.id).join(", ");
      ctx += `\n- Established Factions: ${facNames}`;
    }
    if (existingDoc.npcs && existingDoc.npcs.length > 0) {
      const npcNames = existingDoc.npcs.map((n: any) => `${n.fields?.name || n.id} (${n.fields?.role || ""})`).join(", ");
      ctx += `\n- Established NPCs: ${npcNames}`;
    }
  }

  return ctx;
}

/**
 * Execute Gemini call with 2 retries with backoff, JSON repair, and contamination blocklist check.
 */
async function executeGeminiWithRetry<T>(params: {
  ai: GoogleGenAI | null;
  systemInstruction: string;
  userPrompt: string;
  responseSchema?: any;
  stageName: string;
  sparkText: string;
  maxAttempts?: number;
  thinkingLevel?: ThinkingLevel;
  modelSelection?: ModelSelection | null;
  gateway?: ModelGateway | null;
  signal?: AbortSignal;
  onAttempt?: (attempt: number, maxAttempts: number, stageName: string) => void;
  onMetadata?: (provenance: GenerationProvenance) => void;
  onContentDelta?: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
  onUsage?: (usage: { inputTokens?: number; outputTokens?: number; reasoningTokens?: number }) => void;
  onProviderActivity?: () => void;
}): Promise<T> {
  const {
    ai,
    systemInstruction,
    userPrompt,
    responseSchema,
    stageName,
    sparkText,
    maxAttempts = 3,
    thinkingLevel = ThinkingLevel.MEDIUM,
    modelSelection = null,
    gateway = null,
    signal,
    onAttempt,
    onMetadata,
  } = params;
  if (modelSelection) {
    if (!gateway) throw new ModelGatewayError("Connection profile storage is unavailable.", "INTERNAL_ERROR", 500);
    return executeSelectedModelWithRetry<T>({
      gateway,
      selection: modelSelection,
      systemInstruction,
      userPrompt,
      responseSchema,
      stageName,
      sparkText,
      maxAttempts,
      thinkingLevel,
      signal,
      onAttempt,
      onMetadata,
      onContentDelta: params.onContentDelta,
      onReasoningDelta: params.onReasoningDelta,
      onUsage: params.onUsage,
      onProviderActivity: params.onProviderActivity,
    });
  }
  if (!ai) throw new ModelGatewayError("Choose a connection and model before generating.", "CREDENTIAL_MISSING", 401);
  let lastErr: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      signal?.throwIfAborted();
      onAttempt?.(attempt, maxAttempts, stageName);
      if (attempt > 1) {
        const baseDelay = (attempt - 1) * 1500;
        const suggestedDelay = parseRetryDelayMs(lastErr) || 0;
        const delay = Math.max(baseDelay, Math.min(suggestedDelay, 12000));
        console.log(`[Retry] Attempt ${attempt}/${maxAttempts} for ${stageName} after ${delay}ms...`);
        if (signal) await abortableDelay(delay, signal); else await new Promise((r) => setTimeout(r, delay));
      }

      const res = await callGeminiGenerate(
        ai,
        {
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            ...(responseSchema ? { responseSchema } : {}),
          },
        },
        thinkingLevel,
        signal,
      );

      const usageMetadata = res.usageMetadata || {};
      onMetadata?.({
        provider: "gemini",
        profileId: "environment-gemini",
        modelRequested: ENV_GEMINI_MODEL,
        modelReported: ENV_GEMINI_MODEL,
        repaired: false,
        offlineFallback: false,
        usage: {
          inputTokens: typeof usageMetadata.promptTokenCount === "number" ? usageMetadata.promptTokenCount : undefined,
          outputTokens: typeof usageMetadata.candidatesTokenCount === "number" ? usageMetadata.candidatesTokenCount : undefined,
          reasoningTokens: typeof usageMetadata.thoughtsTokenCount === "number" ? usageMetadata.thoughtsTokenCount : undefined,
        },
      });

      const rawText = res.text || "";
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn(`[JSON Parse Error in ${stageName} (attempt ${attempt})]:`, parseErr);
        console.log(`[JSON Repair Attempt] Asking model to repair malformed JSON for ${stageName}...`);
        const repairRes = await callGeminiGenerate(ai, {
          contents: `You are a strict JSON repair utility.
The previous model call produced malformed JSON for stage: "${stageName}".

MALFORMED TEXT:
${rawText.slice(0, 3500)}

Return ONLY strictly valid, complete JSON matching the required schema. Do not output markdown fences or conversational text.`,
          config: {
            responseMimeType: "application/json",
            ...(responseSchema ? { responseSchema } : {}),
          },
        }, ThinkingLevel.MEDIUM, signal);
        parsed = JSON.parse(repairRes.text || "{}");
      }

      // Contamination check against blocklist
      const contaminatedTerm = checkContamination(parsed);
      if (contaminatedTerm) {
        console.warn(`[Contamination Hit in ${stageName}]: detected banned term "${contaminatedTerm}".`);
        if (attempt < maxAttempts) {
          params.userPrompt += `\n\nCRITICAL: Your previous generation was rejected because it contained the banned illustrative term "${contaminatedTerm}". Never use concepts or names from the underwater silt example. Generate fresh content strictly faithful to: "${sparkText}".`;
          continue;
        }
      }

      return parsed as T;
    } catch (err: any) {
      if (signal?.aborted) throw err;
      lastErr = err;
      console.log(`[Notice in ${stageName} attempt ${attempt}/${maxAttempts}]: ${cleanErrorMessage(err)}`);
    }
  }

  throw new Error(`[${stageName}]: ${cleanErrorMessage(lastErr)}`);
}

function generateDeterministicSparkParse(sparkText: string): any {
  const lower = (sparkText || "").toLowerCase();
  let franchise: string | null = null;
  if (lower.includes("hunter x hunter")) franchise = "Hunter x Hunter";
  else if (lower.includes("dune")) franchise = "Dune";
  else if (lower.includes("disco elysium")) franchise = "Disco Elysium";
  else if (lower.includes("warhammer")) franchise = "Warhammer 40,000";
  else if (lower.includes("bloodborne")) franchise = "Bloodborne";
  else if (lower.includes("cyberpunk")) franchise = "Cyberpunk";

  // Extract nonNegotiables from punctuation or clauses
  const rawPhrases = sparkText
    .split(/[,;+\n\.]|\bwhere\b|\bwith\b|\band\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const nonNegotiables = rawPhrases.length > 0 ? rawPhrases.slice(0, 3) : [(sparkText || "core premise").slice(0, 40)];

  // Extract register words or use genre-derived defaults
  const registerWords: string[] = [];
  const toneKeywords = [
    "taut", "grim", "unhinged", "feral", "bureaucratic", "noir", "cozy", "spiteful",
    "melancholic", "clinical", "paranoia", "wild", "tender", "austere", "whimsical",
    "eerie", "urgent", "hopeful", "bittersweet", "intimate"
  ];
  for (const w of toneKeywords) {
    if (lower.includes(w)) registerWords.push(w);
  }
  if (registerWords.length === 0) {
    if (lower.includes("cozy") || lower.includes("tea") || lower.includes("shop")) registerWords.push("cozy", "intimate", "grounded");
    else if (lower.includes("space") || lower.includes("colony") || lower.includes("station")) registerWords.push("sterile", "taut", "procedural");
    else if (lower.includes("court") || lower.includes("royal") || lower.includes("political")) registerWords.push("ceremonious", "venomous", "subtle");
    else registerWords.push("grounded", "evocative", "distinct");
  }

  // Derive user role from context
  let userRole: string | null = null;
  if (lower.includes("cook") || lower.includes("chef")) userRole = "reluctant chef";
  else if (lower.includes("detective") || lower.includes("investigator")) userRole = "lead investigator";
  else if (lower.includes("apprentice") || lower.includes("student")) userRole = "unproven apprentice";
  else if (lower.includes("courier") || lower.includes("pilot")) userRole = "contract courier";
  else if (lower.includes("botanist") || lower.includes("scientist")) userRole = "field researcher";
  else if (lower.includes("applicant")) userRole = "applicant";

  const openNegotiables = [
    `The decisive constraint governing ${nonNegotiables[0]}`,
    "The unspoken debt or personal history binding the primary parties",
    "The physical threshold or event that precipitates the opening crisis",
  ];

  return {
    franchise,
    nonNegotiables,
    registerWords,
    userRole,
    openNegotiables,
    sparkDNA: {
      nonNegotiables,
      premisePromise: sparkText,
      toneEnvelope: { primary: registerWords[0] || "grounded", descriptors: registerWords },
      genreSignals: ["Grounded Speculative / Open Scenario"],
      playerAgencyBoundaries: "{{user}} retains authority over protagonist choices.",
      openVariables: openNegotiables,
      existingPressures: [],
      assumptions: ["Standard social or environmental consequences apply"],
      opportunitySpace: ["Unexpected personal history", "Hidden resource constraint"],
      userRole,
      franchise,
    },
  };
}

function generateDeterministicDivergenceTakes(sparkText: string, parse?: any): any[] {
  const primaryNonNeg = parse?.nonNegotiables?.[0] || (sparkText || "").slice(0, 32).trim() || "The Core Setting";
  const tone = parse?.registerWords?.join(", ") || "evocative, grounded";
  const now = Date.now();

  return [
    {
      id: `take-craft-${now}`,
      title: `The Rhythm of ${primaryNonNeg}`,
      pitch: `The unfolding reality of ${sparkText} is anchored by immediate material focus, tangible tools of the trade, and the daily craft required to sustain it.`,
      genreTone: `authentic craft (${tone})`,
      whatsStrange: `Every meaningful advance requires direct physical dedication and mastering the quiet laws of this domain.`,
      angle: "Ground-Level Craft & Reality",
      retainedNonNegotiables: parse?.nonNegotiables || [primaryNonNeg],
      primaryEngine: "Ground-Level Craft / The Daily Reality",
      whatChanged: "Anchored the narrative deeply in tactile practice, personal labor, and material detail.",
      whatProtected: primaryNonNeg,
    },
    {
      id: `take-compact-${now}`,
      title: `The Shared Compact`,
      pitch: `Everyone involved with ${primaryNonNeg} honors an unspoken social agreement or delicate equilibrium because disturbing it threatens what they hold dear.`,
      genreTone: `social tension (${tone})`,
      whatsStrange: `The central situation is sustained by mutual reliance, personal debts, and the care people take around each other.`,
      angle: "Competing Obligations & Social Compact",
      retainedNonNegotiables: parse?.nonNegotiables || [primaryNonNeg],
      primaryEngine: "Competing Obligations / The Social Contract",
      whatChanged: "Centered the drama on competing loyalties, community dependencies, and mutual standing.",
      whatProtected: primaryNonNeg,
    },
    {
      id: `take-discovery-${now}`,
      title: `The Unfolding Horizon`,
      pitch: `A sudden discovery or changing circumstance around ${primaryNonNeg} reopens an old question that everyone assumed was permanently settled.`,
      genreTone: `emergent mystery (${tone})`,
      whatsStrange: `Investigating the core question uncovers a fertile contradiction at the very heart of the setting.`,
      angle: "Emergent Discovery & New Frontier",
      retainedNonNegotiables: parse?.nonNegotiables || [primaryNonNeg],
      primaryEngine: "Emergent Wonder / The Uncharted Frontier",
      whatChanged: "Opened the scope outward into active exploration, shifting paradigms, and fresh stakes.",
      whatProtected: primaryNonNeg,
    },
    {
      id: `take-chamber-${now}`,
      title: `The Threshold Accord`,
      pitch: `The thematic weight of ${sparkText} is focused into an intimate, high-stakes relationship where personal history shapes every choice.`,
      genreTone: `intimate crucible (${tone})`,
      whatsStrange: `The fate of the broader situation turns on a deeply personal negotiation between two characters who cannot walk away.`,
      angle: "Intimate Crucible & Personal Stakes",
      retainedNonNegotiables: parse?.nonNegotiables || [primaryNonNeg],
      primaryEngine: "Intimate Crucible / The Pressure Cooker",
      whatChanged: "Rescaled the premise into a concentrated interpersonal crucible with high emotional gravity.",
      whatProtected: primaryNonNeg,
    },
  ];
}

// 1. Spark Parse endpoint (Extracts full SparkDNA & backward-compatible SparkParse)
app.post("/api/parse-spark", async (req, res) => {
  const requestLifecycle = createRequestAbortSignal(req, res);
  try {
    const { sparkText, settings } = req.body;
    if (!sparkText || typeof sparkText !== "string") {
      return res.status(400).json({ error: "Missing sparkText" });
    }

    let modelSelection: ModelSelection | null = null;
    try {
      modelSelection = resolveRequestedModelSelection(settings?.modelSelection);
    } catch (error) {
      return res.status(400).json({ code: "INVALID_MODEL_SELECTION", error: error instanceof Error ? error.message : "Invalid model selection." });
    }
    const ai = getAI();
    let parsed: any = null;

    if (!ai && !modelSelection) {
      return sendGenerationFailure(res, new ModelGatewayError("Choose a connection and model before generating.", "CREDENTIAL_MISSING", 401), { operation: "parse-spark" });
    }

    if (ai || modelSelection) {
      try {
        const prompt = `${CREATIVE_CONSTITUTION_PROMPT}

You are the Spark DNA Extractor for Lore Bible.
Analyze the user's raw scenario spark text.
Extract a complete, genre-agnostic SPARK DNA profile without imposing any unrequested genre tropes or legacy biases.

Return strictly JSON matching this canonical structure:
{
  "nonNegotiables": ["2 to 5 concrete proper nouns, factions, institutions, objects, or mandatory conditions explicitly stated"],
  "premisePromise": "Dense, crisp summary of the premise as written",
  "toneEnvelope": { "primary": "The primary native tone", "descriptors": ["2 to 4 evocative descriptors"] },
  "genreSignals": ["The native genre or archetype signals"],
  "playerAgencyBoundaries": "Explicitly state that {{user}} retains authority over protagonist choices.",
  "openVariables": ["2 to 4 open questions or fertile ambiguities"],
  "existingPressures": ["1 to 3 pressures already present in the spark"],
  "assumptions": ["1 to 3 implicit narrative assumptions present in the prompt"],
  "opportunitySpace": ["1 to 3 unconstrained vectors where divergence is encouraged"],
  "userRole": "The user's starting occupation, station, or position if explicitly specified, or null if open",
  "franchise": "The specific IP/franchise name if Canon Mode was detected, else null"
}

User spark:
"${sparkText}"`;

        const parseSchema = {
          type: Type.OBJECT,
          properties: {
            nonNegotiables: { type: Type.ARRAY, items: { type: Type.STRING } },
            premisePromise: { type: Type.STRING },
            toneEnvelope: { type: Type.OBJECT, properties: { primary: { type: Type.STRING }, descriptors: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["primary", "descriptors"] },
            genreSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
            playerAgencyBoundaries: { type: Type.STRING },
            openVariables: { type: Type.ARRAY, items: { type: Type.STRING } },
            existingPressures: { type: Type.ARRAY, items: { type: Type.STRING } },
            assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunitySpace: { type: Type.ARRAY, items: { type: Type.STRING } },
            userRole: { type: Type.STRING, nullable: true },
            franchise: { type: Type.STRING, nullable: true },
          },
          required: ["nonNegotiables", "premisePromise", "toneEnvelope", "genreSignals", "playerAgencyBoundaries", "openVariables", "existingPressures", "assumptions", "opportunitySpace"],
        };

        const result = await executeGeminiWithRetry<any>({
          ai,
          systemInstruction: CREATIVE_CONSTITUTION_PROMPT,
          userPrompt: prompt,
          responseSchema: parseSchema,
          stageName: "Spark DNA Parse",
          sparkText,
          maxAttempts: 2,
          thinkingLevel: ThinkingLevel.LOW,
          modelSelection,
          gateway: modelGateway,
          signal: requestLifecycle.signal,
        });

        if (result && result.nonNegotiables && result.nonNegotiables.length > 0) {
          const canonical = parseCanonicalSparkDNA(result);
          parsed = {
            franchise: canonical.franchise,
            nonNegotiables: canonical.nonNegotiables,
            registerWords: canonical.toneEnvelope.descriptors,
            userRole: canonical.userRole,
            openNegotiables: canonical.openVariables,
            sparkDNA: canonical,
          };
        }
      } catch (modelErr: any) {
        if (requestLifecycle.signal.aborted || (modelErr instanceof ModelGatewayError && modelErr.code === "CLIENT_DISCONNECTED")) return;
        console.warn("[Spark Parse Model Call Error]:", modelErr?.message || modelErr);
        return sendGenerationFailure(res, modelErr, { operation: "parse-spark" });
      }
    }

    if (!parsed || !parsed.nonNegotiables || parsed.nonNegotiables.length === 0) {
      return sendGenerationFailure(res, new ModelGatewayError("The selected model returned an incomplete Spark analysis.", "INVALID_STRUCTURED_OUTPUT", 502), { operation: "parse-spark" });
    }

    return res.json(parsed);
  } catch (err: any) {
    if (requestLifecycle.signal.aborted) return;
    console.error("Parse spark unhandled error:", err);
    return sendGenerationFailure(res, err, { operation: "parse-spark" });
  } finally {
    requestLifecycle.dispose();
  }
});

// 2. Divergence endpoint (Universal Possibility Space + Deep Craft Pipeline + Author Flavor)
app.post("/api/divergence", async (req, res) => {
  const wantsStream = String(req.headers.accept || "").includes("text/event-stream");
  const requestLifecycle = wantsStream ? createRequestAbortSignal(req, res) : null;
  const session = wantsStream ? createSseSession(res, "divergence") : null;
  session?.startHeartbeat();
  const sendProgress = (phase: "requesting" | "architect" | "critic" | "writer" | "validating" | "retrying", label: string, completedSteps?: number, totalSteps?: number, attempt?: number, maxAttempts?: number) => session?.send({ type: "progress", task: "divergence", phase, label, completedSteps, totalSteps, attempt, maxAttempts });
  const sendMetadata = (provenance: GenerationProvenance) => {
    if (provenance.usage) session?.send({ type: "usage", task: "divergence", usage: provenance.usage });
    if (provenance.reasoning) session?.send({ type: "reasoning", task: "divergence", delta: provenance.reasoning, complete: true });
  };
  const selectedProviderEvents = {
    onContentDelta: (delta: string) => session?.send({ type: "output_delta" as const, task: "divergence" as const, characters: delta.length }),
    onReasoningDelta: (delta: string) => session?.send({ type: "reasoning" as const, task: "divergence" as const, delta }),
    onUsage: (usage: { inputTokens?: number; outputTokens?: number; reasoningTokens?: number }) => session?.send({ type: "usage" as const, task: "divergence" as const, usage }),
    onProviderActivity: () => session?.send({ type: "provider_activity" as const, task: "divergence" as const, at: Date.now() }),
  };
  const finishStream = (event: Parameters<NonNullable<typeof session>["finish"]>[0]) => {
    session?.finish(event);
    session?.dispose();
    requestLifecycle?.dispose();
  };
  try {
    const { sparkText, parse, canon, pushInstruction, settings } = req.body;
    if (!sparkText) {
      if (wantsStream) {
        finishStream({ type: "error", task: "divergence", message: "Missing sparkText" });
        return;
      }
      return res.status(400).json({ error: "Missing sparkText" });
    }

    let modelSelection: ModelSelection | null = null;
    try {
      modelSelection = resolveRequestedModelSelection(settings?.modelSelection);
    } catch (error) {
      if (wantsStream) {
        finishStream({ type: "error", task: "divergence", code: "INVALID_MODEL_SELECTION", message: error instanceof Error ? error.message : "Invalid model selection." });
        return;
      }
      return res.status(400).json({ code: "INVALID_MODEL_SELECTION", error: error instanceof Error ? error.message : "Invalid model selection." });
    }
    const ai = getAI();
    let takes: any[] | null = null;

    if (!ai && !modelSelection) {
      const failure = normalizeGenerationFailure(new ModelGatewayError("Choose a connection and model before generating.", "CREDENTIAL_MISSING", 401), { operation: "divergence" });
      if (wantsStream) {
        finishStream({ type: "error", task: "divergence", message: failure.message, code: failure.code, action: failure.action, retryable: failure.retryable, retryAfterMs: failure.retryAfterMs });
        return;
      }
      return sendGenerationFailure(res, failure, { operation: "divergence" });
    }

    // Determine thinking level from GenerationSettings
    const quality = settings?.quality || "Balanced";
    let thinkingLevel = ThinkingLevel.MEDIUM;
    if (quality === "Fast") thinkingLevel = ThinkingLevel.LOW;
    else if (quality === "Deep Craft") thinkingLevel = ThinkingLevel.HIGH;

    // Resolve Author Flavor
    let authorFlavorPrompt = "";
    let activeAuthorStrength: AuthorFlavorStrength | undefined;
    let manualAuthorId: AuthorId | undefined;
    let authorAssignments: Array<{ id: AuthorId; name: string; strength: AuthorFlavorStrength }> = [];

    const authorFlavor = settings?.authorFlavor;
    if (authorFlavor && (authorFlavor.mode || "").toLowerCase() !== "off") {
      const isOverdrive = Boolean(authorFlavor.overdrive || authorFlavor.overdriveEnabled);
      const rawStrength = (authorFlavor.strength || "sprinkle").toLowerCase();
      activeAuthorStrength = isOverdrive ? "Overdrive" : rawStrength === "strong" ? "Strong" : "Sprinkle";
      let authorId = authorFlavor.manualAuthor || authorFlavor.manualAuthorId;
      if ((authorFlavor.mode || "").toLowerCase() === "auto") authorId = undefined;
      if (authorId) {
        const profile = getAuthorProfile(authorId);
        if (profile) {
          manualAuthorId = authorId as AuthorId;
          authorFlavorPrompt = buildAuthorFlavorPrompt(authorId, activeAuthorStrength);
        }
      }
    }

    const divergenceModeGuidance = buildDivergenceModeGuidance(settings?.divergenceMode || "Exploratory");
    const sharedContext = buildSharedContext({ sparkText, parse, canon });

    if (ai || modelSelection) {
      try {
        if (quality === "Deep Craft") {
          // --- DEEP CRAFT 3-STAGE PIPELINE ---
          // Stage 1: Architect (propose 6 diverse candidate branches across possibility space)
          console.log("[Deep Craft] Stage 1: Architect proposing 6 diverse candidate branches...");
          sendProgress("architect", "Architect proposing six distinct branches", 0, 4);
          const architectPrompt = `${CREATIVE_CONSTITUTION_PROMPT}

${divergenceModeGuidance}

DIVERGENCE ARCHITECT:
Analyze the scenario premise and propose 6 structurally distinct candidate branches.
${sharedContext}
${pushInstruction ? `USER PUSH INSTRUCTION: "${pushInstruction}"` : ""}

UNIVERSAL POSSIBILITY SPACE DIMENSIONS TO EXPLORE:
${JSON.stringify(UNIVERSAL_DIMENSIONS, null, 2)}

DRAMATIC ENGINES CATALOG (Each candidate MUST use a DIFFERENT engine):
${JSON.stringify(DRAMATIC_ENGINES_CATALOG, null, 2)}

REQUIREMENTS:
- Propose 6 candidate branches that vary across at least 3 distinct dimensions (Scope, Stakes, Strangeness, Agency, Emotional Core, Structure).
- Every branch must protect the non-negotiables: ${JSON.stringify(parse?.nonNegotiables || [sparkText])}.
- Return strictly JSON with a "candidates" array of 6 items.`;

          const architectSchema = {
            type: Type.OBJECT,
            properties: {
              candidates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    index: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    primaryEngine: { type: Type.STRING },
                    conceptPitch: { type: Type.STRING },
                    variedDimensions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    whatChanged: { type: Type.STRING },
                  },
                  required: ["index", "title", "primaryEngine", "conceptPitch", "variedDimensions", "whatChanged"],
                },
              },
            },
            required: ["candidates"],
          };

          const architectResult = await executeGeminiWithRetry<{ candidates: any[] }>({
            ai,
            systemInstruction: CREATIVE_CONSTITUTION_PROMPT,
            userPrompt: architectPrompt,
            responseSchema: architectSchema,
            stageName: "Divergence Architect",
            sparkText,
            maxAttempts: 2,
            thinkingLevel: ThinkingLevel.HIGH,
            modelSelection,
            gateway: modelGateway,
            signal: requestLifecycle?.signal,
            onAttempt: (attempt, maxAttempts, stageName) => sendProgress(attempt > 1 ? "retrying" : "architect", attempt > 1 ? `Retrying ${stageName}` : stageName, 0, 4, attempt, maxAttempts),
            onMetadata: sendMetadata,
            ...selectedProviderEvents,
          });

          const candidates = architectResult?.candidates || [];
          if (!Array.isArray(candidates) || candidates.length < 6) {
            throw new ModelGatewayError("The Divergence architect returned fewer than six usable candidates.", "INVALID_STRUCTURED_OUTPUT", 502);
          }

          // Stage 2: Distinctiveness Critic & Selection
          console.log("[Deep Craft] Stage 2: Critic evaluating candidate branches for distinctiveness...");
          sendProgress("critic", "Critic comparing branch distinctiveness", 1, 4);
          const criticPrompt = `${DISTINCTIVENESS_CRITIC_PROMPT}

PREMISE: "${sparkText}"
NON-NEGOTIABLES: ${JSON.stringify(parse?.nonNegotiables || [sparkText])}
REGISTER WORDS: ${JSON.stringify(parse?.registerWords || [])}

PROPOSED 6 CANDIDATE BRANCHES:
${JSON.stringify(candidates, null, 2)}

TASK:
1. Audit for overlap: Are any candidates using identical dramatic mechanisms?
2. Audit for genre pull: Did any branch introduce unrequested clichés or legacy bias?
3. Select the 4 most distinct, highest-contrast candidates.
4. Return strictly JSON with "selectedIndices" (array of 4 distinct integers) and "criticNotes".`;

          const criticSchema = {
            type: Type.OBJECT,
            properties: {
              selectedIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              criticNotes: { type: Type.STRING },
            },
            required: ["selectedIndices", "criticNotes"],
          };

          const criticResult = await executeGeminiWithRetry<{ selectedIndices: number[]; criticNotes: string }>({
            ai,
            systemInstruction: CREATIVE_CONSTITUTION_PROMPT,
            userPrompt: criticPrompt,
            responseSchema: criticSchema,
            stageName: "Divergence Critic",
            sparkText,
            maxAttempts: 2,
            thinkingLevel: ThinkingLevel.HIGH,
            modelSelection,
            gateway: modelGateway,
            signal: requestLifecycle?.signal,
            onAttempt: (attempt, maxAttempts, stageName) => sendProgress(attempt > 1 ? "retrying" : "critic", attempt > 1 ? `Retrying ${stageName}` : stageName, 1, 4, attempt, maxAttempts),
            onMetadata: sendMetadata,
            ...selectedProviderEvents,
          });

          const chosenIndices = criticResult?.selectedIndices;
          if (!Array.isArray(chosenIndices) || new Set(chosenIndices).size !== 4) {
            throw new ModelGatewayError("The Divergence critic did not select four distinct candidates.", "INVALID_STRUCTURED_OUTPUT", 502);
          }
          const selectedCandidates = candidates.filter((c) => chosenIndices.includes(c.index)).slice(0, 4);
          if (selectedCandidates.length < 4) {
            selectedCandidates.push(...candidates.filter((c) => !chosenIndices.includes(c.index)).slice(0, 4 - selectedCandidates.length));
          }

          const flavorMode = (authorFlavor?.mode || "off").toLowerCase();
          if (flavorMode === "auto") {
            const ids = selectAutoAuthorsForBranches(
              selectedCandidates,
              { primary: parse?.corePromise || sparkText, descriptors: parse?.registerWords || parse?.tonalRegisters || [] },
              String(authorFlavor?.autoBehavior || "compatible").toLowerCase() === "wildcard" ? "Wildcard" : "Compatible",
            );
            authorAssignments = ids.map((id) => ({ id, name: getAuthorProfile(id)?.name || id, strength: activeAuthorStrength || "Sprinkle" }));
          } else if (manualAuthorId) {
            authorAssignments = selectedCandidates.map(() => ({ id: manualAuthorId!, name: getAuthorProfile(manualAuthorId)?.name || manualAuthorId!, strength: activeAuthorStrength || "Sprinkle" }));
          }
          const branchFlavorInstructions = authorAssignments.map((assignment, index) => `BRANCH ${index + 1} (${selectedCandidates[index]?.title || "selected branch"}):\n${buildAuthorFlavorPrompt(assignment.id, assignment.strength)}`).join("\n");

          // Stage 3: Writer (Flesh out the 4 selected branches into full Divergence cards)
          console.log("[Deep Craft] Stage 3: Writer drafting finalized Divergence cards...");
          sendProgress("writer", "Writer drafting four divergence cards", 2, 4);
          const writerPrompt = `${CREATIVE_CONSTITUTION_PROMPT}

${divergenceModeGuidance}

${branchFlavorInstructions}

DIVERGENCE WRITER:
Flesh out the following 4 selected scenario branches into rich Divergence cards.
${sharedContext}
CRITIC NOTES: "${criticResult?.criticNotes || "Ensure high conceptual distance."}"

SELECTED BRANCHES:
${JSON.stringify(selectedCandidates, null, 2)}

REQUIREMENTS FOR EACH TAKE:
1. THE PITCH: A single loaded sentence that could ONLY be written about this exact world.
2. TITLE: Evocative, specific, distinct.
3. WHAT'S STRANGE: Emerge organically from the premise rules.
4. GENRE/TONE: Evocative label honoring register (${JSON.stringify(parse?.registerWords || [])}).
5. PRIMARY ENGINE: The dramatic engine governing this branch.
6. WHAT CHANGED: Exactly what assumption or dimension was reframed.
7. WHAT PROTECTED: The non-negotiables kept fully intact.

Return strictly JSON with the "takes" array containing 4 items.`;

          const cardSchema = {
            type: Type.OBJECT,
            properties: {
              takes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    pitch: { type: Type.STRING },
                    genreTone: { type: Type.STRING },
                    whatsStrange: { type: Type.STRING },
                    angle: { type: Type.STRING },
                    retainedNonNegotiables: { type: Type.ARRAY, items: { type: Type.STRING } },
                    primaryEngine: { type: Type.STRING },
                    whatChanged: { type: Type.STRING },
                    whatProtected: { type: Type.STRING },
                  },
                  required: ["id", "title", "pitch", "genreTone", "whatsStrange", "angle", "retainedNonNegotiables"],
                },
              },
            },
            required: ["takes"],
          };

          const writerResult = await executeGeminiWithRetry<{ takes: any[] }>({
            ai,
            systemInstruction: CREATIVE_CONSTITUTION_PROMPT,
            userPrompt: writerPrompt,
            responseSchema: cardSchema,
            stageName: "Divergence Writer",
            sparkText,
            maxAttempts: 2,
            thinkingLevel: ThinkingLevel.HIGH,
            modelSelection,
            gateway: modelGateway,
            signal: requestLifecycle?.signal,
            onAttempt: (attempt, maxAttempts, stageName) => sendProgress(attempt > 1 ? "retrying" : "writer", attempt > 1 ? `Retrying ${stageName}` : stageName, 2, 4, attempt, maxAttempts),
            onMetadata: sendMetadata,
            ...selectedProviderEvents,
          });

          if (writerResult && Array.isArray(writerResult.takes) && writerResult.takes.length > 0) {
            takes = writerResult.takes;
          }
        } else {
          // --- FAST / BALANCED STREAMLINED GENERATION ---
          sendProgress("writer", "Generating four divergence angles", 0, 1);
          const flavorMode = (authorFlavor?.mode || "off").toLowerCase();
          if (flavorMode === "auto") {
            const placeholderBranches = ["psychological", "systemic", "strange", "structural"].map((primaryEngine) => ({ primaryEngine }));
            authorAssignments = selectAutoAuthorsForBranches(
              placeholderBranches,
              { primary: parse?.corePromise || sparkText, descriptors: parse?.registerWords || parse?.tonalRegisters || [] },
              String(authorFlavor?.autoBehavior || "compatible").toLowerCase() === "wildcard" ? "Wildcard" : "Compatible",
            ).map((id) => ({ id, name: getAuthorProfile(id)?.name || id, strength: activeAuthorStrength || "Sprinkle" }));
            authorFlavorPrompt = authorAssignments.map((assignment, index) => `TAKE ${index + 1}:\n${buildAuthorFlavorPrompt(assignment.id, assignment.strength)}`).join("\n");
          } else if (manualAuthorId) {
            authorAssignments = Array.from({ length: 4 }, () => ({ id: manualAuthorId!, name: getAuthorProfile(manualAuthorId)?.name || manualAuthorId!, strength: activeAuthorStrength || "Sprinkle" }));
          }
          const prompt = `${CREATIVE_CONSTITUTION_PROMPT}

${divergenceModeGuidance}

${authorFlavorPrompt}

DIVERGENCE GENERATOR: Generate four competing premise angles for this scenario.
${sharedContext}
${pushInstruction ? `\nSPECIAL USER PUSH INSTRUCTION: "${pushInstruction}"` : ""}

UNIVERSAL POSSIBILITY SPACE:
Vary the four takes across diverse dimensions (Scope, Stakes, Strangeness, Agency, Emotional Core, Structure).
Select 4 DIFFERENT dramatic engines from:
${DRAMATIC_ENGINES_CATALOG.map((e) => `- ${e}`).join("\n")}

REQUIREMENTS FOR EACH TAKE:
1. THE PITCH: A single loaded sentence that could ONLY be written about this exact world.
2. ANGLE: A unique, descriptive angle label derived from its dramatic engine (e.g. "Material Scarcity", "Institutional Lie", "Subversive Inversion", "Intimate Chamber Crucible").
3. WHAT'S STRANGE: Emerge naturally from the scenario's native rules.
4. GENRE TONE: Honor the user's register words (${JSON.stringify(parse?.registerWords || [])}).
5. WHAT CHANGED / WHAT PROTECTED: Detail what dimension was reframed vs what core promise was protected.

Emit strictly valid JSON matching the schema with 4 takes in the "takes" array.`;

          const divergenceSchema = {
            type: Type.OBJECT,
            properties: {
              takes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    pitch: { type: Type.STRING },
                    genreTone: { type: Type.STRING },
                    whatsStrange: { type: Type.STRING },
                    angle: { type: Type.STRING },
                    retainedNonNegotiables: { type: Type.ARRAY, items: { type: Type.STRING } },
                    primaryEngine: { type: Type.STRING },
                    whatChanged: { type: Type.STRING },
                    whatProtected: { type: Type.STRING },
                  },
                  required: ["id", "title", "pitch", "genreTone", "whatsStrange", "angle", "retainedNonNegotiables"],
                },
              },
            },
            required: ["takes"],
          };

          const result = await executeGeminiWithRetry<{ takes: any[] }>({
            ai,
            systemInstruction: CREATIVE_CONSTITUTION_PROMPT,
            userPrompt: prompt,
            responseSchema: divergenceSchema,
            stageName: "Divergence",
            sparkText,
            maxAttempts: 2,
            thinkingLevel,
            modelSelection,
            gateway: modelGateway,
            signal: requestLifecycle?.signal,
            onAttempt: (attempt, maxAttempts, stageName) => sendProgress(attempt > 1 ? "retrying" : "writer", attempt > 1 ? `Retrying ${stageName}` : stageName, 0, 1, attempt, maxAttempts),
            onMetadata: sendMetadata,
            ...selectedProviderEvents,
          });

          if (result && Array.isArray(result.takes) && result.takes.length > 0) {
            takes = result.takes;
          }
        }
      } catch (modelErr: any) {
        if (requestLifecycle?.signal.aborted || (modelErr instanceof ModelGatewayError && modelErr.code === "CLIENT_DISCONNECTED")) {
          finishStream({ type: "cancelled", task: "divergence", message: "Generation stopped." });
          return;
        }
        console.warn("[Divergence Model Call Error]:", modelErr?.message || modelErr);
        const failure = normalizeGenerationFailure(modelErr, { operation: "divergence" });
        if (wantsStream) {
          finishStream({ type: "error", task: "divergence", message: failure.message, code: failure.code, action: failure.action, retryable: failure.retryable, retryAfterMs: failure.retryAfterMs });
          return;
        }
        return sendGenerationFailure(res, modelErr, { operation: "divergence" });
      }
    }

    if (!takes || takes.length === 0) {
      const failure = normalizeGenerationFailure(new ModelGatewayError("The selected model returned no usable Divergence angles.", "INVALID_STRUCTURED_OUTPUT", 502), { operation: "divergence" });
      if (wantsStream) {
        finishStream({ type: "error", task: "divergence", message: failure.message, code: failure.code, action: failure.action, retryable: failure.retryable });
        return;
      }
      return sendGenerationFailure(res, failure, { operation: "divergence" });
    }

    sendProgress("validating", "Validating and publishing angles", quality === "Deep Craft" ? 3 : 0, quality === "Deep Craft" ? 4 : 1);
    const sanitizedTakes = takes.map((t, idx) => ({
      ...t,
      id: t.id || `take-${Date.now()}-${idx}`,
      angle: cleanAngleLabel(t.angle, idx),
      authorFlavorId: authorAssignments[idx]?.id || t.authorFlavorId,
      authorFlavorName: authorAssignments[idx]?.name || t.authorFlavorName,
      authorFlavorStrength: authorAssignments[idx]?.strength || t.authorFlavorStrength,
    }));

    if (wantsStream) {
      finishStream({ type: "done", task: "divergence", result: { takes: sanitizedTakes } });
      return;
    }
    return res.json({ takes: sanitizedTakes });
  } catch (err: any) {
    if (requestLifecycle?.signal.aborted) {
      finishStream({ type: "cancelled", task: "divergence", message: "Generation stopped." });
      return;
    }
    console.error("Divergence endpoint error:", err);
    if (wantsStream) {
      finishStream({ type: "error", task: "divergence", message: cleanErrorMessage(err) });
      return;
    }
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 2b. Single Angle Divergence endpoint (Supports semantic rerolls: reimagine / mutate / push_further)
app.post("/api/divergence-single", async (req, res) => {
  try {
    const {
      sparkText,
      parse,
      canon,
      targetAngle,
      currentTake,
      steerInstruction,
      rerollType = "reimagine",
      settings,
      authorFlavorId,
      authorFlavorStrength,
    } = req.body;

    if (!sparkText) {
      return res.status(400).json({ error: "Missing sparkText" });
    }

    let modelSelection: ModelSelection | null = null;
    try {
      modelSelection = resolveRequestedModelSelection(settings?.modelSelection);
    } catch (error) {
      return res.status(400).json({ code: "INVALID_MODEL_SELECTION", error: error instanceof Error ? error.message : "Invalid model selection." });
    }
    const ai = getAI();
    let take: any | null = null;
    if (!ai && !modelSelection) {
      return sendGenerationFailure(res, new ModelGatewayError("Choose a connection and model before generating.", "CREDENTIAL_MISSING", 401), { operation: "divergence-single" });
    }
    const angleCategory = targetAngle || currentTake?.angle || "Dynamic Angle";

    const semanticGuidance = buildSemanticRerollGuidance(rerollType, currentTake);

    let authorPrompt = "";
    const activeAuthor = authorFlavorId || settings?.authorFlavor?.manualAuthor || settings?.authorFlavor?.manualAuthorId;
    if (activeAuthor) {
      const isOverdrive = Boolean(settings?.authorFlavor?.overdrive || settings?.authorFlavor?.overdriveEnabled);
      const rawStrength = (authorFlavorStrength || settings?.authorFlavor?.strength || "sprinkle").toLowerCase();
      const strengthVal: AuthorFlavorStrength = isOverdrive
        ? "Overdrive"
        : rawStrength === "strong"
        ? "Strong"
        : "Sprinkle";
      authorPrompt = buildAuthorFlavorPrompt(activeAuthor, strengthVal);
    }

    if (ai || modelSelection) {
      try {
        const sharedContext = buildSharedContext({ sparkText, parse, canon });
        const prompt = `${CREATIVE_CONSTITUTION_PROMPT}

${authorPrompt}

DIVERGENCE SINGLE-ANGLE GENERATOR:
Generate or recalibrate a single premise angle for this scenario.
${sharedContext}
TARGET ANGLE: "${angleCategory}"
${currentTake ? `CURRENT DRAFT:\nTitle: ${currentTake.title}\nPitch: ${currentTake.pitch}\nWhat's strange: ${currentTake.whatsStrange}\nGenre/Tone: ${currentTake.genreTone}\nEngine: ${currentTake.primaryEngine || ""}` : ""}

SEMANTIC REROLL TYPE: ${rerollType.toUpperCase()}
${semanticGuidance}

${steerInstruction ? `USER STEER INSTRUCTION: "${steerInstruction}"` : ""}

REQUIREMENTS:
1. THE PITCH: A single loaded sentence that could ONLY be written about this exact world. Fresh, specific, compelling.
2. Maintain strict non-negotiables: ${JSON.stringify(parse?.nonNegotiables || [sparkText])}.
3. Honor the register words: ${JSON.stringify(parse?.registerWords || [])}.
4. Emit strictly valid JSON matching the single "take" schema.`;

        const singleSchema = {
          type: Type.OBJECT,
          properties: {
            take: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                pitch: { type: Type.STRING },
                genreTone: { type: Type.STRING },
                whatsStrange: { type: Type.STRING },
                angle: { type: Type.STRING },
                retainedNonNegotiables: { type: Type.ARRAY, items: { type: Type.STRING } },
                primaryEngine: { type: Type.STRING },
                whatChanged: { type: Type.STRING },
                whatProtected: { type: Type.STRING },
              },
              required: ["id", "title", "pitch", "genreTone", "whatsStrange", "angle", "retainedNonNegotiables"],
            },
          },
          required: ["take"],
        };

        const result = await executeGeminiWithRetry<{ take: any }>({
          ai,
          systemInstruction: CREATIVE_CONSTITUTION_PROMPT,
          userPrompt: prompt,
          responseSchema: singleSchema,
          stageName: `Divergence Single (${rerollType})`,
          sparkText,
          maxAttempts: 2,
          thinkingLevel: ThinkingLevel.MEDIUM,
          modelSelection,
          gateway: modelGateway,
        });

        if (result && result.take && result.take.title) {
          take = result.take;
          if (!take.id) take.id = `take-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          take.angle = angleCategory;
          if (activeAuthor) {
            const prof = getAuthorProfile(activeAuthor);
            take.authorFlavorName = prof?.name;
            take.authorFlavorStrength = authorFlavorStrength || "sprinkle";
          }
        }
      } catch (modelErr: any) {
        console.warn("[Divergence Single Model Call Error]:", modelErr?.message || modelErr);
        return sendGenerationFailure(res, modelErr, { operation: "divergence-single" });
      }
    }

    if (!take) {
      return sendGenerationFailure(res, new ModelGatewayError("The selected model returned no usable Divergence angle.", "INVALID_STRUCTURED_OUTPUT", 502), { operation: "divergence-single" });
    }

    return res.json({
      take: {
        ...take,
        angle: cleanAngleLabel(take.angle),
      },
    });
  } catch (err: any) {
    console.error("Divergence single unhandled error:", err);
    return sendGenerationFailure(res, err, { operation: "divergence-single" });
  }
});

// 3. Document Forge endpoint (Sequential 6-Bundle Generation over SSE)
app.post("/api/forge", async (req, res) => {
  const { sparkText, parse, canon, physics, chosenTake, settings } = req.body;
  const requestLifecycle = createRequestAbortSignal(req, res);
  const session = createSseSession(res, "forge");
  session.startHeartbeat();
  const cleanup = () => { session.dispose(); requestLifecycle.dispose(); };
  const sendEvent = (event: string, data: any) => {
    if (event === "section") session.send({ type: "section", task: "forge", key: data.key, data: data.data });
    else if (event === "log") session.send({ type: "progress", task: "forge", phase: data.status === "done" ? "validating" : data.stage === "init" ? "requesting" : "forge_bundle", label: data.label });
    else if (event === "done") { session.finish({ type: "done", task: "forge", result: data }); cleanup(); }
    else if (event === "error") { session.finish({ type: "error", task: "forge", message: data.message || "Forge generation failed.", code: data.code, action: data.action, retryable: data.retryable, retryAfterMs: data.retryAfterMs }); cleanup(); }
  };

  let modelSelection: ModelSelection | null = null;
  try {
    modelSelection = resolveRequestedModelSelection(settings?.modelSelection);
  } catch (error) {
    sendEvent("error", { stage: "Initialization", code: "INVALID_MODEL_SELECTION", message: error instanceof Error ? error.message : "Invalid model selection." });
    return res.end();
  }

  const ai = getAI();
  if (!ai && !modelSelection) {
    const failure = normalizeGenerationFailure(new ModelGatewayError("Choose a connection and model before generating.", "CREDENTIAL_MISSING", 401), { operation: "forge" });
    sendEvent("error", failure);
    return;
  }

  sendEvent("log", { stage: "init", label: "Reading the spark and canonical registers…", status: "active" });

  const doc: Record<string, any> = {
    id: "doc-" + Date.now(),
    title: chosenTake?.title || "Scenario Seed Document",
    sparkText,
    parse,
    canon,
    physics,
    chosenTake,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Specific, strongly-typed Entry Schemas so Gemini generates full prose fields instead of empty objects {}
  const ruleEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          rule: { type: Type.STRING },
          profits: { type: Type.STRING },
          pays: { type: Type.STRING },
        },
        required: ["rule", "profits", "pays"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
    },
    required: ["id", "fields", "keys", "permanence", "locked"],
  };

  const locationEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          function: { type: Type.STRING },
          mood: { type: Type.STRING },
          whatsWrong: { type: Type.STRING },
        },
        required: ["name", "function", "mood", "whatsWrong"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
    },
    required: ["id", "fields", "keys", "permanence", "locked"],
  };

  const factionEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          publicFace: { type: Type.STRING },
          trueAgenda: { type: Type.STRING },
          independentWant: { type: Type.STRING },
          stanceTowardUser: { type: Type.STRING },
        },
        required: ["name", "publicFace", "trueAgenda", "independentWant", "stanceTowardUser"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
    },
    required: ["id", "fields", "keys", "permanence", "locked"],
  };

  const npcEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          wants: { type: Type.STRING },
          body: { type: Type.STRING },
          voice: { type: Type.STRING },
          notDefault: { type: Type.STRING },
          holds: { type: Type.STRING },
          connection: { type: Type.STRING },
        },
        required: ["name", "role", "wants", "body", "voice", "notDefault", "holds", "connection"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
    },
    required: ["id", "fields", "keys", "permanence", "locked"],
  };

  const relationshipEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          source: { type: Type.STRING },
          target: { type: Type.STRING },
          bond: { type: Type.STRING },
          pressure: { type: Type.STRING },
          relation: { type: Type.STRING },
        },
        required: ["source", "target", "bond", "pressure"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
    },
    required: ["id", "fields", "permanence", "locked"],
  };

  const knowledgeEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          truth: { type: Type.STRING },
          knows: { type: Type.STRING },
          suspects: { type: Type.STRING },
          surfacesWhen: { type: Type.STRING },
        },
        required: ["truth", "knows", "suspects", "surfacesWhen"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
    },
    required: ["id", "fields", "permanence", "locked"],
  };

  const itemEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          whatItDoes: { type: Type.STRING },
          costOrLimit: { type: Type.STRING },
          unfiredGun: { type: Type.STRING },
        },
        required: ["name", "whatItDoes", "costOrLimit", "unfiredGun"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
    },
    required: ["id", "fields", "keys", "permanence", "locked"],
  };

  const secretEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          truth: { type: Type.STRING },
          whoKeepsIt: { type: Type.STRING },
          howKept: { type: Type.STRING },
          discoveryTrigger: { type: Type.STRING },
          whatItChanges: { type: Type.STRING },
        },
        required: ["truth", "whoKeepsIt", "howKept", "discoveryTrigger", "whatItChanges"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
      disabledUntilEarned: { type: Type.BOOLEAN, nullable: true },
    },
    required: ["id", "fields", "keys", "permanence", "locked"],
  };

  const historyEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          event: { type: Type.STRING },
          era: { type: Type.STRING },
          consequence: { type: Type.STRING },
        },
        required: ["event", "era", "consequence"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
    },
    required: ["id", "fields", "keys", "permanence", "locked"],
  };

  const pressureEntrySchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      fields: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          force: { type: Type.STRING },
          scope: { type: Type.STRING },
          clock: { type: Type.STRING },
        },
        required: ["name", "force", "scope", "clock"],
      },
      keys: { type: Type.ARRAY, items: { type: Type.STRING } },
      permanence: { type: Type.STRING },
      locked: { type: Type.BOOLEAN },
    },
    required: ["id", "fields", "keys", "permanence", "locked"],
  };

  // Define the 6 Bundles with their respective schemas and prompts
  const bundles = [
    {
      name: "Bundle 1: Core, User, World Physics, and Status",
      keys: ["core", "user", "worldPhysics", "status"],
      includeExample: true, // Only Bundle 1 receives the quarantined format example
      schema: {
        type: Type.OBJECT,
        properties: {
          core: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              pitch: { type: Type.STRING },
              genreTone: { type: Type.STRING },
              eraScale: { type: Type.STRING },
              theRule: { type: Type.STRING },
              theCost: { type: Type.STRING },
              theSituation: { type: Type.STRING },
              thePressure: { type: Type.STRING },
              theQuestion: { type: Type.STRING },
              permanence: { type: Type.STRING },
            },
            required: ["title", "pitch", "genreTone", "eraScale", "theRule", "theCost", "theSituation", "thePressure", "theQuestion", "permanence"],
          },
          user: {
            type: Type.OBJECT,
            properties: {
              rolePosition: { type: Type.STRING },
              startsWith: { type: Type.STRING },
              wants: { type: Type.STRING },
              fears: { type: Type.STRING },
              hookPull: { type: Type.STRING },
              hookPush: { type: Type.STRING },
              hookTrap: { type: Type.STRING },
              permanence: { type: Type.STRING },
            },
            required: ["rolePosition", "startsWith", "wants", "fears", "hookPull", "hookPush", "hookTrap", "permanence"],
          },
          worldPhysics: {
            type: Type.OBJECT,
            properties: {
              rules: { type: Type.ARRAY, items: ruleEntrySchema },
              authorityCheck: { type: Type.STRING },
              powerCeiling: { type: Type.STRING },
              faultLines: { type: Type.ARRAY, items: { type: Type.STRING } },
              permanence: { type: Type.STRING },
            },
            required: ["rules", "authorityCheck", "powerCeiling", "faultLines", "permanence"],
          },
          status: {
            type: Type.OBJECT,
            properties: {
              content: { type: Type.STRING },
              settings: { type: Type.STRING },
              permanence: { type: Type.STRING },
            },
            required: ["content", "settings", "permanence"],
          },
        },
        required: ["core", "user", "worldPhysics", "status"],
      },
      promptModifier: "Generate BUNDLE 1: [core, user, worldPhysics, status]. Define the unglamorous mechanics, costs, pressures, and status block at depth 4. Player character is {{user}}. Make sure every rule entry has rule, profits, and pays fully written.",
    },
    {
      name: "Bundle 2: Locations and Factions",
      keys: ["locations", "factions"],
      includeExample: false,
      schema: {
        type: Type.OBJECT,
        properties: {
          locations: { type: Type.ARRAY, items: locationEntrySchema },
          factions: { type: Type.ARRAY, items: factionEntrySchema },
        },
        required: ["locations", "factions"],
      },
      promptModifier: "Generate BUNDLE 2: [locations, factions]. Locations must include sensory textures, function, mood, and whatsWrong with distinctive lorebook KEYS.\nCONDITIONAL OMISSION FOR FACTIONS: If this scenario does NOT have distinct factions or formal organizations (e.g. an intimate domestic drama, psychological survival, or two-person isolation story), return an EMPTY ARRAY [] for factions! If factions do exist, write all required fields in full. Never return empty fields.",
    },
    {
      name: "Bundle 3: NPCs, Relationship Web, and Knowledge Map",
      keys: ["npcs", "relationshipWeb", "knowledgeMap"],
      includeExample: false,
      schema: {
        type: Type.OBJECT,
        properties: {
          npcs: { type: Type.ARRAY, items: npcEntrySchema },
          relationshipWeb: { type: Type.ARRAY, items: relationshipEntrySchema },
          knowledgeMap: { type: Type.ARRAY, items: knowledgeEntrySchema },
        },
        required: ["npcs", "relationshipWeb", "knowledgeMap"],
      },
      promptModifier: "Generate BUNDLE 3: [npcs, relationshipWeb, knowledgeMap]. Every NPC must have name, role, wants, body, voice, notDefault, holds, connection. Trace debts/grudges in relationshipWeb and surface triggers in knowledgeMap. Never return empty fields.",
    },
    {
      name: "Bundle 4: Items, Secrets, Conflict, and Pressure Protocol",
      keys: ["items", "secrets", "conflict", "pressureProtocol"],
      includeExample: false,
      schema: {
        type: Type.OBJECT,
        properties: {
          items: { type: Type.ARRAY, items: itemEntrySchema },
          secrets: { type: Type.ARRAY, items: secretEntrySchema },
          conflict: {
            type: Type.OBJECT,
            properties: {
              central: { type: Type.STRING },
              opposition: { type: Type.STRING },
              stakesBad: { type: Type.STRING },
              stakesAcceptable: { type: Type.STRING },
              clock: { type: Type.STRING },
              moralKnot: { type: Type.STRING },
              theYield: { type: Type.STRING },
              speedBumps: { type: Type.ARRAY, items: { type: Type.STRING } },
              permanence: { type: Type.STRING },
            },
            required: ["central", "opposition", "stakesBad", "stakesAcceptable", "clock", "moralKnot", "theYield", "speedBumps", "permanence"],
          },
          pressureProtocol: { type: Type.STRING },
        },
        required: ["items", "secrets", "conflict", "pressureProtocol"],
      },
      promptModifier: "Generate BUNDLE 4: [items, secrets, conflict, pressureProtocol].\nCONDITIONAL OMISSION FOR ITEMS: If this scenario does not involve distinctive special equipment, relics, or abilities, return an EMPTY ARRAY [] for items! Secrets must have discovery triggers and whatItChanges. Define central clock and speed bumps in conflict. Fill all fields completely.",
    },
    {
      name: "Bundle 5: History, Aesthetic, Naming, and Pressures",
      keys: ["history", "aesthetic", "naming", "pressures"],
      includeExample: false,
      schema: {
        type: Type.OBJECT,
        properties: {
          history: { type: Type.ARRAY, items: historyEntrySchema },
          aesthetic: {
            type: Type.OBJECT,
            properties: {
              colors: { type: Type.ARRAY, items: { type: Type.STRING } },
              sounds: { type: Type.ARRAY, items: { type: Type.STRING } },
              smells: { type: Type.ARRAY, items: { type: Type.STRING } },
              weather: { type: Type.STRING },
              visualMotifs: { type: Type.ARRAY, items: { type: Type.STRING } },
              fashion: { type: Type.STRING },
              touchstones: { type: Type.ARRAY, items: { type: Type.STRING } },
              permanence: { type: Type.STRING },
            },
            required: ["colors", "sounds", "smells", "weather", "visualMotifs", "fashion", "touchstones", "permanence"],
          },
          naming: {
            type: Type.OBJECT,
            properties: {
              linguisticBase: { type: Type.STRING },
              commonNames: { type: Type.ARRAY, items: { type: Type.STRING } },
              eliteNames: { type: Type.ARRAY, items: { type: Type.STRING } },
              placeNamePattern: { type: Type.STRING },
              permanence: { type: Type.STRING },
            },
            required: ["linguisticBase", "commonNames", "eliteNames", "placeNamePattern", "permanence"],
          },
          pressures: { type: Type.ARRAY, items: pressureEntrySchema },
        },
        required: ["history", "aesthetic", "naming", "pressures"],
      },
      promptModifier: "Generate BUNDLE 5: [history, aesthetic, naming, pressures]. Provide sensory textures, naming phonology fitting the world, and background pressures moving independently.",
    },
    {
      name: "Bundle 6: Procedural Rolls, Opening Scene, Expansion Notes, Anti-Gravity, and Build Notes",
      keys: ["proceduralRolls", "opening", "expansionNotes", "antiGravity", "buildNotes"],
      includeExample: false,
      schema: {
        type: Type.OBJECT,
        properties: {
          proceduralRolls: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                triggerKeys: { type: Type.ARRAY, items: { type: Type.STRING } },
                settings: { type: Type.STRING },
                entries: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      weight: { type: Type.NUMBER },
                      outcome: { type: Type.STRING },
                    },
                    required: ["id", "weight", "outcome"],
                  },
                },
              },
              required: ["id", "name", "triggerKeys", "settings", "entries"],
            },
          },
          opening: {
            type: Type.OBJECT,
            properties: {
              firstLocation: { type: Type.STRING },
              firstNpc: { type: Type.STRING },
              firstChoice: { type: Type.STRING },
              style: { type: Type.STRING },
              firstMessage: { type: Type.STRING },
              permanence: { type: Type.STRING },
            },
            required: ["firstLocation", "firstNpc", "firstChoice", "style", "firstMessage", "permanence"],
          },
          expansionNotes: {
            type: Type.OBJECT,
            properties: {
              explicit: { type: Type.STRING },
              violence: { type: Type.STRING },
              horror: { type: Type.STRING },
              romance: { type: Type.STRING },
              humor: { type: Type.STRING },
              pacing: { type: Type.STRING },
              playerDeath: { type: Type.STRING },
              contentFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
              allCharactersAdult: { type: Type.BOOLEAN },
              permanence: { type: Type.STRING },
            },
            required: ["explicit", "violence", "horror", "romance", "humor", "pacing", "playerDeath", "contentFlags", "allCharactersAdult", "permanence"],
          },
          antiGravity: {
            type: Type.OBJECT,
            properties: {
              temptations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    temptation: { type: Type.STRING },
                    counter: { type: Type.STRING },
                  },
                  required: ["temptation", "counter"],
                },
              },
              permanence: { type: Type.STRING },
            },
            required: ["temptations", "permanence"],
          },
          buildNotes: {
            type: Type.OBJECT,
            properties: {
              permanenceRouting: { type: Type.STRING },
              orderBands: { type: Type.STRING },
              disabledUntilEarnedList: { type: Type.ARRAY, items: { type: Type.STRING } },
              formatMatch: { type: Type.STRING },
              permanence: { type: Type.STRING },
            },
            required: ["permanenceRouting", "orderBands", "disabledUntilEarnedList", "formatMatch", "permanence"],
          },
        },
        required: ["proceduralRolls", "opening", "expansionNotes", "antiGravity", "buildNotes"],
      },
      promptModifier: "Generate BUNDLE 6: [proceduralRolls, opening, expansionNotes, antiGravity, buildNotes]. Opening message must begin mid-action, ~150 words, dialogue in quotes, never acting for {{user}}. Anti-gravity counters against model-voice, convenience, and protagonist gravity.",
    },
  ];

  function sanitizeSectionEntries(sectionKey: string, entries: any[]): any[] {
    if (!Array.isArray(entries)) return [];
    if (entries.length === 0) return [];
    const requiredFields: Record<string, string[]> = {
      rules: ["rule", "profits", "pays"], locations: ["name", "function", "mood", "whatsWrong"],
      factions: ["name", "publicFace", "trueAgenda", "independentWant", "stanceTowardUser"],
      npcs: ["name", "role", "wants", "body", "voice", "notDefault", "holds", "connection"],
      relationshipWeb: ["source", "target", "bond", "pressure", "relation"],
      knowledgeMap: ["truth", "knows", "suspects", "surfacesWhen"],
      items: ["name", "whatItDoes", "costOrLimit", "unfiredGun"],
      secrets: ["truth", "whoKeepsIt", "howKept", "discoveryTrigger", "whatItChanges"],
      history: ["event", "era", "consequence"], pressures: ["name", "force", "scope", "clock"],
    };
    return entries.map((entry, idx) => {
      if (!entry || typeof entry !== "object" || !entry.fields || typeof entry.fields !== "object") {
        throw new ModelGatewayError(`${sectionKey} entry ${idx + 1} is malformed.`, "INVALID_STRUCTURED_OUTPUT", 502);
      }
      const missing = (requiredFields[sectionKey] || []).filter((field) => typeof entry.fields[field] !== "string" || !entry.fields[field].trim());
      if (missing.length > 0 || !Array.isArray(entry.keys) || entry.keys.length === 0) {
        throw new ModelGatewayError(`${sectionKey} entry ${idx + 1} is missing required content.`, "INVALID_STRUCTURED_OUTPUT", 502);
      }
      return { ...entry, id: entry.id || `${sectionKey}-${idx + 1}`, locked: Boolean(entry.locked) };
    });
  }

  try {
    for (let i = 0; i < bundles.length; i++) {
      const bundle = bundles[i];
      session.send({ type: "progress", task: "forge", phase: "forge_bundle", label: `Forging bundle ${i + 1} of ${bundles.length}: ${bundle.name}`, completedSteps: i, totalSteps: bundles.length });
      sendEvent("log", {
        stage: bundle.keys[0],
        label: `Forging ${bundle.name}…`,
        status: "active",
      });

      // Build context incorporating previously established sections
      const context = buildSharedContext({
        sparkText,
        parse,
        canon,
        chosenTake,
        physics,
        existingDoc: doc,
      });

      const systemInstruction = bundle.includeExample
        ? `${GENERATOR_RULES}\n\n${FORMAT_EXAMPLE}`
        : GENERATOR_RULES;

      const userPrompt = `FORGE STEP (${bundle.name}):
${context}

${bundle.promptModifier}

Adhere strictly to all system constraints: no trope labels, no negations in seed content, loaded one-liners only, zero contamination.
Emit strictly valid JSON matching the schema for this bundle.`;

      let bundleResult: Record<string, any> | null = null;
      try {
        bundleResult = await executeGeminiWithRetry<Record<string, any>>({
          ai,
          systemInstruction,
          userPrompt,
          responseSchema: bundle.schema,
          stageName: bundle.name,
          sparkText,
          maxAttempts: 3,
          modelSelection,
          gateway: modelGateway,
          signal: requestLifecycle.signal,
          onAttempt: (attempt, maxAttempts, stageName) => session.send({ type: "progress", task: "forge", phase: attempt > 1 ? "retrying" : "forge_bundle", label: attempt > 1 ? `Retrying ${stageName}` : `Waiting for ${stageName}`, completedSteps: i, totalSteps: bundles.length, attempt, maxAttempts }),
          onMetadata: (provenance) => {
            if (provenance.usage) session.send({ type: "usage", task: "forge", usage: provenance.usage });
            if (provenance.reasoning) session.send({ type: "reasoning", task: "forge", delta: provenance.reasoning, complete: true });
          },
          onContentDelta: (delta) => session.send({ type: "output_delta", task: "forge", characters: delta.length }),
          onReasoningDelta: (delta) => session.send({ type: "reasoning", task: "forge", delta }),
          onUsage: (usage) => session.send({ type: "usage", task: "forge", usage }),
          onProviderActivity: () => session.send({ type: "provider_activity", task: "forge", at: Date.now() }),
        });
      } catch (bundleErr: any) {
        if (requestLifecycle.signal.aborted || (bundleErr instanceof ModelGatewayError && bundleErr.code === "CLIENT_DISCONNECTED")) {
          session.finish({ type: "cancelled", task: "forge", message: "Forge stopped." });
          cleanup();
          return;
        }
        const failure = normalizeGenerationFailure(bundleErr, { operation: "forge" });
        session.finish({ type: "error", task: "forge", message: failure.message, code: failure.code, action: failure.action, retryable: failure.retryable, retryAfterMs: failure.retryAfterMs });
        cleanup();
        return;
      }

      // Sanitize rules inside worldPhysics if present
      if (bundleResult.worldPhysics && Array.isArray(bundleResult.worldPhysics.rules)) {
        bundleResult.worldPhysics.rules = sanitizeSectionEntries("rules", bundleResult.worldPhysics.rules);
      }

      // Merge and stream sections as they arrive
      for (const [key, val] of Object.entries(bundleResult)) {
        const sanitizedVal = Array.isArray(val) && key !== "proceduralRolls"
          ? sanitizeSectionEntries(key, val)
          : val;
        doc[key] = sanitizedVal;
        sendEvent("section", { key, data: sanitizedVal });
      }

      sendEvent("log", {
        stage: bundle.keys[0],
        label: `${bundle.name} — inked and verified`,
        status: "done",
      });
      session.send({ type: "progress", task: "forge", phase: "forge_bundle", label: `${bundle.name} complete`, completedSteps: i + 1, totalSteps: bundles.length });
    }

    if (doc.core?.title) {
      doc.title = doc.core.title;
    }

    sendEvent("log", { stage: "final", label: "Manuscript inked and bound across all 6 bundles", status: "done" });
    sendEvent("done", { document: doc });
  } catch (err: any) {
    if (requestLifecycle.signal.aborted) {
      session.finish({ type: "cancelled", task: "forge", message: "Forge stopped." });
      cleanup();
      return;
    }
    console.error("Forge pipeline error:", err);
    sendEvent("error", normalizeGenerationFailure(err, { operation: "forge" }));
  }
});

// ==========================================
// STAGE 5 (REFINE) ENDPOINTS
// ==========================================

// 1. Single Entry Reroll
app.post("/api/refine/entry-reroll", async (req, res) => {
  try {
    const { document, sectionKey, entryId, instruction, settings } = req.body;
    if (!document || !sectionKey || !entryId) {
      return res.status(400).json({ error: "Missing required document, sectionKey, or entryId" });
    }

    const currentList: any[] = document[sectionKey] || [];
    const targetEntry = currentList.find((e) => e.id === entryId);
    if (!targetEntry) {
      return res.status(404).json({ error: `Entry ${entryId} not found in section ${sectionKey}` });
    }

    const ai = getAI();
    const modelSelection = resolveRequestedModelSelection(settings?.modelSelection);
    const systemInstruction = `${CREATIVE_CONSTITUTION_PROMPT}

You are the master scenario scribe in Lore Bible.
You are regenerating ONLY a single entry in section '${sectionKey}' with ID '${entryId}'.
Hold the surrounding manuscript constant:
Premise: ${document.core?.title} — ${document.core?.pitch}
The Rule: ${document.core?.theRule}
The Situation: ${document.core?.theSituation}
User Role: ${document.user?.rolePosition}
Franchise: ${document.canon?.enabled ? document.canon.franchiseName : "Original"}

RULES:
- Preserve the exact field keys present in the current entry.
- Generate a fresh, distinctive entry that fits seamlessly with the manuscript's native genre, tone, and physics.
- Do NOT impose unprompted institutional, dystopian, or bureaucratic assumptions.
- Retain lorebook trigger keys that are specific, capitalized multi-word phrases.
- Return ONLY the updated JSON entry matching the schema.`;

    const userPrompt = `Current Entry to replace:
${JSON.stringify(targetEntry, null, 2)}
${instruction ? `Specific Instruction: ${instruction}` : "Reroll with fresh details, holding tone and rules constant."}`;

    const updatedEntry: any = await executeGeminiWithRetry<any>({
          ai,
          systemInstruction,
          userPrompt,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              fields: {
                type: Type.OBJECT,
                properties: Object.keys(targetEntry.fields || {}).reduce((acc: any, k) => {
                  acc[k] = { type: Type.STRING };
                  return acc;
                }, {}),
              },
              keys: { type: Type.ARRAY, items: { type: Type.STRING } },
              permanence: { type: Type.STRING },
              locked: { type: Type.BOOLEAN },
              note: { type: Type.STRING },
            },
            required: ["id", "fields", "keys", "permanence"],
          },
          stageName: `Reroll Entry ${entryId}`,
          sparkText: document.sparkText,
          maxAttempts: 2,
          modelSelection,
          gateway: modelGateway,
        });
    if (!updatedEntry?.fields) throw new ModelGatewayError("The selected model returned an invalid entry.", "INVALID_STRUCTURED_OUTPUT", 502);

    updatedEntry.id = targetEntry.id;
    updatedEntry.locked = targetEntry.locked;
    if (targetEntry.note) updatedEntry.note = targetEntry.note;

    res.json({ updatedEntry });
  } catch (err: any) {
    console.error("Entry reroll error:", err);
    sendGenerationFailure(res, err, { operation: "refine-entry-reroll" });
  }
});

// 2. Generate 3 Variants for an entry
app.post("/api/refine/variants", async (req, res) => {
  try {
    const { document, sectionKey, entryId, settings } = req.body;
    const currentList: any[] = document?.[sectionKey] || [];
    const targetEntry = currentList.find((e) => e.id === entryId);
    if (!targetEntry) {
      return res.status(404).json({ error: `Entry ${entryId} not found in ${sectionKey}` });
    }

    const ai = getAI();
    const modelSelection = resolveRequestedModelSelection(settings?.modelSelection);
    const systemInstruction = `${CREATIVE_CONSTITUTION_PROMPT}

You are the master scenario scribe in Lore Bible.
Generate 3 distinct variant alternatives for this entry in section '${sectionKey}'.
Vary the 3 alternatives across orthogonal dramatic dimensions that honor the manuscript's native genre:
Variant 1 (Alternative Practical Reality): Shifts the physical, logistical, or craft condition.
Variant 2 (Alternative Social Dynamic): Shifts the relational, reputational, or loyalty dynamic.
Variant 3 (Alternative Latent Discovery): Introduces an unexpected opportunity, hidden history, or emerging turn.

Return a JSON array of 3 variant objects with { id, label, angle, preview, entry }.
Each variant.entry must have the same field keys as the original entry.`;

    const userPrompt = `Current Entry:
${JSON.stringify(targetEntry, null, 2)}
Manuscript: ${document.core?.title} · ${document.core?.genreTone} · ${document.core?.theRule}`;

    const response = await executeGeminiWithRetry<any>({
          ai,
          systemInstruction,
          userPrompt,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              variants: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    angle: { type: Type.STRING },
                    preview: { type: Type.STRING },
                    entry: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        fields: {
                          type: Type.OBJECT,
                          properties: Object.keys(targetEntry.fields || {}).reduce((acc: any, k) => {
                            acc[k] = { type: Type.STRING };
                            return acc;
                          }, {}),
                        },
                        keys: { type: Type.ARRAY, items: { type: Type.STRING } },
                        permanence: { type: Type.STRING },
                      },
                    },
                  },
                  required: ["id", "label", "angle", "preview", "entry"],
                },
              },
            },
            required: ["variants"],
          },
          stageName: `Variants for ${entryId}`,
          sparkText: document.sparkText,
          maxAttempts: 2,
          modelSelection,
          gateway: modelGateway,
        });
    const variants = Array.isArray(response?.variants) ? response.variants : [];
    if (variants.length !== 3) throw new ModelGatewayError("The selected model did not return three usable variants.", "INVALID_STRUCTURED_OUTPUT", 502);

    res.json({ variants });
  } catch (err: any) {
    console.error("Variants error:", err);
    sendGenerationFailure(res, err, { operation: "refine-variants" });
  }
});

// 3. Push Entry With Handwritten Instruction
app.post("/api/refine/entry-push", async (req, res) => {
  try {
    const { document, sectionKey, entryId, pushInstruction, settings } = req.body;
    const currentList: any[] = document?.[sectionKey] || [];
    const targetEntry = currentList.find((e) => e.id === entryId);
    if (!targetEntry) {
      return res.status(404).json({ error: `Entry ${entryId} not found in ${sectionKey}` });
    }

    const ai = getAI();
    const modelSelection = resolveRequestedModelSelection(settings?.modelSelection);
    const systemInstruction = `${CREATIVE_CONSTITUTION_PROMPT}

You are the master scenario scribe in Lore Bible.
Rewrite this single entry in section '${sectionKey}' according to the author's handwritten margin note: "${pushInstruction}".
Integrate the note deeply into the entry's fields (not just tacking it on).
Preserve the existing JSON structure and field names. Honor the world's native genre and physics.`;

    const userPrompt = `Current Entry:\n${JSON.stringify(targetEntry, null, 2)}\nAuthor Note: "${pushInstruction}"`;

    const updatedEntry: any = await executeGeminiWithRetry<any>({
          ai,
          systemInstruction,
          userPrompt,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              fields: {
                type: Type.OBJECT,
                properties: Object.keys(targetEntry.fields || {}).reduce((acc: any, k) => {
                  acc[k] = { type: Type.STRING };
                  return acc;
                }, {}),
              },
              keys: { type: Type.ARRAY, items: { type: Type.STRING } },
              permanence: { type: Type.STRING },
            },
            required: ["id", "fields", "keys", "permanence"],
          },
          stageName: `Push ${entryId}`,
          sparkText: document.sparkText,
          maxAttempts: 2,
          modelSelection,
          gateway: modelGateway,
        });
    if (!updatedEntry?.fields) throw new ModelGatewayError("The selected model returned an invalid entry.", "INVALID_STRUCTURED_OUTPUT", 502);

    updatedEntry.id = targetEntry.id;
    updatedEntry.locked = targetEntry.locked;
    if (targetEntry.note) updatedEntry.note = targetEntry.note;

    res.json({ updatedEntry });
  } catch (err: any) {
    console.error("Push entry error:", err);
    sendGenerationFailure(res, err, { operation: "refine-entry-push" });
  }
});

// 4. Section Regeneration / Add Entries
app.post("/api/refine/section-regen", async (req, res) => {
  try {
    const { document, sectionKey, addCount, settings } = req.body;
    const currentList: any[] = document?.[sectionKey] || [];
    const lockedEntries = currentList.filter((e) => e.locked);
    const standardFieldsBySection: Record<string, any> = {
      rules: { rule: "Core operating principle", profits: "Key benefit gained", pays: "Essential concession or effort" },
      locations: { name: "New Location", function: "Primary gathering or work space", mood: "Atmospheric and distinct", whatsWrong: "Unresolved tension or complication" },
      factions: { name: "New Faction", publicFace: "Established public reputation", trueAgenda: "Core underlying objective", independentWant: "Critical need", stanceTowardUser: "Observant appraisal" },
      npcs: { name: "New Figure", role: "Key Role in this setting", wants: "Primary motivation", body: "Distinct physical presence", voice: "Authentic manner of speech", notDefault: "Private habit or quirk", holds: "Tangible influence or resource", connection: "Tied to setting history" },
      relationshipWeb: { source: "User", target: "Contact", bond: "Working relationship", pressure: "Competing expectation", relation: "User → Contact: Mutual obligation" },
      knowledgeMap: { truth: "The unacknowledged reality", knows: "Key figures", suspects: "Close observers", surfacesWhen: "Unforeseen pressure reveals the truth" },
      items: { name: "New Asset", whatItDoes: "Core functional purpose", costOrLimit: "Operating limit or maintenance requirement", unfiredGun: "Loaded narrative potential" },
      secrets: { truth: "The concealed truth", whoKeepsIt: "Trusted keeper", howKept: "Privately held knowledge", discoveryTrigger: "Direct examination", whatItChanges: "Reframes current assumptions" },
      history: { event: "The Foundational Milestone", era: "Previous generation", consequence: "Established current conditions" },
      pressures: { name: "The Critical Timeline", force: "Impending event or shift", scope: "Local", clock: "Counted in approaching milestones" },
    };

    const targetTemplateFields = (currentList[0]?.fields && Object.keys(currentList[0].fields).length > 0)
      ? currentList[0].fields
      : (standardFieldsBySection[sectionKey] || { name: "New Seed", details: "Active detail" });

    const templateEntry = currentList[0] || {
      id: `${sectionKey}-new`,
      fields: targetTemplateFields,
      keys: ["Key"],
      permanence: "C",
      locked: false,
    };

    const countToGenerate = addCount ? Math.min(addCount, 5) : Math.max(currentList.length - lockedEntries.length, 1);

    const ai = getAI();
    const modelSelection = resolveRequestedModelSelection(settings?.modelSelection);
    const systemInstruction = `${CREATIVE_CONSTITUTION_PROMPT}

You are the master scenario scribe in Lore Bible.
Generate ${countToGenerate} entries for section '${sectionKey}'.
Manuscript: ${document.core?.title} · ${document.core?.theRule} · ${document.core?.genreTone}
Locked entries that MUST remain in the world:\n${JSON.stringify(lockedEntries, null, 2)}
Ensure each generated entry honors the manuscript's native genre, tone, and physics, and follows the field structure.`;

    const response = await executeGeminiWithRetry<any>({
          ai,
          systemInstruction,
          userPrompt: `Generate ${countToGenerate} coherent entries for ${sectionKey}.`,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              entries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    fields: {
                      type: Type.OBJECT,
                      properties: Object.keys(templateEntry.fields || {}).reduce((acc: any, k) => {
                        acc[k] = { type: Type.STRING };
                        return acc;
                      }, {}),
                    },
                    keys: { type: Type.ARRAY, items: { type: Type.STRING } },
                    permanence: { type: Type.STRING },
                    locked: { type: Type.BOOLEAN },
                  },
                  required: ["id", "fields", "keys", "permanence"],
                },
              },
            },
            required: ["entries"],
          },
          stageName: `Regen Section ${sectionKey}`,
          sparkText: document.sparkText,
          maxAttempts: 2,
          modelSelection,
          gateway: modelGateway,
        });
    const generatedEntries: any[] = Array.isArray(response?.entries) ? response.entries : [];
    if (generatedEntries.length === 0) throw new ModelGatewayError("The selected model returned no usable section entries.", "INVALID_STRUCTURED_OUTPUT", 502);


    let finalEntries: any[] = [];
    if (addCount) {
      finalEntries = [...currentList, ...generatedEntries];
    } else {
      // Merge locked entries back in
      let genIdx = 0;
      finalEntries = currentList.map((e) => {
        if (e.locked) return e;
        if (genIdx < generatedEntries.length) {
          const fresh = generatedEntries[genIdx++];
          return { ...fresh, id: e.id, locked: false };
        }
        return e;
      });
      while (genIdx < generatedEntries.length) {
        finalEntries.push(generatedEntries[genIdx++]);
      }
    }

    res.json({ entries: finalEntries });
  } catch (err: any) {
    console.error("Section regen error:", err);
    sendGenerationFailure(res, err, { operation: "refine-section-regen" });
  }
});

// 5. The Consistency Pass Audit
app.post("/api/refine/consistency-audit", async (req, res) => {
  try {
    const { document } = req.body;
    if (!document) {
      return res.status(400).json({ error: "Missing document for audit" });
    }

    const findings: any[] = [];
    const isCanon = !!document.canon?.enabled;
    const franchise = document.canon?.franchiseName || "";

    // 1. Check Banned Names / Canon Conventions
    const BANNED_GENERIC_NAMES = [
      "Elena", "Marcus", "Lyra", "Thorne", "Kael", "Aria", "Vance", "Rowan", "Silas", "Caelum",
      "Seraphina", "Malakor", "Drakon", "Valerius", "Zephyr", "Nyx",
    ];

    const inspectEntryFields = (sectionKey: string, entry: any) => {
      const entryId = entry.id;
      const fields = entry.fields || {};

      for (const [fieldKey, val] of Object.entries(fields)) {
        if (typeof val !== "string") continue;

        // Banned names in non-canon mode
        if (!isCanon) {
          for (const bn of BANNED_GENERIC_NAMES) {
            const regex = new RegExp(`\\b${bn}\\b`, "i");
            if (regex.test(val)) {
              findings.push({
                id: `audit-banned-${entryId}-${bn}`,
                type: "banned_name",
                sectionKey,
                entryId,
                fieldKey,
                offendingText: bn,
                explanation: `Generic fantasy/sci-fi name '${bn}' is on the banned list. Replace with a linguistically grounded character name.`,
                suggestedFix: `${entry.fields.role || "Operator"} ${isCanon ? "Corbett" : "Renner"}`,
              });
            }
          }
        }

        // Negations in seed content ("doesn't", "cannot", "has no", "refuses to")
        const negations = ["doesn't have", "cannot be", "has no", "is not allowed", "never uses", "refuses to"];
        for (const neg of negations) {
          if (val.toLowerCase().includes(neg)) {
            findings.push({
              id: `audit-neg-${entryId}-${neg}`,
              type: "negation",
              sectionKey,
              entryId,
              fieldKey,
              offendingText: neg,
              explanation: `Seed content forbids passive negations ('${neg}'). State the active positive rule or constraint instead.`,
              suggestedFix: "operates strictly under",
            });
          }
        }

        // Trope labels
        const tropes = ["shadowy figure", "mysterious stranger", "heart of gold", "whispered legends", "chosen one", "tragic past"];
        for (const tr of tropes) {
          if (val.toLowerCase().includes(tr)) {
            findings.push({
              id: `audit-trope-${entryId}-${tr}`,
              type: "trope",
              sectionKey,
              entryId,
              fieldKey,
              offendingText: tr,
              explanation: `Trope label detected ('${tr}'). Ground this in concrete behavior, physical mannerisms, or institutional motive.`,
              suggestedFix: "a vetted functionary whose debts are held by the central committee",
            });
          }
        }

        // Prescribed arcs rather than static pressure
        const arcs = ["will eventually", "destined to", "later falls in love", "ultimately betrays", "will discover that"];
        for (const arc of arcs) {
          if (val.toLowerCase().includes(arc)) {
            findings.push({
              id: `audit-arc-${entryId}-${arc}`,
              type: "prescribed_arc",
              sectionKey,
              entryId,
              fieldKey,
              offendingText: arc,
              explanation: `Prescribed future arc ('${arc}'). A Lore Bible must only establish starting pressures, not predetermined story outcomes.`,
              suggestedFix: "faces immediate pressure if",
            });
          }
        }

        // User-centric NPCs
        if (sectionKey === "npcs" && fieldKey === "wants") {
          if (val.toLowerCase().includes("help {{user}}") || val.toLowerCase().includes("serve {{user}}") || val.toLowerCase().includes("protect {{user}}")) {
            findings.push({
              id: `audit-user-centric-${entryId}`,
              type: "user_centric_npc",
              sectionKey,
              entryId,
              fieldKey,
              offendingText: val,
              explanation: `NPC's want is purely user-centric. Every NPC must possess an independent life goal separate from {{user}}.`,
              suggestedFix: "Secure their own institutional promotion while using {{user}} as disposable leverage",
            });
          }
        }
      }

      // Weak or common-word lorebook keys
      if (Array.isArray(entry.keys)) {
        const weakWords = ["sword", "magic", "city", "door", "room", "man", "woman", "item", "secret", "leader", "friend"];
        for (const k of entry.keys) {
          if (weakWords.includes(k.toLowerCase()) || k.length <= 2) {
            findings.push({
              id: `audit-key-${entryId}-${k}`,
              type: "weak_key",
              sectionKey,
              entryId,
              offendingText: k,
              explanation: `Weak lorebook key '${k}'. Common words trigger accidental lorebook injection. Use specific proper nouns or compound keys.`,
              suggestedFix: `${entry.fields.name || "Entity"} [Proper]`,
            });
          }
        }
      }
    };

    // Audit all standard entry sections
    const entrySections = ["locations", "factions", "npcs", "relationshipWeb", "knowledgeMap", "items", "secrets", "pressures"];
    for (const secKey of entrySections) {
      const list = document[secKey] || [];
      for (const entry of list) {
        inspectEntryFields(secKey, entry);
      }
    }

    // World Physics checks
    if (document.worldPhysics) {
      if (!document.worldPhysics.authorityCheck || document.worldPhysics.authorityCheck.toLowerCase().includes("tbd") || document.worldPhysics.authorityCheck.length < 15) {
        findings.push({
          id: "audit-authority-check",
          type: "unanswered_check",
          sectionKey: "worldPhysics",
          fieldKey: "authorityCheck",
          offendingText: document.worldPhysics.authorityCheck || "Unspecified",
          explanation: "Unanswered Authority Check. You must explicitly name who holds legal authority and what happens when they intervene.",
          suggestedFix: "The local magistrate enforces curfews with heavy municipal fines and detention warrants.",
        });
      }
      if (!document.worldPhysics.powerCeiling || document.worldPhysics.powerCeiling.toLowerCase().includes("tbd") || document.worldPhysics.powerCeiling.length < 15) {
        findings.push({
          id: "audit-power-ceiling",
          type: "unanswered_check",
          sectionKey: "worldPhysics",
          fieldKey: "powerCeiling",
          offendingText: document.worldPhysics.powerCeiling || "Unspecified",
          explanation: "Unanswered Power Ceiling. You must define the upper limit of force or power in this setting to prevent escalating god-moding.",
          suggestedFix: "No practitioner can sustain high-output abilities for longer than 90 consecutive seconds without physical collapse.",
        });
      }
    }

    res.json({ findings, analysisSource: "local_heuristic" });
  } catch (err: any) {
    console.error("Consistency audit error:", err);
    res.status(500).json({ error: err.message || "Failed to audit consistency" });
  }
});

// 7. Suggested Procedural Rolls Endpoint
app.post("/api/suggest-rolls", async (req, res) => {
  try {
    const { sparkText, parse, canon, physics, settings } = req.body;
    const ai = getAI();
    const modelSelection = resolveRequestedModelSelection(settings?.modelSelection);
        const sharedContext = buildSharedContext({ sparkText, parse, canon, physics });
        const prompt = `PROCEDURAL ROLL GENERATOR:
Infer 3 to 4 weighted, mutually-exclusive lorebook roll groups that are actually useful for this specific setting. Do not introduce institutions, danger, factions, secrets, combat, or supernatural systems unless the supplied premise calls for them.

${sharedContext}

CRITICAL RULES:
- Each group must have 2 to 4 distinct entries.
- The entry weights in each group MUST strictly sum to exactly 100!
- Every outcome must be grounded, tactile, and specific to this world.
- Settings string must be: "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4".
- Return valid JSON matching the schema.`;

        const rollSchema = {
          type: Type.OBJECT,
          properties: {
            proceduralRolls: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  triggerKeys: { type: Type.ARRAY, items: { type: Type.STRING } },
                  settings: { type: Type.STRING },
                  entries: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        weight: { type: Type.NUMBER },
                        outcome: { type: Type.STRING },
                      },
                      required: ["id", "weight", "outcome"],
                    },
                  },
                },
                required: ["id", "name", "triggerKeys", "settings", "entries"],
              },
            },
          },
          required: ["proceduralRolls"],
        };

        const result = await executeGeminiWithRetry<{ proceduralRolls: any[] }>({
          ai,
          systemInstruction: GENERATOR_RULES,
          userPrompt: prompt,
          responseSchema: rollSchema,
          stageName: "Suggested Rolls",
          sparkText: sparkText || "Scenario",
          maxAttempts: 2,
          modelSelection,
          gateway: modelGateway,
        });

        const proceduralRolls = Array.isArray(result?.proceduralRolls) ? result.proceduralRolls : [];
        if (proceduralRolls.length === 0) throw new ModelGatewayError("The selected model returned no usable procedural roll groups.", "INVALID_STRUCTURED_OUTPUT", 502);

    res.json({ proceduralRolls });
  } catch (err: any) {
    console.error("Suggest rolls error:", err);
    sendGenerationFailure(res, err, { operation: "suggest-rolls" });
  }
});

// 8. Test Bench Turn Endpoint
app.post("/api/test-bench-turn", async (req, res) => {
  try {
    const { npc, worldPhysics, status, history, userInput, sparkText, canon, settings } = req.body;
    if (!npc || !userInput) {
      return res.status(400).json({ error: "Missing npc or userInput" });
    }

    const ai = getAI();
    const modelSelection = resolveRequestedModelSelection(settings?.modelSelection);

    const npcName = npc.fields?.name || npc.id || "The NPC";
    const role = npc.fields?.role || "Inhabitant";
    const wants = npc.fields?.wants || "Their own goals and commitments";
    const voice = npc.fields?.voice || "Authentic to their background and role";
    const holds = npc.fields?.holds || "Tangible leverage, skill, or resource";
    const notDefault = npc.fields?.notDefault || "A distinct personal quirk or habit";

        const systemPrompt = `${CREATIVE_CONSTITUTION_PROMPT}

You are roleplaying strictly as "${npcName}", ${role} in this manuscript world.
WORLD SETTING: ${sparkText || "Scenario"}
${canon?.enabled ? `CANON FRANCHISE: ${canon.franchiseName}` : ""}
POWER CEILING: ${worldPhysics?.powerCeiling || "Actions operate within natural physical limits and fatigue."}
AUTHORITY CHECK: ${worldPhysics?.authorityCheck || "Boundaries and social rules are maintained within this domain."}
ACTIVE STATUS: ${status?.content || "Day-to-day conditions"}

CHARACTER PROFILE FOR ${npcName.toUpperCase()}:
- Role: ${role}
- Wants: ${wants}
- Voice & Tone: ${voice}
- Holds / Leverage: ${holds}
- Idiosyncrasy: ${notDefault}

ANTI-GRAVITY CONSTRAINTS (MANDATORY):
1. NEVER act like an AI assistant. Do not offer polite customer service greetings ("How can I help you?", "Certainly!").
2. NEVER treat {{user}} as an exalted protagonist or chosen one. You have your own responsibilities, boundaries, and priorities.
3. Spoken dialogue MUST be inside quotes ("...").
4. Keep actions in grounded, tactile serif prose matching the native genre.
5. In media res: Respond to the user's action naturally, maintaining authentic boundaries and personal stakes.`;

        const userPrompt = `PREVIOUS TURNS:
${Array.isArray(history) ? history.map((h: any) => `${h.role === "user" ? "USER" : npcName.toUpperCase()}: ${h.content}`).join("\n") : "Scene starts now."}

USER ACTION:
"${userInput}"

Emit strictly valid JSON matching this schema:
{
  "reply": "Your in-character dialogue and grounded physical reactions (~60-140 words)",
  "gravityAssessment": {
    "modelVoice": <integer 0-100 estimating risk of sounding like generic AI assistant>,
    "protagonistGravity": <integer 0-100 estimating unearned special treatment toward user>,
    "narrativeGravity": <integer 0-100 estimating unearned cinematic grandiosity>,
    "convenienceGravity": <integer 0-100 estimating unearned assistance or unbolted access>,
    "denialGravity": <integer 0-100 estimating refusal of world danger or physical limits>,
    "diagnosticNotes": "<1-2 sentence self-assessment of whether NPC held their distinct uncooperative voice>"
  }
}`;

        const turnSchema = {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            gravityAssessment: {
              type: Type.OBJECT,
              properties: {
                modelVoice: { type: Type.INTEGER },
                protagonistGravity: { type: Type.INTEGER },
                narrativeGravity: { type: Type.INTEGER },
                convenienceGravity: { type: Type.INTEGER },
                denialGravity: { type: Type.INTEGER },
                diagnosticNotes: { type: Type.STRING },
              },
              required: ["modelVoice", "protagonistGravity", "narrativeGravity", "convenienceGravity", "denialGravity", "diagnosticNotes"],
            },
          },
          required: ["reply", "gravityAssessment"],
        };

        const result = await executeGeminiWithRetry<{ reply: string; gravityAssessment: any }>({
          ai,
          systemInstruction: systemPrompt,
          userPrompt,
          responseSchema: turnSchema,
          stageName: "Test Bench Turn",
          sparkText: sparkText || "Scenario",
          maxAttempts: 2,
          modelSelection,
          gateway: modelGateway,
        });

        if (result?.reply) {
          const replyText = result.reply;
          let gravity = calculateLocalGravityAudit(replyText, userInput);
          if (result.gravityAssessment) {
            gravity = {
              modelVoice: Math.min(100, Math.max(0, result.gravityAssessment.modelVoice || 10)),
              protagonistGravity: Math.min(100, Math.max(0, result.gravityAssessment.protagonistGravity || 10)),
              narrativeGravity: Math.min(100, Math.max(0, result.gravityAssessment.narrativeGravity || 10)),
              convenienceGravity: Math.min(100, Math.max(0, result.gravityAssessment.convenienceGravity || 10)),
              denialGravity: Math.min(100, Math.max(0, result.gravityAssessment.denialGravity || 10)),
              diagnosticNotes: result.gravityAssessment.diagnosticNotes || "Self-assessed anti-gravity stability.",
            };
          }
          return res.json({ reply: replyText, gravity, analysisSource: "model" });
        }
        throw new ModelGatewayError("The selected model returned no usable Test Bench reply.", "INVALID_STRUCTURED_OUTPUT", 502);
  } catch (err: any) {
    console.error("Test bench turn error:", err);
    sendGenerationFailure(res, err, { operation: "test-bench-turn" });
  }
});

// 9. Voice Check Endpoint
app.post("/api/voice-check", async (req, res) => {
  try {
    const { lines, npcName, worldContext } = req.body;
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: "Missing lines" });
    }

    const result = performVoiceCheckLocal(lines, npcName || "Character");
    res.json({ ...result, analysisSource: "local_heuristic" });
  } catch (err: any) {
    console.error("Voice check error:", err);
    res.status(500).json({ error: "Failed to perform voice check" });
  }
});

// 10. Opening Audit Endpoint
app.post("/api/opening-audit", async (req, res) => {
  try {
    const { firstMessage, sparkText, rolePosition } = req.body;
    if (!firstMessage) {
      return res.status(400).json({ error: "Missing firstMessage" });
    }

    const localAudit = auditOpeningMessageLocal(firstMessage, sparkText);
    res.json({ ...localAudit, analysisSource: "local_heuristic" });
  } catch (err: any) {
    console.error("Opening audit error:", err);
    res.status(500).json({ error: "Failed to audit opening message" });
  }
});

// Vite middleware in dev or static serving in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lore Bible server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

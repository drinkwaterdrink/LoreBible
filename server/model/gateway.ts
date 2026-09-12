import { getCatalogForProvider } from "../../src/lib/modelCatalog.js";
import type { GenerationErrorCode, GenerationRequest, GenerationResponse, JsonSchema, ProviderId } from "../../src/contracts/generation.js";
import { ProfileStoreError, type ProfileStore } from "../secrets/profileStore.js";
import { normalizeProviderReasoning } from "./reasoning.js";
import { consumeOpenAICompatibleStream, splitProviderContent, type ProviderStreamUsage } from "./providerStream.js";
import { createProviderDeadlineController, maxOutputTokensForStage, type ProviderTimeoutKind } from "./providerTimeouts.js";
import { parseStructuredOutput } from "./structuredOutput.js";

type FetchImplementation = (input: string, init?: RequestInit) => Promise<globalThis.Response>;

export class ModelGatewayError extends Error {
  constructor(
    message: string,
    public readonly code: GenerationErrorCode,
    public readonly status: number,
    public readonly provider?: ProviderId,
    public readonly timeoutKind?: ProviderTimeoutKind,
  ) {
    super(message);
    this.name = "ModelGatewayError";
  }
}

function normalizeSchema(schema: JsonSchema): Record<string, unknown> {
  const result: Record<string, unknown> = { ...schema };
  if (typeof result.type === "string") result.type = result.type.toLowerCase();
  if (schema.properties) result.properties = Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, normalizeSchema(value)]));
  if (schema.items) result.items = normalizeSchema(schema.items);
  return result;
}

function extractProviderMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Provider request failed.";
  const root = payload as { error?: unknown; message?: unknown };
  if (typeof root.message === "string") return root.message.slice(0, 300);
  if (root.error && typeof root.error === "object" && typeof (root.error as { message?: unknown }).message === "string") return ((root.error as { message: string }).message).slice(0, 300);
  return "Provider request failed.";
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return splitProviderContent(content).text;
  return content == null ? "" : JSON.stringify(content);
}

function mapHttpError(status: number, provider: ProviderId, message: string): ModelGatewayError {
  if (status === 401 || status === 403) return new ModelGatewayError("The provider rejected this API key.", "AUTHENTICATION_FAILED", 401, provider);
  if (status === 404) return new ModelGatewayError("The selected model or provider endpoint was not found.", "MODEL_UNAVAILABLE", 404, provider);
  if (status === 408 || status === 504) return new ModelGatewayError("The provider request timed out.", "REQUEST_TIMEOUT", 504, provider);
  if (status === 429) return new ModelGatewayError("The provider rate limit was reached.", "RATE_LIMITED", 429, provider);
  if (status >= 500) return new ModelGatewayError("The provider is temporarily unavailable.", "PROVIDER_UNAVAILABLE", 503, provider);
  return new ModelGatewayError(message, "PROVIDER_UNAVAILABLE", 502, provider);
}

function endpointFor(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
}

function normalizeProviderModelId(id: string): string {
  return id.startsWith("models/") ? id.slice("models/".length) : id;
}

async function providerReportsModel(
  fetchImpl: FetchImplementation,
  profile: { provider: ProviderId; baseUrl: string },
  apiKey: string,
  modelId: string,
  signal?: AbortSignal,
): Promise<boolean> {
  try {
    const response = await fetchImpl(`${profile.baseUrl.replace(/\/+$/, "")}/models`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal,
    });
    if (!response.ok) return false;
    const payload: unknown = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { data?: unknown }).data)) return false;
    return (payload as { data: Array<{ id?: unknown }> }).data.some((model) => typeof model.id === "string" && normalizeProviderModelId(model.id.trim()) === modelId);
  } catch (error) {
    if (signal?.aborted) throw new ModelGatewayError("Generation was cancelled.", "CLIENT_DISCONNECTED", 499, profile.provider);
    return false;
  }
}

function timeoutMessage(kind: ProviderTimeoutKind): string {
  if (kind === "FIRST_EVENT_TIMEOUT") return "The provider sent no response before the first-event deadline.";
  if (kind === "INACTIVITY_TIMEOUT") return "The provider stream stopped producing activity.";
  return "The provider exceeded the overall generation time limit.";
}

function usageForClient(usage?: ProviderStreamUsage) {
  const reasoning = normalizeProviderReasoning({ usage });
  return {
    inputTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
    outputTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : undefined,
    reasoningTokens: reasoning.reasoningTokens,
  };
}

async function readJsonWithSignal(response: globalThis.Response, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) throw signal.reason || new DOMException("Aborted", "AbortError");
  return await new Promise<unknown>((resolve, reject) => {
    const onAbort = () => reject(signal.reason || new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    response.json().then(resolve, () => resolve(null)).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export function createModelGateway(store: ProfileStore, fetchImpl: FetchImplementation = fetch) {
  return {
    async generate(request: GenerationRequest): Promise<GenerationResponse> {
      let profile;
      try {
        profile = await store.getMetadata(request.profileId);
      } catch (error) {
        if (error instanceof ProfileStoreError) throw new ModelGatewayError(error.message, error.code === "missing" ? "PROFILE_NOT_FOUND" : "INTERNAL_ERROR", error.code === "missing" ? 404 : 500);
        throw error;
      }
      if (!profile) throw new ModelGatewayError("Connection profile was not found.", "PROFILE_NOT_FOUND", 404);
      const curatedModel = getCatalogForProvider(profile.provider).find((model) => model.id === request.modelId);

      let apiKey: string | null;
      try { apiKey = await store.getSecret(request.profileId); } catch (error) {
        if (error instanceof ProfileStoreError) throw new ModelGatewayError(error.message, "INTERNAL_ERROR", 500, profile.provider);
        throw error;
      }
      if (!apiKey) throw new ModelGatewayError("This connection profile has no API key.", "CREDENTIAL_MISSING", 400, profile.provider);
      const configuredCustomModel = profile.customModelIds.includes(request.modelId);
      const providerReported = !curatedModel && !configuredCustomModel
        ? await providerReportsModel(fetchImpl, profile, apiKey, request.modelId, request.signal)
        : false;
      if (!curatedModel && !configuredCustomModel && !providerReported) throw new ModelGatewayError(`Model ${request.modelId} is not configured for this profile.`, "MODEL_UNAVAILABLE", 400, profile.provider);

      const deadlines = createProviderDeadlineController({
        callerSignal: request.signal,
        firstEventMs: Math.max(1, request.timeoutMs),
        inactivityMs: Math.max(1, request.inactivityTimeoutMs ?? Math.min(request.timeoutMs, 60_000)),
        overallMs: Math.max(1, request.overallTimeoutMs ?? Math.max(request.timeoutMs, 480_000)),
      });
      const requestBody: Record<string, unknown> = {
        model: request.modelId,
        messages: [{ role: "system", content: request.systemInstruction }, { role: "user", content: request.userPrompt }],
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: request.maxOutputTokens ?? maxOutputTokensForStage(request.stageName),
      };
      if (curatedModel?.reasoning === "required") {
        if (profile.provider === "nanogpt") {
          requestBody.reasoning_effort = request.reasoningEffort;
          requestBody.reasoning_content_compat = true;
          requestBody.reasoning_delta_field = "reasoning_content";
          requestBody.reasoning = { effort: request.reasoningEffort, exclude: false, delta_field: "reasoning_content" };
        } else if (profile.provider === "gemini") {
          requestBody.reasoning_effort = request.reasoningEffort;
          requestBody.extra_body = { google: { thinking_config: { include_thoughts: true } } };
        } else {
          requestBody.reasoning = { effort: request.reasoningEffort, exclude: false };
        }
      }
      if (request.responseSchema) requestBody.response_format = { type: "json_schema", json_schema: { name: "lore_bible_output", strict: true, schema: normalizeSchema(request.responseSchema) } };

      try {
        const requestProvider = async (): Promise<globalThis.Response> => {
          try {
            const response = await fetchImpl(endpointFor(profile.baseUrl), {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
              body: JSON.stringify(requestBody),
              signal: deadlines.signal,
            });
            deadlines.markActivity();
            request.onProviderActivity?.();
            return response;
          } catch {
            if (deadlines.signal.aborted) {
              if (deadlines.timeoutKind) throw new ModelGatewayError(timeoutMessage(deadlines.timeoutKind), "REQUEST_TIMEOUT", 504, profile.provider, deadlines.timeoutKind);
              throw new ModelGatewayError("Generation was cancelled.", "CLIENT_DISCONNECTED", 499, profile.provider);
            }
            throw new ModelGatewayError("Unable to reach the provider.", "PROVIDER_UNAVAILABLE", 503, profile.provider);
          }
        };

        let response!: globalThis.Response;
        for (let compatibilityAttempt = 0; compatibilityAttempt < 3; compatibilityAttempt++) {
          response = await requestProvider();
          if (response.ok) break;
          const errorPayload = await readJsonWithSignal(response, deadlines.signal);
          const providerMessage = extractProviderMessage(errorPayload);
          const normalizedMessage = providerMessage.toLowerCase();
          const streamRejected = response.status === 400 && requestBody.stream === true && normalizedMessage.includes("stream") && (normalizedMessage.includes("not supported") || normalizedMessage.includes("unsupported") || normalizedMessage.includes("invalid"));
          const schemaRejected = response.status === 400 && request.responseSchema && (requestBody.response_format as { type?: unknown } | undefined)?.type === "json_schema" && (normalizedMessage.includes("json_schema") || normalizedMessage.includes("response_format") || normalizedMessage.includes("structured")) && (normalizedMessage.includes("not supported") || normalizedMessage.includes("unsupported") || normalizedMessage.includes("invalid"));
          if (streamRejected) {
            requestBody.stream = false;
            delete requestBody.stream_options;
            continue;
          }
          if (schemaRejected) {
            requestBody.response_format = { type: "json_object" };
            continue;
          }
          throw mapHttpError(response.status, profile.provider, providerMessage);
        }
        if (!response.ok) throw mapHttpError(response.status, profile.provider, "Provider compatibility fallback failed.");

        let payload: any;
        let text = "";
        let streamedReasoning: string | undefined;
        const wasStream = (response.headers.get("Content-Type") || "").toLowerCase().includes("text/event-stream");
        if (wasStream) {
          try {
            const streamed = await consumeOpenAICompatibleStream(response, {
              onContentDelta: request.onContentDelta,
              onReasoningDelta: request.onReasoningDelta,
              onProviderActivity: () => { deadlines.markActivity(); request.onProviderActivity?.(); },
              onUsage: (usage) => request.onUsage?.(usageForClient(usage)),
            }, deadlines.signal);
            text = streamed.text;
            streamedReasoning = streamed.reasoning;
            payload = { model: streamed.model, choices: [{ message: { content: streamed.text, reasoning: streamed.reasoning }, finish_reason: streamed.finishReason }], usage: streamed.usage };
          } catch (error) {
            if (deadlines.signal.aborted) {
              if (deadlines.timeoutKind) throw new ModelGatewayError(timeoutMessage(deadlines.timeoutKind), "REQUEST_TIMEOUT", 504, profile.provider, deadlines.timeoutKind);
              throw new ModelGatewayError("Generation was cancelled.", "CLIENT_DISCONNECTED", 499, profile.provider);
            }
            throw error;
          }
        } else {
          try { payload = await readJsonWithSignal(response, deadlines.signal); } catch (error) {
            if (deadlines.signal.aborted) {
              if (deadlines.timeoutKind) throw new ModelGatewayError(timeoutMessage(deadlines.timeoutKind), "REQUEST_TIMEOUT", 504, profile.provider, deadlines.timeoutKind);
              throw new ModelGatewayError("Generation was cancelled.", "CLIENT_DISCONNECTED", 499, profile.provider);
            }
            throw error;
          }
          const choice = payload && typeof payload === "object" && Array.isArray((payload as { choices?: unknown }).choices) ? (payload as any).choices[0] : null;
          text = contentToText(choice?.message?.content);
          const responseReasoning = choice?.message && typeof choice.message === "object" ? splitProviderContent(choice.message.content).reasoning : "";
          if (responseReasoning) request.onReasoningDelta?.(responseReasoning);
        }

        if (!text.trim()) throw new ModelGatewayError("The provider returned an empty response.", "PROVIDER_UNAVAILABLE", 502, profile.provider);
        let parsed: unknown;
        let repaired = false;
        if (request.responseSchema) {
          try {
            const structured = parseStructuredOutput(text);
            parsed = structured.parsed;
            text = structured.text;
            repaired = structured.repaired;
          } catch {
            throw new ModelGatewayError(`The provider returned invalid structured output for ${profile.provider}/${request.modelId} (${wasStream ? "stream" : "json"} mode). Expected one JSON object or array.`, "INVALID_STRUCTURED_OUTPUT", 502, profile.provider);
          }
        }
        const root = payload && typeof payload === "object" ? payload as { model?: unknown; usage?: ProviderStreamUsage } : {};
        const reasoning = normalizeProviderReasoning(payload);
        const clientUsage = usageForClient(root.usage);
        if (!wasStream) {
          request.onUsage?.(clientUsage);
          if (reasoning.text) request.onReasoningDelta?.(reasoning.text);
        }
        return {
          text,
          parsed,
          provenance: {
            provider: profile.provider,
            profileId: profile.id,
            modelRequested: request.modelId,
            modelReported: typeof root.model === "string" ? root.model : null,
            repaired,
            offlineFallback: false,
            reasoning: streamedReasoning || reasoning.text,
            usage: clientUsage,
          },
        };
      } finally {
        deadlines.dispose();
      }
    },
  };
}

export type ModelGateway = ReturnType<typeof createModelGateway>;

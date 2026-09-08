export type ProviderId = "gemini" | "openrouter" | "nanogpt";
export type ReasoningEffort = "low" | "medium" | "high";
export type GenerationErrorCode = "PROFILE_NOT_FOUND" | "CREDENTIAL_MISSING" | "AUTHENTICATION_FAILED" | "MODEL_UNAVAILABLE" | "RATE_LIMITED" | "QUOTA_EXHAUSTED" | "PROVIDER_UNAVAILABLE" | "REQUEST_TIMEOUT" | "INVALID_STRUCTURED_OUTPUT" | "CLIENT_DISCONNECTED" | "INTERNAL_ERROR";
export type JsonPrimitive = string | number | boolean | null;

export interface JsonSchema {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object" | "null";
  description?: string;
  enum?: readonly JsonPrimitive[];
  properties?: Readonly<Record<string, JsonSchema>>;
  required?: readonly string[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  nullable?: boolean;
}

export interface ModelSelection { profileId: string | null; modelId: string | null; }
export interface GenerationProvenance {
  provider: ProviderId;
  profileId: string;
  modelRequested: string;
  modelReported: string | null;
  repaired: boolean;
  offlineFallback: boolean;
  usage?: { inputTokens?: number; outputTokens?: number; reasoningTokens?: number };
  reasoning?: string;
}
export interface GenerationRequest {
  profileId: string;
  modelId: string;
  systemInstruction: string;
  userPrompt: string;
  responseSchema?: JsonSchema;
  reasoningEffort: ReasoningEffort;
  stageName: string;
  timeoutMs: number;
  inactivityTimeoutMs?: number;
  overallTimeoutMs?: number;
  maxOutputTokens?: number;
  onContentDelta?: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
  onUsage?: (usage: { inputTokens?: number; outputTokens?: number; reasoningTokens?: number }) => void;
  onProviderActivity?: () => void;
  signal?: AbortSignal;
}
export interface GenerationResponse { text: string; parsed?: unknown; provenance: GenerationProvenance; }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseModelSelection(value: unknown): ModelSelection {
  if (!isRecord(value)) throw new TypeError("modelSelection must be an object.");
  const profileId = value.profileId;
  const modelId = value.modelId;
  if (profileId !== null && typeof profileId !== "string") throw new TypeError("modelSelection.profileId must be a string or null.");
  if (modelId !== null && typeof modelId !== "string") throw new TypeError("modelSelection.modelId must be a string or null.");
  return {
    profileId: typeof profileId === "string" && profileId.trim() ? profileId.trim() : null,
    modelId: typeof modelId === "string" && modelId.trim() ? modelId.trim() : null,
  };
}

export function isProviderId(value: unknown): value is ProviderId {
  return value === "gemini" || value === "openrouter" || value === "nanogpt";
}

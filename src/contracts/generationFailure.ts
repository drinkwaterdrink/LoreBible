import type { GenerationErrorCode } from "./generation";

export type GenerationFailureAction = "retry" | "change_model" | "open_connections";

export interface GenerationFailurePayload {
  error: "generation_failed";
  message: string;
  code: GenerationErrorCode;
  action: GenerationFailureAction;
  retryable: boolean;
  operation: string;
  retryAfterMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const CODES = new Set<GenerationErrorCode>([
  "PROFILE_NOT_FOUND", "CREDENTIAL_MISSING", "AUTHENTICATION_FAILED", "MODEL_UNAVAILABLE",
  "RATE_LIMITED", "QUOTA_EXHAUSTED", "PROVIDER_UNAVAILABLE", "REQUEST_TIMEOUT",
  "INVALID_STRUCTURED_OUTPUT", "CLIENT_DISCONNECTED", "INTERNAL_ERROR",
]);
const ACTIONS = new Set<GenerationFailureAction>(["retry", "change_model", "open_connections"]);

export function parseGenerationFailurePayload(value: unknown): GenerationFailurePayload {
  if (!isRecord(value) || value.error !== "generation_failed") throw new TypeError("Generation failure payload is invalid.");
  if (typeof value.message !== "string" || !CODES.has(value.code as GenerationErrorCode)) throw new TypeError("Generation failure details are invalid.");
  if (!ACTIONS.has(value.action as GenerationFailureAction) || typeof value.retryable !== "boolean" || typeof value.operation !== "string") {
    throw new TypeError("Generation failure recovery metadata is invalid.");
  }
  const retryAfterMs = typeof value.retryAfterMs === "number" && Number.isFinite(value.retryAfterMs) ? value.retryAfterMs : undefined;
  return {
    error: "generation_failed",
    message: value.message,
    code: value.code as GenerationErrorCode,
    action: value.action as GenerationFailureAction,
    retryable: value.retryable,
    operation: value.operation,
    ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
  };
}

export class GenerationRequestError extends Error {
  readonly code: GenerationErrorCode;
  readonly action: GenerationFailureAction;
  readonly retryable: boolean;
  readonly operation: string;
  readonly retryAfterMs?: number;
  readonly status: number;

  constructor(payload: GenerationFailurePayload, status: number) {
    super(payload.message);
    this.name = "GenerationRequestError";
    this.code = payload.code;
    this.action = payload.action;
    this.retryable = payload.retryable;
    this.operation = payload.operation;
    this.retryAfterMs = payload.retryAfterMs;
    this.status = status;
  }
}

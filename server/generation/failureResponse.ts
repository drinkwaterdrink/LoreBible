import type { Response } from "express";
import type { GenerationErrorCode } from "../../src/contracts/generation.js";
import type { GenerationFailureAction, GenerationFailurePayload } from "../../src/contracts/generationFailure.js";

interface FailureLike {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  retryAfterMs?: unknown;
}

export interface NormalizedGenerationFailure extends GenerationFailurePayload {
  status: number;
}

const KNOWN_CODES = new Set<GenerationErrorCode>([
  "PROFILE_NOT_FOUND", "CREDENTIAL_MISSING", "AUTHENTICATION_FAILED", "MODEL_UNAVAILABLE",
  "RATE_LIMITED", "QUOTA_EXHAUSTED", "PROVIDER_UNAVAILABLE", "REQUEST_TIMEOUT",
  "INVALID_STRUCTURED_OUTPUT", "CLIENT_DISCONNECTED", "INTERNAL_ERROR",
]);

function actionFor(code: GenerationErrorCode): GenerationFailureAction {
  if (code === "PROFILE_NOT_FOUND" || code === "CREDENTIAL_MISSING" || code === "AUTHENTICATION_FAILED") return "open_connections";
  if (code === "MODEL_UNAVAILABLE") return "change_model";
  return "retry";
}

function retryableFor(code: GenerationErrorCode): boolean {
  return code === "RATE_LIMITED" || code === "QUOTA_EXHAUSTED" || code === "PROVIDER_UNAVAILABLE" || code === "REQUEST_TIMEOUT" || code === "INVALID_STRUCTURED_OUTPUT";
}

function safeMessage(error: FailureLike, code: GenerationErrorCode): string {
  if (code === "INTERNAL_ERROR") return "LoreBible could not complete this generation request.";
  return typeof error.message === "string" && error.message.trim()
    ? error.message.slice(0, 300)
    : "LoreBible could not complete this generation request.";
}

export function normalizeGenerationFailure(error: unknown, context: { operation: string }): NormalizedGenerationFailure {
  const candidate = error && typeof error === "object" ? error as FailureLike : {};
  const code = KNOWN_CODES.has(candidate.code as GenerationErrorCode) ? candidate.code as GenerationErrorCode : "INTERNAL_ERROR";
  const status = typeof candidate.status === "number" && candidate.status >= 400 && candidate.status <= 599 ? candidate.status : 500;
  const retryAfterMs = typeof candidate.retryAfterMs === "number" && Number.isFinite(candidate.retryAfterMs) ? candidate.retryAfterMs : undefined;
  return {
    error: "generation_failed",
    code,
    message: safeMessage(candidate, code),
    action: actionFor(code),
    retryable: retryableFor(code),
    operation: context.operation,
    status,
    ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
  };
}

export function sendGenerationFailure(res: Response, error: unknown, context: { operation: string }): NormalizedGenerationFailure {
  const normalized = normalizeGenerationFailure(error, context);
  const { status, ...payload } = normalized;
  res.status(status).json(payload);
  return normalized;
}

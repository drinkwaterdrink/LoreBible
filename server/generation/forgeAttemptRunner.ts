import { ModelGatewayError } from "../model/gateway.js";

export interface ForgeAttemptResult {
  value: unknown;
  finishReason?: string;
}

export interface ForgeAttemptEvent {
  attempt: number;
  maximum: number;
  phase: "request" | "validation" | "correction" | "failed";
  code?: string;
}

const NON_RETRYABLE_CODES = new Set([
  "CLIENT_DISCONNECTED",
  "CREDENTIAL_MISSING",
  "AUTHENTICATION_FAILED",
  "MODEL_UNAVAILABLE",
  "QUOTA_EXHAUSTED",
  "PROFILE_NOT_FOUND",
  "PROVIDER_UNAVAILABLE",
  "REQUEST_TIMEOUT",
]);

function issueText(error: unknown): string {
  const forgeError = error as ModelGatewayError & { issues?: unknown };
  const issues = error instanceof ModelGatewayError && Array.isArray(forgeError.issues)
    ? forgeError.issues
    : [{ path: "", code: "schema", expected: "one complete object matching OUTPUT_SCHEMA", actual: error instanceof ModelGatewayError ? error.code : "validation_failed" }];
  return JSON.stringify(issues.slice(0, 20));
}

function isRecoverable(error: unknown): boolean {
  if (!(error instanceof ModelGatewayError)) return false;
  if (error.code === "INVALID_STRUCTURED_OUTPUT" || error.code === "INTERNAL_ERROR") return true;
  return false;
}

export async function runForgeAttempts<T>(input: {
  request: (args: { correction: string | null; signal?: AbortSignal }) => Promise<ForgeAttemptResult>;
  validate: (value: unknown) => T;
  signal?: AbortSignal;
  onEvent?: (event: ForgeAttemptEvent) => void;
}): Promise<T> {
  const maximum = 2;
  let correction: string | null = null;
  for (let attempt = 1; attempt <= maximum; attempt += 1) {
    input.signal?.throwIfAborted();
    input.onEvent?.({ attempt, maximum, phase: "request" });
    let result: ForgeAttemptResult;
    try {
      result = await input.request({ correction, signal: input.signal });
    } catch (error) {
      input.onEvent?.({ attempt, maximum, phase: "failed", code: error instanceof ModelGatewayError ? error.code : "INTERNAL_ERROR" });
      throw error;
    }
    if (result.finishReason === "length" || result.finishReason === "max_tokens") {
      const error = new ModelGatewayError("The provider reached its output limit before completing this Forge response. Smaller specialist jobs are required for this content.", "INVALID_STRUCTURED_OUTPUT", 502);
      input.onEvent?.({ attempt, maximum, phase: "failed", code: error.code });
      throw error;
    }
    input.onEvent?.({ attempt, maximum, phase: "validation" });
    try {
      const validated = input.validate(result.value);
      input.onEvent?.({ attempt, maximum, phase: "correction" });
      return validated;
    } catch (error) {
      const code = error instanceof ModelGatewayError ? error.code : "INTERNAL_ERROR";
      input.onEvent?.({ attempt, maximum, phase: "failed", code });
      if (attempt >= maximum || !isRecoverable(error)) throw error;
      correction = issueText(error);
      input.onEvent?.({ attempt, maximum, phase: "correction", code });
    }
  }
  throw new ModelGatewayError("Forge validation failed after one correction.", "INVALID_STRUCTURED_OUTPUT", 502);
}

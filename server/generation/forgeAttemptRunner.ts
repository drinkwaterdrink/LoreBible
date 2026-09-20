import { ModelGatewayError, StructuredOutputTruncatedError } from "../model/gateway.js";

export interface ForgeAttemptResult {
  value: unknown;
  finishReason?: string;
  outputMode?: "native_schema" | "json_only" | "prompt_contract" | "gemini_sdk_schema";
}

export interface ForgeAttemptEvent {
  attempt: number;
  maximum: number;
  phase: "request" | "validation" | "correction" | "failed";
  code?: string;
  outputMode?: ForgeAttemptResult["outputMode"];
  topLevelType?: "object" | "array" | "null" | "string" | "number" | "boolean" | "undefined" | "other";
  issueCount?: number;
  elapsedMs?: number;
}

function topLevelType(value: unknown): NonNullable<ForgeAttemptEvent["topLevelType"]> {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const kind = typeof value;
  return kind === "object" || kind === "string" || kind === "number" || kind === "boolean" || kind === "undefined" ? kind : "other";
}

function issueCount(error: unknown): number {
  if (error instanceof ModelGatewayError && "issues" in error && Array.isArray(error.issues)) return error.issues.length || 1;
  return 1;
}

function issueText(error: unknown): string {
  const forgeError = error as ModelGatewayError & { issues?: unknown };
  const issues = error instanceof ModelGatewayError && Array.isArray(forgeError.issues)
    ? forgeError.issues
    : [{ path: "", code: "schema", expected: "one complete object matching OUTPUT_SCHEMA", actual: error instanceof ModelGatewayError ? error.code : "validation_failed" }];
  return JSON.stringify(issues.slice(0, 20));
}

function isRecoverable(error: unknown): boolean {
  return error instanceof ModelGatewayError && !(error instanceof StructuredOutputTruncatedError) && error.code === "INVALID_STRUCTURED_OUTPUT";
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
    const requestStarted = performance.now();
    let result: ForgeAttemptResult;
    try {
      result = await input.request({ correction, signal: input.signal });
    } catch (error) {
      const code = error instanceof ModelGatewayError ? error.code : "INTERNAL_ERROR";
      if (attempt >= maximum || !isRecoverable(error)) {
        input.onEvent?.({ attempt, maximum, phase: "failed", code, issueCount: issueCount(error), elapsedMs: performance.now() - requestStarted });
        throw error;
      }
      correction = issueText(error);
      input.onEvent?.({ attempt, maximum, phase: "correction", code });
      continue;
    }
    if (result.finishReason === "length" || result.finishReason === "max_tokens") {
      const error = new StructuredOutputTruncatedError();
      input.onEvent?.({ attempt, maximum, phase: "failed", code: error.code, outputMode: result.outputMode, topLevelType: topLevelType(result.value), issueCount: 1, elapsedMs: performance.now() - requestStarted });
      throw error;
    }
    input.onEvent?.({ attempt, maximum, phase: "validation", outputMode: result.outputMode, topLevelType: topLevelType(result.value), elapsedMs: performance.now() - requestStarted });
    const validationStarted = performance.now();
    try {
      const validated = input.validate(result.value);
      return validated;
    } catch (error) {
      const code = error instanceof ModelGatewayError ? error.code : "INTERNAL_ERROR";
      if (attempt >= maximum || !isRecoverable(error)) {
        input.onEvent?.({ attempt, maximum, phase: "failed", code, outputMode: result.outputMode, topLevelType: topLevelType(result.value), issueCount: issueCount(error), elapsedMs: performance.now() - validationStarted });
        throw error;
      }
      correction = issueText(error);
      input.onEvent?.({ attempt, maximum, phase: "correction", code });
    }
  }
  throw new ModelGatewayError("Forge validation failed after one correction.", "INVALID_STRUCTURED_OUTPUT", 502);
}

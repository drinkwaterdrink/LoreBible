export type GenerationTask = "anchors" | "premises" | "divergence" | "forge";

export type GenerationPhase =
  | "requesting"
  | "waiting"
  | "validating"
  | "architect"
  | "critic"
  | "writer"
  | "forge_bundle"
  | "retrying"
  | "complete"
  | "cancelled"
  | "error";

export interface GenerationUsage {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}

export interface GenerationProgressEvent {
  task: GenerationTask;
  phase: GenerationPhase;
  label: string;
  completedSteps?: number;
  totalSteps?: number;
  attempt?: number;
  maxAttempts?: number;
}

export type GenerationTerminalEvent =
  | { type: "done"; task: GenerationTask; result: unknown }
  | { type: "cancelled"; task: GenerationTask; message: string }
  | { type: "error"; task: GenerationTask; message: string; code?: string; action?: "retry" | "change_model" | "open_connections"; retryable?: boolean; retryAfterMs?: number };

export type GenerationStreamEvent =
  | ({ type: "progress" } & GenerationProgressEvent)
  | { type: "reasoning"; task: GenerationTask; delta: string; complete?: boolean }
  | { type: "usage"; task: GenerationTask; usage: GenerationUsage }
  | { type: "provider_activity"; task: GenerationTask; at: number }
  | { type: "output_delta"; task: GenerationTask; characters: number }
  | { type: "heartbeat"; task: GenerationTask }
  | { type: "section"; task: "forge"; key: string; data: unknown }
  | GenerationTerminalEvent;

const TASKS = new Set<GenerationTask>(["anchors", "premises", "divergence", "forge"]);
const PHASES = new Set<GenerationPhase>(["requesting", "waiting", "validating", "architect", "critic", "writer", "forge_bundle", "retrying", "complete", "cancelled", "error"]);

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Generation event must be an object.");
  return value as Record<string, unknown>;
}

function task(value: unknown): GenerationTask {
  if (!TASKS.has(value as GenerationTask)) throw new TypeError("Generation event task is invalid.");
  return value as GenerationTask;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`Generation event ${field} must be a number.`);
  return value;
}

export function parseGenerationStreamEvent(value: unknown): GenerationStreamEvent {
  const input = record(value);
  const eventType = input.type;
  if (typeof eventType !== "string") throw new TypeError("Generation event type is required.");
  const eventTask = task(input.task);
  if (eventType === "progress") {
    if (!PHASES.has(input.phase as GenerationPhase)) throw new TypeError("Generation event phase is invalid.");
    if (typeof input.label !== "string") throw new TypeError("Generation event label is required.");
    return {
      type: "progress", task: eventTask, phase: input.phase as GenerationPhase, label: input.label,
      completedSteps: optionalNumber(input.completedSteps, "completedSteps"),
      totalSteps: optionalNumber(input.totalSteps, "totalSteps"),
      attempt: optionalNumber(input.attempt, "attempt"),
      maxAttempts: optionalNumber(input.maxAttempts, "maxAttempts"),
    };
  }
  if (eventType === "reasoning") {
    if (typeof input.delta !== "string") throw new TypeError("Generation reasoning delta must be a string.");
    return { type: "reasoning", task: eventTask, delta: input.delta, complete: input.complete === true || undefined };
  }
  if (eventType === "usage") {
    const usage = record(input.usage);
    return { type: "usage", task: eventTask, usage: {
      inputTokens: optionalNumber(usage.inputTokens, "inputTokens"),
      outputTokens: optionalNumber(usage.outputTokens, "outputTokens"),
      reasoningTokens: optionalNumber(usage.reasoningTokens, "reasoningTokens"),
    } };
  }
  if (eventType === "provider_activity") {
    const at = optionalNumber(input.at, "at");
    if (at === undefined) throw new TypeError("Generation provider activity timestamp is required.");
    return { type: "provider_activity", task: eventTask, at };
  }
  if (eventType === "output_delta") {
    const characters = optionalNumber(input.characters, "characters");
    if (characters === undefined || characters < 0) throw new TypeError("Generation output delta characters are invalid.");
    return { type: "output_delta", task: eventTask, characters };
  }
  if (eventType === "heartbeat") return { type: "heartbeat", task: eventTask };
  if (eventType === "section") {
    if (eventTask !== "forge" || typeof input.key !== "string" || !("data" in input)) throw new TypeError("Forge section event is invalid.");
    return { type: "section", task: "forge", key: input.key, data: input.data };
  }
  if (eventType === "done") {
    if (!("result" in input)) throw new TypeError("Generation done result is required.");
    return { type: "done", task: eventTask, result: input.result };
  }
  if (eventType === "cancelled") {
    if (typeof input.message !== "string") throw new TypeError("Generation cancellation message is required.");
    return { type: "cancelled", task: eventTask, message: input.message };
  }
  if (eventType === "error") {
    if (typeof input.message !== "string") throw new TypeError("Generation error message is required.");
    const action = input.action === "retry" || input.action === "change_model" || input.action === "open_connections" ? input.action : undefined;
    return {
      type: "error", task: eventTask, message: input.message,
      code: typeof input.code === "string" ? input.code : undefined,
      action,
      retryable: typeof input.retryable === "boolean" ? input.retryable : undefined,
      retryAfterMs: optionalNumber(input.retryAfterMs, "retryAfterMs"),
    };
  }
  throw new TypeError(`Unknown generation event type: ${eventType}`);
}

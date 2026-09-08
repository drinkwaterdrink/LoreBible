export type ProviderTimeoutKind = "FIRST_EVENT_TIMEOUT" | "INACTIVITY_TIMEOUT" | "OVERALL_TIMEOUT";

export interface ProviderDeadlineOptions {
  callerSignal?: AbortSignal;
  firstEventMs: number;
  inactivityMs: number;
  overallMs: number;
}

export interface ProviderDeadlineController {
  signal: AbortSignal;
  readonly timeoutKind: ProviderTimeoutKind | null;
  markActivity(): void;
  dispose(): void;
}

export function createProviderDeadlineController(options: ProviderDeadlineOptions): ProviderDeadlineController {
  const controller = new AbortController();
  let timeoutKind: ProviderTimeoutKind | null = null;
  let firstTimer: ReturnType<typeof setTimeout> | null = null;
  let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  let overallTimer: ReturnType<typeof setTimeout> | null = null;

  const abortFor = (kind: ProviderTimeoutKind) => {
    if (controller.signal.aborted) return;
    timeoutKind = kind;
    controller.abort(new DOMException(kind, "TimeoutError"));
  };
  const onCallerAbort = () => {
    if (!controller.signal.aborted) controller.abort(options.callerSignal?.reason || new DOMException("Cancelled", "AbortError"));
  };
  if (options.callerSignal?.aborted) onCallerAbort();
  else options.callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

  firstTimer = setTimeout(() => abortFor("FIRST_EVENT_TIMEOUT"), Math.max(1, options.firstEventMs));
  overallTimer = setTimeout(() => abortFor("OVERALL_TIMEOUT"), Math.max(1, options.overallMs));

  const dispose = () => {
    if (firstTimer) clearTimeout(firstTimer);
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (overallTimer) clearTimeout(overallTimer);
    firstTimer = inactivityTimer = overallTimer = null;
    options.callerSignal?.removeEventListener("abort", onCallerAbort);
  };

  return {
    signal: controller.signal,
    get timeoutKind() { return timeoutKind; },
    markActivity() {
      if (controller.signal.aborted) return;
      if (firstTimer) clearTimeout(firstTimer);
      firstTimer = null;
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => abortFor("INACTIVITY_TIMEOUT"), Math.max(1, options.inactivityMs));
    },
    dispose,
  };
}

export function maxOutputTokensForStage(stageName: string): number {
  const normalized = stageName.toLowerCase();
  if (normalized.includes("forge")) return 16000;
  if (normalized.includes("divergence writer")) return 12000;
  if (normalized.includes("divergence architect")) return 6000;
  if (normalized.includes("divergence critic")) return 2500;
  if (normalized.includes("spark")) return 4000;
  return 10000;
}

export function lowerReasoningEffort(effort: "low" | "medium" | "high"): "low" | "medium" | "high" {
  return effort === "high" ? "medium" : "low";
}

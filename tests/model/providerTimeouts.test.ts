import { expect, test } from "bun:test";
import { createProviderDeadlineController, lowerReasoningEffort, maxOutputTokensForStage } from "../../server/model/providerTimeouts";

async function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
}

test("deadline controller distinguishes first event, inactivity, and overall timeouts", async () => {
  const first = createProviderDeadlineController({ firstEventMs: 15, inactivityMs: 40, overallMs: 80 });
  await waitForAbort(first.signal);
  expect(first.timeoutKind).toBe("FIRST_EVENT_TIMEOUT");
  first.dispose();

  const inactive = createProviderDeadlineController({ firstEventMs: 50, inactivityMs: 15, overallMs: 80 });
  inactive.markActivity();
  await waitForAbort(inactive.signal);
  expect(inactive.timeoutKind).toBe("INACTIVITY_TIMEOUT");
  inactive.dispose();

  const overall = createProviderDeadlineController({ firstEventMs: 50, inactivityMs: 30, overallMs: 45 });
  const timer = setInterval(() => overall.markActivity(), 8);
  await waitForAbort(overall.signal);
  clearInterval(timer);
  expect(overall.timeoutKind).toBe("OVERALL_TIMEOUT");
  overall.dispose();
});

test("caller cancellation is not classified as a provider timeout", async () => {
  const caller = new AbortController();
  const deadlines = createProviderDeadlineController({ callerSignal: caller.signal, firstEventMs: 100, inactivityMs: 100, overallMs: 100 });
  caller.abort();
  await waitForAbort(deadlines.signal);
  expect(deadlines.timeoutKind).toBe(null);
  deadlines.dispose();
});

test("stage output limits reserve the largest budget for writer and forge output", () => {
  expect(maxOutputTokensForStage("Divergence Architect")).toBe(6000);
  expect(maxOutputTokensForStage("Divergence Critic")).toBe(2500);
  expect(maxOutputTokensForStage("Divergence Writer")).toBe(12000);
  expect(maxOutputTokensForStage("Forge Bundle 2")).toBe(16000);
  expect(maxOutputTokensForStage("Spark DNA Parse")).toBe(4000);
});

test("timeout retry lowers reasoning by one level without going below low", () => {
  expect(lowerReasoningEffort("high")).toBe("medium");
  expect(lowerReasoningEffort("medium")).toBe("low");
  expect(lowerReasoningEffort("low")).toBe("low");
});

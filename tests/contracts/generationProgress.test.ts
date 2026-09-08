import { expect, test } from "bun:test";
import { parseGenerationStreamEvent } from "../../src/contracts/generationProgress";

test("parses a structured generation progress event", () => {
  expect(parseGenerationStreamEvent({
    type: "progress",
    task: "forge",
    phase: "forge_bundle",
    label: "Forging bundle 2 of 6",
    completedSteps: 1,
    totalSteps: 6,
    attempt: 2,
    maxAttempts: 3,
  })).toEqual({
    type: "progress",
    task: "forge",
    phase: "forge_bundle",
    label: "Forging bundle 2 of 6",
    completedSteps: 1,
    totalSteps: 6,
    attempt: 2,
    maxAttempts: 3,
  });
});

test("parses reasoning and usage events", () => {
  expect(parseGenerationStreamEvent({ type: "reasoning", task: "divergence", delta: "checking branches", complete: true })).toMatchObject({ type: "reasoning", delta: "checking branches" });
  expect(parseGenerationStreamEvent({ type: "usage", task: "forge", usage: { inputTokens: 12, outputTokens: 8, reasoningTokens: 4 } })).toMatchObject({ usage: { reasoningTokens: 4 } });
  expect(parseGenerationStreamEvent({ type: "provider_activity", task: "divergence", at: 1234 })).toEqual({ type: "provider_activity", task: "divergence", at: 1234 });
  expect(parseGenerationStreamEvent({ type: "output_delta", task: "divergence", characters: 27 })).toEqual({ type: "output_delta", task: "divergence", characters: 27 });
});

test("rejects malformed generation events", () => {
  expect(() => parseGenerationStreamEvent({ type: "progress", task: "unknown", phase: "waiting", label: "bad" })).toThrow("task");
  expect(() => parseGenerationStreamEvent({ type: "reasoning", task: "forge", delta: 12 })).toThrow("reasoning");
  expect(() => parseGenerationStreamEvent({ type: "done", task: "forge" })).toThrow("result");
});

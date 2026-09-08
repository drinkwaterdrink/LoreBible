import { expect, test } from "bun:test";
import { normalizeProviderReasoning } from "../../server/model/reasoning";
import { appendBoundedReasoning } from "../../src/lib/reasoningBuffer";

test("normalizes common provider reasoning and reasoning-token usage", () => {
  expect(normalizeProviderReasoning({
    choices: [{ message: { reasoning: "considering alternatives" } }],
    usage: { completion_tokens_details: { reasoning_tokens: 42 } },
  })).toEqual({ text: "considering alternatives", reasoningTokens: 42 });
  expect(normalizeProviderReasoning({
    choices: [{ message: { reasoning_content: "checking structure" } }],
  })).toEqual({ text: "checking structure", reasoningTokens: undefined });
  expect(normalizeProviderReasoning({
    choices: [{ message: {} }],
    usage: { reasoning_tokens: 19 },
  })).toEqual({ text: undefined, reasoningTokens: 19 });
});

test("normalizes reasoning content parts without treating answer text as reasoning", () => {
  expect(normalizeProviderReasoning({ choices: [{ message: { content: [
    { type: "reasoning", text: "first" },
    { type: "text", text: "answer" },
    { type: "reasoning", text: " second" },
  ] } }] })).toEqual({ text: "first second", reasoningTokens: undefined });
});

test("ignores malformed or missing provider reasoning", () => {
  expect(normalizeProviderReasoning({ choices: [{ message: { reasoning: 12 } }] })).toEqual({ text: undefined, reasoningTokens: undefined });
  expect(normalizeProviderReasoning(null)).toEqual({ text: undefined, reasoningTokens: undefined });
});

test("bounds accumulated reasoning to the display limit", () => {
  expect(appendBoundedReasoning("abc", "def", 5)).toEqual({ text: "abcde", truncated: true });
  expect(appendBoundedReasoning("abc", "d", 5)).toEqual({ text: "abcd", truncated: false });
});

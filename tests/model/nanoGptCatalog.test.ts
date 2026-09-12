import { expect, test } from "bun:test";
import { nanoGptSubscriptionModelsUrl, parseNanoGptPopularModelIds } from "../../server/model/nanoGptCatalog";

test("derives the documented NanoGPT subscription catalog endpoint", () => {
  expect(nanoGptSubscriptionModelsUrl("https://nano-gpt.com/api/v1")).toBe("https://nano-gpt.com/api/subscription/v1/models?detailed=true");
});

test("reads unique model order from the official public Popular page without executing markup", () => {
  const html = '<a href="/models/text/anthropic/claude-opus-5">A</a><a href="/models/text/qwen/qwen3.8%3Athinking">B</a><a href="/models/text/anthropic/claude-opus-5">again</a>';
  expect(parseNanoGptPopularModelIds(html)).toEqual(["anthropic/claude-opus-5", "qwen/qwen3.8:thinking"]);
  expect(parseNanoGptPopularModelIds("x".repeat(2_000_001))).toEqual([]);
});

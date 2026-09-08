import { describe, expect, test } from "bun:test";
import { CURATED_MODELS, GEMINI_CURATED_MODELS, findCuratedModel, getCatalogForProvider } from "../../src/lib/modelCatalog";

const requested = [
  "deepseek/deepseek-v4-pro-0813:thinking",
  "z-ai/glm-5.3:thinking",
  "z-ai/glm-5.3",
  "deepseek/deepseek-v4-pro-0813",
  "z-ai/glm-5.3-flash",
  "moonshotai/kimi-k2.7-code",
  "qwen/qwen3.8-27b-uncensored:thinking",
  "moonshotai/kimi-k2.6:thinking",
  "meta/muse-spark-1.3-contributor",
] as const;

describe("curated model catalog", () => {
  test("preserves every requested model ID in order", () => {
    expect(CURATED_MODELS.map((model) => model.id)).toEqual([...requested]);
  });
  test("offers the exact catalog to OpenRouter and NanoGPT", () => {
    expect(getCatalogForProvider("openrouter").map((model) => model.id)).toEqual([...requested]);
    expect(getCatalogForProvider("nanogpt").map((model) => model.id)).toEqual([...requested]);
    expect(getCatalogForProvider("gemini").map((model) => model.id)).toEqual(GEMINI_CURATED_MODELS.map((model) => model.id));
    expect(getCatalogForProvider("gemini").some((model) => model.id === "gemini-3.8-flash")).toBe(true);
  });
  test("matches thinking suffixes without normalization", () => {
    expect(findCuratedModel("openrouter", requested[0])?.id).toBe(requested[0]);
    expect(findCuratedModel("openrouter", "deepseek/deepseek-v4-pro-0813")).not.toBeUndefined();
    expect(findCuratedModel("openrouter", "deepseek/deepseek-v4-pro-0813:THINKING")).toBeUndefined();
  });
});

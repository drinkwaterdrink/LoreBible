import { describe, expect, test } from "bun:test";
import {
  fetchProviderModels,
  normalizeProviderModels,
} from "../../server/model/modelDiscovery";

describe("provider model discovery", () => {
  test("normalizes provider IDs and excludes models explicitly lacking text generation", () => {
    expect(normalizeProviderModels("gemini", {
      models: [
        { name: "models/gemini-text", supportedGenerationMethods: ["generateContent"] },
        { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
      ],
    })).toEqual(["gemini-text"]);

    expect(normalizeProviderModels("openrouter", {
      data: [
        { id: "vendor/text", architecture: { output_modalities: ["text"] } },
        { id: "vendor/image", architecture: { output_modalities: ["image"] } },
        { id: "vendor/unknown" },
      ],
    })).toEqual(["vendor/text", "vendor/unknown"]);

    expect(normalizeProviderModels("nanogpt", {
      data: [{ id: "models/nano-text" }, { id: "bad\nmodel" }, { id: "" }],
    })).toEqual(["nano-text"]);
  });

  test("discovery aborts at its own deadline instead of hanging indefinitely", async () => {
    let observedAbort = false;
    const stalledFetch = async (_input: string, init?: RequestInit): Promise<Response> => {
      await new Promise<void>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          observedAbort = true;
          reject(new DOMException("aborted", "AbortError"));
        }, { once: true });
      });
      throw new Error("unreachable");
    };

    await expect(fetchProviderModels(stalledFetch, "https://provider.test/models", {}, 10)).rejects.toThrow("timed out");
    expect(observedAbort).toBe(true);
  });
});

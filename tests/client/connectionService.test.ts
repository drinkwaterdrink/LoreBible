import { expect, test } from "bun:test";
import { listConnections, saveConnection } from "../../src/services/connectionsService";

test("connection service refuses a response containing secret fields", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ profiles: [{ id: "p1", apiKey: "sk-secret" }] }), { status: 200 })) as unknown as typeof fetch;
  try {
    await expect(listConnections()).rejects.toThrow("secret material");
  } finally { globalThis.fetch = originalFetch; }
});

test("connection service omits blank API keys when saving", async () => {
  const originalFetch = globalThis.fetch;
  let body: Record<string, unknown> | null = null;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => { body = JSON.parse(String(init?.body)) as Record<string, unknown>; return new Response(JSON.stringify({ profile: { id: "p1", name: "OpenRouter", provider: "openrouter", baseUrl: "", keyHint: null, hasSecret: false, createdAt: "", updatedAt: "", lastTestedAt: null, lastTestStatus: "untested" } }), { status: 201 }); }) as unknown as typeof fetch;
  try {
    await saveConnection({ name: "OpenRouter", provider: "openrouter", apiKey: "" });
    expect((body as Record<string, unknown> | null)?.apiKey).toBeUndefined();
  } finally { globalThis.fetch = originalFetch; }
});

test("connection service sends an explicit custom model list", async () => {
  const originalFetch = globalThis.fetch;
  let body: Record<string, unknown> | null = null;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      profile: {
        id: "p1",
        name: "OpenRouter",
        provider: "openrouter",
        baseUrl: "",
        keyHint: null,
        hasSecret: false,
        createdAt: "",
        updatedAt: "",
        lastTestedAt: null,
        lastTestStatus: "untested",
        customModelIds: ["vendor/custom"],
      },
    }), { status: 200 });
  }) as unknown as typeof fetch;
  try {
    await saveConnection({ id: "p1", name: "OpenRouter", provider: "openrouter", customModelIds: ["vendor/custom"] });
    expect((body as Record<string, unknown> | null)?.customModelIds).toEqual(["vendor/custom"]);
  } finally { globalThis.fetch = originalFetch; }
});

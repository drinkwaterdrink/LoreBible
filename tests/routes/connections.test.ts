import express from "express";
import { expect, test } from "bun:test";
import { registerConnectionRoutes } from "../../server/routes/connections";
import { createProfileStore, type SecretProtector } from "../../server/secrets/profileStore";

const protector: SecretProtector = {
  async protect(value) { return `cipher:${Buffer.from(value).toString("base64")}`; },
  async unprotect(value) { return Buffer.from(value.slice("cipher:".length), "base64").toString("utf8"); },
};

async function withApp(fetchImpl: (input: string, init?: RequestInit) => Promise<Response>, callback: (baseUrl: string) => Promise<void>, discoveryTimeoutMs?: number) {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-route-test-${crypto.randomUUID()}.json`;
  const app = express();
  app.use(express.json());
  registerConnectionRoutes(app, { store: createProfileStore(path, protector), fetchImpl, discoveryTimeoutMs });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  try { await callback(`http://127.0.0.1:${address.port}`); } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

test("profile APIs return redacted metadata", async () => {
  await withApp(fetch, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/connections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "OpenRouter", provider: "openrouter", apiKey: "sk-secret" }) });
    expect(created.status).toBe(201);
    const body = await created.json();
    expect(body.profile.hasSecret).toBe(true);
    expect(JSON.stringify(body)).not.toContain("sk-secret");
    expect(JSON.stringify(body)).not.toContain("secretCiphertext");
  });
});

test("connection test maps a 401 to authentication failure", async () => {
  const unauthorized = async () => new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401 });
  await withApp(unauthorized, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/connections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "NanoGPT", provider: "nanogpt", apiKey: "sk-secret" }) });
    const profile = (await created.json()).profile;
    const tested = await fetch(`${baseUrl}/api/connections/${profile.id}/test`, { method: "POST" });
    expect(tested.status).toBe(401);
    expect((await tested.json()).code).toBe("AUTHENTICATION_FAILED");
  });
});

test("model availability keeps curated IDs visible when provider omits one", async () => {
  const models = async () => new Response(JSON.stringify({ data: [{ id: "z-ai/glm-5.3" }] }), { status: 200 });
  await withApp(models, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/connections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "OpenRouter", provider: "openrouter", apiKey: "sk-secret" }) });
    const profile = (await created.json()).profile;
    const result = await fetch(`${baseUrl}/api/connections/${profile.id}/models`);
    const body = await result.json();
    expect(body.models).toHaveLength(9);
    expect(body.models.find((model: { id: string }) => model.id === "z-ai/glm-5.3").available).toBe(true);
    expect(body.models.find((model: { id: string }) => model.id === "z-ai/glm-5.3:thinking").available).toBe(false);
  });
});

test("connection APIs persist and expose profile-scoped custom models", async () => {
  const models = async () => new Response(JSON.stringify({ data: [] }), { status: 200 });
  await withApp(models, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "NanoGPT",
        provider: "nanogpt",
        apiKey: "sk-secret",
        customModelIds: ["vendor/private-preview:thinking", "z-ai/glm-5.3"],
      }),
    });
    const createdBody = await created.json();
    expect(createdBody.profile.customModelIds).toEqual(["vendor/private-preview:thinking", "z-ai/glm-5.3"]);
    expect(JSON.stringify(createdBody)).not.toContain("sk-secret");

    const result = await fetch(`${baseUrl}/api/connections/${createdBody.profile.id}/models`);
    const body = await result.json();
    expect(body.models.filter((model: { id: string }) => model.id === "z-ai/glm-5.3")).toHaveLength(1);
    expect(body.models.find((model: { id: string }) => model.id === "vendor/private-preview:thinking")).toEqual({
      id: "vendor/private-preview:thinking",
      label: "vendor/private-preview:thinking",
      reasoning: "optional",
      available: true,
      custom: true,
      subscriptionIncluded: false,
    });
  });
});

test("NanoGPT models include live recency, subscription membership, and official site popularity rank", async () => {
  const provider = async (input: string) => {
    if (input === "https://cake.nano-gpt.com/models/text") return new Response('<a href="/models/text/z-ai/glm-5.3">GLM</a><a href="/models/text/vendor/newest">Newest</a>', { status: 200 });
    if (input.includes("/api/subscription/v1/models")) return new Response(JSON.stringify({ data: [{ id: "z-ai/glm-5.3" }] }), { status: 200 });
    return new Response(JSON.stringify({ data: [{ id: "vendor/newest", name: "Newest Model", created: 200 }, { id: "z-ai/glm-5.3", name: "GLM 5.3", created: 100 }] }), { status: 200 });
  };
  await withApp(provider, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/connections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "NanoGPT", provider: "nanogpt", apiKey: "sk-secret" }) });
    const profile = (await created.json()).profile;
    const body = await (await fetch(`${baseUrl}/api/connections/${profile.id}/models`)).json();
    expect(body.models.find((model: { id: string }) => model.id === "z-ai/glm-5.3")).toMatchObject({ created: 100, popularRank: 1, subscriptionIncluded: true });
    expect(body.models.find((model: { id: string }) => model.id === "vendor/newest")).toMatchObject({ label: "Newest Model", created: 200, popularRank: 2 });
    expect(body.models.find((model: { id: string }) => model.id === "vendor/newest").subscriptionIncluded).toBe(false);
  });
});

test("Gemini AI Studio profiles test and discover models through the compatibility API", async () => {
  const requests: Array<{ url: string; authorization: string | null }> = [];
  const models = async (input: string, init?: RequestInit) => {
    requests.push({ url: input, authorization: new Headers(init?.headers).get("Authorization") });
    return new Response(JSON.stringify({
      object: "list",
      data: [
        { id: "models/gemini-3.8-flash", object: "model", owned_by: "google" },
        { id: "models/gemini-2.0-flash", object: "model", owned_by: "google" },
        { id: "models/gemini-custom-preview", object: "model", owned_by: "google" },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  await withApp(models, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "AI Studio",
        provider: "gemini",
        apiKey: "gemini-secret",
        customModelIds: ["gemini-custom-preview"],
      }),
    });
    const profile = (await created.json()).profile;
    expect(profile.baseUrl).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
    expect(JSON.stringify(profile)).not.toContain("gemini-secret");

    const tested = await fetch(`${baseUrl}/api/connections/${profile.id}/test`, { method: "POST" });
    expect(tested.status).toBe(200);
    expect(await tested.json()).toEqual({ status: "available", provider: "gemini", modelCount: 3 });

    const discovered = await fetch(`${baseUrl}/api/connections/${profile.id}/models`);
    const body = await discovered.json();
    expect(body.models.find((model: { id: string }) => model.id === "gemini-3.8-flash").available).toBe(true);
    expect(body.models.find((model: { id: string }) => model.id === "gemini-2.0-flash")).toEqual({
      id: "gemini-2.0-flash",
      label: "gemini-2.0-flash",
      reasoning: "optional",
      available: true,
      providerReported: true,
    });
    expect(body.models.find((model: { id: string }) => model.id === "gemini-custom-preview")).toMatchObject({ custom: true, available: true });
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.url === "https://generativelanguage.googleapis.com/v1beta/openai/models")).toBe(true);
    expect(requests.every((request) => request.authorization === "Bearer gemini-secret")).toBe(true);
  });
});

test("selected-model test performs a real minimal structured generation", async () => {
  let generationBody: any;
  const provider = async (input: string, init?: RequestInit) => {
    if (input.endsWith("/chat/completions")) {
      generationBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ model: "gemini-2.5-flash", choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ data: [{ id: "models/gemini-2.5-flash" }] }), { status: 200 });
  };
  await withApp(provider, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/connections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "AI Studio", provider: "gemini", apiKey: "gemini-secret" }) });
    const profile = (await created.json()).profile;
    const response = await fetch(`${baseUrl}/api/connections/${profile.id}/generation-test`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId: "gemini-2.5-flash" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "generated", provider: "gemini", modelId: "gemini-2.5-flash" });
    expect(generationBody.response_format.type).toBe("json_schema");
    expect(JSON.stringify(generationBody)).not.toContain("gemini-secret");
  });
});

test("model discovery returns an actionable deadline error when a provider stalls", async () => {
  const stalled = async (_input: string, init?: RequestInit): Promise<Response> => {
    await new Promise<void>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
    throw new Error("unreachable");
  };
  await withApp(stalled, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/api/connections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Slow provider", provider: "openrouter", apiKey: "sk-secret" }),
    });
    const profile = (await created.json()).profile;
    const response = await fetch(`${baseUrl}/api/connections/${profile.id}/models`);
    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({
      code: "MODEL_DISCOVERY_TIMEOUT",
      message: "Model discovery timed out. Retry, or add the exact model ID as a custom model.",
    });
  }, 10);
});

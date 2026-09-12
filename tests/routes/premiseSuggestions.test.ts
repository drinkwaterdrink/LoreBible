import express from "express";
import { expect, test } from "bun:test";
import { registerPremiseSuggestionRoutes } from "../../server/routes/premiseSuggestions";
import { consumeGenerationSse } from "../../src/services/sseStream";
import { ModelGatewayError, type ModelGateway } from "../../server/model/gateway";

async function withApp(gateway: Pick<ModelGateway, "generate"> | null, callback: (baseUrl: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  registerPremiseSuggestionRoutes(app, { gateway });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not bind");
  try { await callback(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

const settings = {
  quality: "Balanced",
  divergenceMode: "Exploratory",
  authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible" },
  modelSelection: { profileId: "profile-1", modelId: "vendor/model" },
};

const validSet = {
  schemaVersion: 1,
  suggestions: ["a", "b", "c", "d"].map((id) => ({ id, title: `Title ${id}`, premise: `Premise ${id}`, category: "Original" })),
};

test("premise route emits one validated generated set", async () => {
  let requests = 0;
  const gateway = { async generate() {
    requests += 1;
    return { text: JSON.stringify(validSet), parsed: validSet, provenance: { provider: "openrouter" as const, profileId: "profile-1", modelRequested: "vendor/model", modelReported: "vendor/model", repaired: false, offlineFallback: false } };
  } };
  await withApp(gateway, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/premise-suggestions`, { method: "POST", headers: { "content-type": "application/json", accept: "text/event-stream" }, body: JSON.stringify({ settings }) });
    const terminal = await consumeGenerationSse(response, { onEvent: () => undefined });
    expect(terminal).toMatchObject({ type: "done", task: "premises", result: validSet });
    expect(requests).toBe(1);
  });
});

test("premise route rejects invalid provider output without returning authored replacements", async () => {
  const gateway = { async generate() {
    return { text: "{}", parsed: { schemaVersion: 1, suggestions: [] }, provenance: { provider: "openrouter" as const, profileId: "profile-1", modelRequested: "vendor/model", modelReported: "vendor/model", repaired: false, offlineFallback: false } };
  } };
  await withApp(gateway, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/premise-suggestions`, { method: "POST", headers: { "content-type": "application/json", accept: "text/event-stream" }, body: JSON.stringify({ settings }) });
    const terminal = await consumeGenerationSse(response, { onEvent: () => undefined });
    expect(terminal).toMatchObject({ type: "error", task: "premises", code: "INVALID_STRUCTURED_OUTPUT" });
    expect(JSON.stringify(terminal)).not.toContain("Memory Tuition");
  });
});

test("premise route reports a missing configured model", async () => {
  await withApp(null, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/premise-suggestions`, { method: "POST", headers: { "content-type": "application/json", accept: "text/event-stream" }, body: JSON.stringify({ settings: { ...settings, modelSelection: null } }) });
    const terminal = await consumeGenerationSse(response, { onEvent: () => undefined });
    expect(terminal).toMatchObject({ type: "error", task: "premises", code: "CREDENTIAL_MISSING", action: "open_connections" });
  });
});

test("premise route maps provider errors to actionable terminal events", async () => {
  const gateway = { async generate() { throw new ModelGatewayError("Rate limited", "RATE_LIMITED", 429, "gemini"); } };
  await withApp(gateway, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/premise-suggestions`, { method: "POST", headers: { "content-type": "application/json", accept: "text/event-stream" }, body: JSON.stringify({ settings }) });
    const terminal = await consumeGenerationSse(response, { onEvent: () => undefined });
    expect(terminal).toMatchObject({ type: "error", task: "premises", code: "RATE_LIMITED", retryable: true });
  });
});

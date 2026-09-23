import express from "express";
import { expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerPromptRoutes } from "../../server/routes/prompts";
import { createPromptProfileStore } from "../../server/prompts/promptProfileStore";

async function withApp(callback: (baseUrl: string) => Promise<void>) {
  const app = express(); app.use(express.json());
  registerPromptRoutes(app, { store: createPromptProfileStore(join(tmpdir(), `lore-bible-prompt-routes-${crypto.randomUUID()}.json`)) });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("test server did not bind");
  try { await callback(`http://127.0.0.1:${address.port}`); } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
}

test("prompt catalog returns editable defaults and protected summaries without private context", async () => {
  await withApp(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/prompts`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.registryVersion).toBe("1");
    expect(body.features.find((item: { id: string }) => item.id === "forge.core").protectedRequirements.length).toBeGreaterThan(0);
    expect(body.profiles).toEqual([]);
    expect(JSON.stringify(body)).not.toContain("SOURCE_CONTEXT");
  });
});

test("prompt profile routes enforce optimistic revisions", async () => {
  await withApp(async (baseUrl) => {
    const createdResponse = await fetch(`${baseUrl}/api/prompts/profiles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "My profile", overrides: [] }) });
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()).profile;
    const updatedResponse = await fetch(`${baseUrl}/api/prompts/profiles/${created.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: 1, name: "Changed", overrides: [] }) });
    expect(updatedResponse.status).toBe(200);
    expect((await updatedResponse.json()).profile.revision).toBe(2);
    const stale = await fetch(`${baseUrl}/api/prompts/profiles/${created.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: 1, name: "Stale", overrides: [] }) });
    expect(stale.status).toBe(409);
    expect((await stale.json()).code).toBe("PROMPT_PROFILE_CONFLICT");
  });
});

test("prompt profile routes reject unknown feature IDs instead of saving them", async () => {
  await withApp(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/prompts/profiles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Bad", overrides: [{ featureId: "forge.fake", baseVersion: 1, text: "x", revision: 1 }] }) });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_PROMPT_PROFILE");
  });
});

import express from "express";
import { expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerPromptRoutes } from "../../server/routes/prompts";
import { createPromptProfileStore } from "../../server/prompts/promptProfileStore";
import { blueprintSelectionFixture } from "../fixtures/blueprintSelection";

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

test("compiled preview is explicit, uses saved profile plus project override, and performs no generation", async () => {
  await withApp(async (baseUrl) => {
    const createdResponse = await fetch(`${baseUrl}/api/prompts/profiles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Preview profile", overrides: [{ featureId: "forge.core", baseVersion: 1, text: "Application direction", revision: 1 }] }) });
    const profile = (await createdResponse.json()).profile;
    const selection = { ...structuredClone(blueprintSelectionFixture), lorebookRange: { min: 12, ideal: 20, max: 28 } };
    const response = await fetch(`${baseUrl}/api/prompts/compile-preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureId: "forge.core", profileId: profile.id, projectOverrides: [{ featureId: "forge.core", baseVersion: 1, text: "Project direction", revision: 1 }], selection, sourceContext: "Private canon context" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.preview.userPrompt).toContain("Project direction");
    expect(body.preview.userPrompt).toContain("Private canon context");
    expect(body.preview.disclosure).toEqual({ includesPrivateProjectContext: true, generationPerformed: false, manuscriptMutated: false });
  });
});

test("compiled preview rejects missing profiles and malformed Blueprint input", async () => {
  await withApp(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/api/prompts/compile-preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureId: "forge.core", profileId: "missing", projectOverrides: [], selection: blueprintSelectionFixture, sourceContext: "Context" }) });
    expect(missing.status).toBe(404);
    const malformed = await fetch(`${baseUrl}/api/prompts/compile-preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureId: "forge.core", profileId: null, projectOverrides: [], selection: { bad: true }, sourceContext: "Context" }) });
    expect(malformed.status).toBe(400);
  });
});

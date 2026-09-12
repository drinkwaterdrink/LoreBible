import { expect, test } from "bun:test";
import { formatConnectionDiagnostics, runtimeCompatibilityMessage } from "../../src/lib/runtimeDiagnostics";

test("detects a stale server that cannot support the current connection diagnostics", () => {
  expect(runtimeCompatibilityMessage({ status: "ok" }, "0.42")).toContain("older server");
  expect(runtimeCompatibilityMessage({ status: "ok", version: "0.41", capabilities: { selectedModelGenerationTest: true } }, "0.42")).toContain("older server");
  expect(runtimeCompatibilityMessage({ status: "ok", version: "0.42", capabilities: { selectedModelGenerationTest: true, connectionModelMetadata: true, diagnostics: true } }, "0.42")).toBeNull();
});

test("formats useful connection diagnostics without secrets", () => {
  const text = formatConnectionDiagnostics({
    appVersion: "0.42",
    runtime: { status: "ok", version: "0.41" },
    browser: "Test Browser",
    profile: { id: "profile-1", name: "AI Studio", provider: "gemini", baseUrl: "https://example.test/v1beta/openai", hasSecret: true },
    selectedModelId: "gemini-2.5-flash",
    catalog: [{ id: "gemini-2.5-flash", available: true, subscriptionIncluded: false }],
    sort: "newest",
    subscriptionOnly: false,
    error: "Request failed with HTTP 404",
  });
  expect(text).toContain("LoreBible connection diagnostics");
  expect(text).toContain("gemini-2.5-flash");
  expect(text).toContain("HTTP 404");
  expect(text).not.toContain("apiKey");
  expect(text).not.toContain("secret");
});

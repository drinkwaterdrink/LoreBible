import { expect, test } from "bun:test";
import { createForgePreflight } from "../../src/lib/forgePreflight";
import { blueprintSelectionFixture } from "../fixtures/blueprintSelection";

test("specialist preflight keeps library and runtime budgets separate", () => {
  const selection = structuredClone(blueprintSelectionFixture);
  selection.loreLibraryBudget = { mode: "custom", targetTokens: 30_000, maxTokens: 30_000 };
  selection.runtimeTokenBudget = { mode: "custom", tokens: 8_000 };
  const report = createForgePreflight({ selection, modelId: "gemini-3.8-flash", sourceCharacters: 24_000, executionMode: "continuous" });
  expect(report.libraryTargetTokens).toBe(30_000);
  expect(report.runtimeActivationTokens).toBe(8_000);
  expect(report.sourceContextTokens).toBe(6_000);
  expect(report.requestCount).toBeGreaterThan(6);
  expect(report.largestExpectedOutputTokens).toBeLessThanOrEqual(2_400);
  expect(report.capacityEvidence).toBe("unknown");
  expect(report.findings.some(finding => finding.code === "model.capacity_unverified")).toBe(true);
});

test("single request preflight warns when combined output is likely oversized", () => {
  const selection = structuredClone(blueprintSelectionFixture);
  selection.lorebookRange = { min: 60, ideal: 90, max: 120 };
  selection.forgeExecutionPreference = "single_request";
  const report = createForgePreflight({ selection, modelId: "glm-5.3", sourceCharacters: 8_000, executionMode: "single_request" });
  expect(report.requestCount).toBe(1);
  expect(report.largestExpectedOutputTokens).toBe(report.totalExpectedOutputTokens);
  expect(report.findings).toContainEqual(expect.objectContaining({ code: "forge.single_request_output_risk", severity: "major" }));
  expect(report.recommendedExecutionMode).toBe("continuous");
});

test("preflight reports a missing model as a blocker", () => {
  const report = createForgePreflight({ selection: blueprintSelectionFixture, modelId: null, sourceCharacters: 0, executionMode: "continuous" });
  expect(report.findings).toContainEqual(expect.objectContaining({ code: "model.selection_required", severity: "blocker" }));
});

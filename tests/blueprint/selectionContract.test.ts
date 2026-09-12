import { expect, test } from "bun:test";
import { parseBlueprintSelectionV1, type BlueprintSelectionV1 } from "../../src/contracts/blueprintSelection";

export const validSelection: BlueprintSelectionV1 = {
  schema: "lorebible.blueprint-selection/v1",
  projectId: "project:one",
  sourceProjectRevision: 3,
  sourceRecommendationFingerprint: "abc123",
  interfaceMode: "guided",
  artifactTargets: ["scenario_card"],
  worldMode: "sandbox",
  buildIntensity: "rich",
  generationQuality: "deep_craft",
  runtimeBudget: "balanced",
  lorebookScale: "custom",
  lorebookRange: { min: 30, ideal: 45, max: 70 },
  principalCastRange: { min: 2, ideal: 4, max: 6 },
  rosterCastRange: { min: 3, ideal: 8, max: 12 },
  everydayLifeDetail: 4,
  categories: [{ id: "shops", label: "Shops", purpose: "Retail life", justification: "The premise centers on commerce.", status: "recommended", detail: "rich", targetRange: { min: 2, ideal: 4, max: 7 }, likelyRuntimeRole: "ambient", candidateArchitectures: ["focused_reference_entries"], userLocked: true, userExplanation: "Keep this.", custom: true }],
  mechanicPacks: [{ id: "social_ecosystem", label: "Social Ecosystem", enabled: true, eligible: true, reason: "Cast evidence", architectureEffects: ["relationships"], runtimeRequirements: [], compilerRules: ["conditional"], testFixtures: ["near miss"], gracefulFallback: "Keyword retrieval", userLocked: true }],
  forgeExecutionPreference: "step_by_step",
  lockedFields: ["worldMode"],
  createdAt: "2026-09-12T12:00:00.000Z",
  updatedAt: "2026-09-12T12:00:00.000Z",
};

test("accepts a complete Blueprint selection and returns a detached value", () => {
  const parsed = parseBlueprintSelectionV1(validSelection);
  expect(parsed).toEqual({ ok: true, value: validSelection });
  if (parsed.ok) expect(parsed.value).not.toBe(validSelection);
});

test("rejects invalid ranges, duplicate IDs, unknown fields, and credential-shaped fields", () => {
  expect(parseBlueprintSelectionV1({ ...validSelection, lorebookRange: { min: 20, ideal: 10, max: 30 } }).ok).toBe(false);
  expect(parseBlueprintSelectionV1({ ...validSelection, categories: [validSelection.categories[0], validSelection.categories[0]] }).ok).toBe(false);
  expect(parseBlueprintSelectionV1({ ...validSelection, surprise: true }).ok).toBe(false);
  expect(parseBlueprintSelectionV1({ ...validSelection, api_key: "forbidden" }).ok).toBe(false);
});

test("rejects cyclic and accessor input without throwing", () => {
  const cyclic: any = { ...validSelection }; cyclic.loop = cyclic;
  expect(() => parseBlueprintSelectionV1(cyclic)).not.toThrow();
  expect(parseBlueprintSelectionV1(cyclic).ok).toBe(false);
  const accessor = { ...validSelection } as any;
  Object.defineProperty(accessor, "projectId", { get() { throw new Error("must not run"); }, enumerable: true });
  expect(() => parseBlueprintSelectionV1(accessor)).not.toThrow();
  expect(parseBlueprintSelectionV1(accessor).ok).toBe(false);
});

import { expect, test } from "bun:test";
import { parseBlueprintPlan, parseBlueprintPreviewRequest, type BlueprintPlanV1, type BlueprintPreviewRequestV1 } from "../../src/contracts/blueprint";

const validPlan: BlueprintPlanV1 = {
  schema: "lorebible.blueprint-plan/v1",
  source: { projectId: "project-1", projectRevision: 7, inputSha256: "a".repeat(64), plannerVersion: "1" },
  interfaceMode: "smart_auto",
  artifactTargets: [{ value: "scenario_card", status: "proposed", reason: "The selected take is a focused scenario.", evidenceRefs: ["take:pitch"] }],
  worldMode: { value: "arc", status: "proposed", reason: "The premise names a focused progression.", evidenceRefs: ["take:pitch"] },
  buildIntensity: { value: "lean", status: "proposed", reason: "The supplied evidence is intentionally narrow.", evidenceRefs: ["take:pitch"] },
  generationQuality: { value: "balanced", status: "proposed", reason: "The current project setting is balanced.", evidenceRefs: ["settings:generation-quality"] },
  runtimeBudget: { value: "efficient", status: "proposed", reason: "The plan has a small proposed inventory.", evidenceRefs: ["inventory:nodes"] },
  categories: [{
    id: "locations", label: "Locations", purpose: "Ground the scenario in explicit places.", justification: "The premise names a workplace.",
    status: "recommended", detail: "standard", targetRange: { min: 1, ideal: 2, max: 3 }, likelyRuntimeRole: "reference",
    candidateArchitectures: [{ value: "location_reference", status: "proposed", reason: "Places are explicitly named.", evidenceRefs: ["take:pitch"] }],
    userLocked: false, evidenceRefs: ["take:pitch"],
  }],
  mechanicPacks: [{ id: "social_ecosystem", label: "Social Ecosystem", status: "optional", reason: "Social cues are present but narrow.", evidenceRefs: ["take:pitch"] }],
  assessments: {
    ordinaryLife: { status: "supported", evidenceRefs: ["take:pitch"], gaps: [], explanation: "Routine evidence is available." },
    worldAutonomy: { status: "thin", evidenceRefs: ["take:pitch"], gaps: ["No independent activity is supplied."], explanation: "The premise does not establish independent activity." },
  },
  inventory: { nodes: { min: 1, ideal: 2, max: 3 }, modelCalls: { min: 1, ideal: 1, max: 2 }, artifacts: ["scenario_card"] },
  findings: [{ id: "finding-1", severity: "info", code: "narrow_scope", message: "The plan remains deliberately focused.", evidenceRefs: ["take:pitch"] }],
  createdAt: "2026-09-10T00:00:00.000Z",
};

const validRequest: BlueprintPreviewRequestV1 = {
  expectedRevision: 7,
  context: {
    projectId: "project-1",
    projectRevision: 7,
    selectedTake: { id: "take-1", title: "A focused take", pitch: "A scenario at a workplace", angle: "Personal stakes", genres: ["drama"], tone: ["warm"], retainedNonNegotiables: ["Keep it grounded."] },
    generationQuality: "balanced",
  },
};

test("accepts a complete valid Blueprint plan unchanged", () => {
  expect(parseBlueprintPlan(validPlan)).toEqual({ ok: true, value: validPlan });
});

test("rejects invalid plan controls, ranges, recommendations, and duplicate IDs", () => {
  expect(parseBlueprintPlan({ ...validPlan, worldMode: { ...validPlan.worldMode, value: "linear" } })).toMatchObject({ ok: false });
  expect(parseBlueprintPlan({ ...validPlan, categories: [{ ...validPlan.categories[0], targetRange: { min: 4, ideal: 2, max: 1 } }] })).toMatchObject({ ok: false });
  expect(parseBlueprintPlan({ ...validPlan, artifactTargets: [{ value: "scenario_card", status: "proposed", reason: "", evidenceRefs: [] }] })).toMatchObject({ ok: false });
  expect(parseBlueprintPlan({ ...validPlan, categories: [validPlan.categories[0], validPlan.categories[0]] })).toMatchObject({ ok: false });
});

test("accepts finite nonnegative decimal estimate ranges", () => {
  expect(parseBlueprintPlan({ ...validPlan, inventory: { ...validPlan.inventory, modelCalls: { min: 0.5, ideal: 1.5, max: 2.5 } } })).toMatchObject({ ok: true });
});

test("rejects credential-shaped fields recursively in preview requests", () => {
  expect(parseBlueprintPreviewRequest({ ...validRequest, apiKey: "forbidden" })).toMatchObject({ ok: false });
  expect(parseBlueprintPreviewRequest({ ...validRequest, context: { ...validRequest.context, selectedTake: { ...validRequest.context.selectedTake, nested: { access_token: "forbidden" } } } })).toMatchObject({ ok: false });
});

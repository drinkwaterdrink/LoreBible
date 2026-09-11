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

test("rejects unknown request fields and returns a new allowlisted DTO", () => {
  expect(parseBlueprintPreviewRequest({ ...validRequest, extensions: {} })).toMatchObject({ ok: false });
  expect(parseBlueprintPreviewRequest({ ...validRequest, context: { ...validRequest.context, rawSource: "forbidden" } })).toMatchObject({ ok: false });
  expect(parseBlueprintPreviewRequest({ ...validRequest, context: { ...validRequest.context, selectedTake: { ...validRequest.context.selectedTake!, sourcePath: "forbidden" } } })).toMatchObject({ ok: false });
  const parsed = parseBlueprintPreviewRequest(validRequest);
  expect(parsed).toMatchObject({ ok: true });
  if (parsed.ok) expect(parsed.value).not.toBe(validRequest);
});

test("screens comprehensive credential-shaped keys without rejecting estimatedTokens", () => {
  for (const key of ["password", "credentials", "clientSecret", "refreshToken", "privateKey", "authorization", "bearer", "token"]) {
    expect(parseBlueprintPreviewRequest({ ...validRequest, context: { ...validRequest.context, sparkDna: { [key]: "forbidden" } } })).toMatchObject({ ok: false });
  }
  const estimatedTokens = parseBlueprintPreviewRequest({ ...validRequest, context: { ...validRequest.context, sparkDna: { premisePromise: "A premise", estimatedTokens: 120 } } });
  expect(estimatedTokens).toMatchObject({ ok: false });
  if (estimatedTokens.ok === false) expect(estimatedTokens.issues.some(entry => entry.message.includes("Credential-shaped"))).toBe(false);
});

test("validates every planning-context collection and scalar shape", () => {
  const complete = {
    ...validRequest,
    context: {
      ...validRequest.context,
      sparkDna: { premisePromise: "A premise", nonNegotiables: ["Keep it grounded"], toneEnvelope: { primary: "warm", descriptors: ["quiet"] }, genreSignals: ["drama"], playerAgencyBoundaries: "User chooses", openVariables: [], existingPressures: [], assumptions: [], opportunitySpace: [], userRole: null, franchise: null },
      physicsConstraints: { density: "Standard", strangeness: 2, mundanity: 4, violence: "Implied", horror: "low", romance: "Subplot", humor: "dry", pacing: "Measured", explicitContent: "Fade", playerDeath: "Only if earned", linguisticBase: "English", mustInclude: "family", mustAvoid: "magic" },
      graphFacts: [{ id: "fact-1", predicate: "located_in", value: "town", status: "canon", origin: "user", visibility: "public", temporalClass: "current" }],
      graphEntities: [{ id: "entity-1", type: "location", name: "Town", importance: "major", lifecycle: "active" }],
      relationshipCount: 2,
      knowledgeClaimCount: 1,
    },
  };
  expect(parseBlueprintPreviewRequest(complete)).toMatchObject({ ok: true });
  expect(parseBlueprintPreviewRequest({ ...complete, context: { ...complete.context, selectedTake: { ...complete.context.selectedTake!, genres: "drama" } } })).toMatchObject({ ok: false });
  expect(parseBlueprintPreviewRequest({ ...complete, context: { ...complete.context, graphFacts: [{ ...complete.context.graphFacts[0], visibility: "all" }] } })).toMatchObject({ ok: false });
  expect(parseBlueprintPreviewRequest({ ...complete, context: { ...complete.context, graphEntities: [{ ...complete.context.graphEntities[0], lifecycle: "forever" }] } })).toMatchObject({ ok: false });
  expect(parseBlueprintPreviewRequest({ ...complete, context: { ...complete.context, relationshipCount: -1 } })).toMatchObject({ ok: false });
  expect(parseBlueprintPreviewRequest({ ...complete, context: { ...complete.context, sparkDna: { ...complete.context.sparkDna, toneEnvelope: "warm" } } })).toMatchObject({ ok: false });
  expect(parseBlueprintPreviewRequest({ ...complete, context: { ...complete.context, physicsConstraints: { ...complete.context.physicsConstraints, density: "Dense" } } })).toMatchObject({ ok: false });
});

test("rejects hostile cyclic inputs without throwing", () => {
  const cyclic: Record<string, unknown> = { ...validRequest };
  cyclic.self = cyclic;
  expect(() => parseBlueprintPreviewRequest(cyclic)).not.toThrow();
  expect(parseBlueprintPreviewRequest(cyclic)).toMatchObject({ ok: false });
  expect(parseBlueprintPlan({ ...validPlan, createdAt: "2026/09/10" })).toMatchObject({ ok: false });
});

test("rejects array-owned serializer and credential data without executing it", () => {
  const genres = ["drama"] as string[] & { rawSource?: string; password?: string; toJSON?: () => unknown };
  genres.rawSource = "forbidden";
  genres.password = "forbidden";
  genres.toJSON = () => ({ rawSource: "serializer output", password: "serializer secret" });
  const hostile = { ...validRequest, context: { ...validRequest.context, selectedTake: { ...validRequest.context.selectedTake!, genres } } };
  expect(parseBlueprintPreviewRequest(hostile)).toMatchObject({ ok: false });
  const silentSerializer = ["drama"] as string[] & { toJSON?: () => unknown };
  Object.defineProperty(silentSerializer, "toJSON", { value: () => ({ rawSource: "hidden" }), enumerable: false });
  expect(parseBlueprintPreviewRequest({ ...validRequest, context: { ...validRequest.context, selectedTake: { ...validRequest.context.selectedTake!, genres: silentSerializer } } })).toMatchObject({ ok: false });
  expect(parseBlueprintPlan({ ...validPlan, createdAt: "2026-02-30T00:00:00Z" })).toMatchObject({ ok: false });
});

test("rejects changing accessors before validation and copying", () => {
  let reads = 0;
  const hostile: Record<string, unknown> = { expectedRevision: 7 };
  Object.defineProperty(hostile, "context", { enumerable: true, get: () => { reads++; return reads === 1 ? validRequest.context : { rawSource: "forbidden" }; } });
  expect(parseBlueprintPreviewRequest(hostile)).toMatchObject({ ok: false });
  expect(reads).toBe(0);
});

test("rejects Array subclasses with overridden traversal methods", () => {
  class HostileArray extends Array<string> {
    override forEach(callbackfn: (value: string, index: number, array: string[]) => void, thisArg?: unknown) { throw new Error("must not run"); }
    override map<U>(callbackfn: (value: string, index: number, array: string[]) => U, thisArg?: unknown): U[] { throw new Error("must not run"); }
  }
  const genres = new HostileArray("drama");
  expect(() => parseBlueprintPreviewRequest({ ...validRequest, context: { ...validRequest.context, selectedTake: { ...validRequest.context.selectedTake!, genres } } })).not.toThrow();
  expect(parseBlueprintPreviewRequest({ ...validRequest, context: { ...validRequest.context, selectedTake: { ...validRequest.context.selectedTake!, genres } } })).toMatchObject({ ok: false });
});

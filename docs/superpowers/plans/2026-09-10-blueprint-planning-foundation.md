# Blueprint Planning Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a read-only, premise-adaptive Blueprint preview that proposes a justified build inventory from one selected Project Graph revision without changing V2 saves, graph canon, Physics, or Forge.

**Architecture:** A versioned shared contract separates sanitized legacy planning context from authoritative Project Graph data. A pure deterministic planner builds evidence-bearing recommendations; an internal revision-checked API and focused client service expose the result in a mobile-safe panel launched from Project Graph Beta.

**Tech Stack:** TypeScript, Bun, Express, React, Vite, existing SavedProjectV2 and ProjectGraphV1 contracts.

**Spec:** `docs/superpowers/specs/2026-09-10-blueprint-planning-foundation-design.md`

## Global Constraints

- SavedProjectV2 remains the live application authority; Blueprint output is proposal-only.
- The planner must not read `ProjectGraphV1.extensions`, raw migration source, browser storage, repository paths, or credentials.
- Recommendations require explicit evidence and must not introduce factions, magic, secrets, romance, institutions, combat, or ticking clocks as generic defaults.
- Artifact target, world mode, build intensity, generation quality, and runtime budget remain independent.
- M2.1 does not alter the current five-stage wizard, Physics, Forge, or artifact serializers.
- No model call, provider reasoning, price estimate, duration estimate, or Lumiverse runtime claim is permitted.
- Release as v0.41 on `test`; M2 remains in progress at 9 of 17 complete.

---

### Task 1: Versioned Blueprint contracts and parser

**Files:**
- Create: `src/contracts/blueprint.ts`
- Test: `tests/blueprint/contract.test.ts`

**Interfaces:**
- Produces: `BLUEPRINT_PLAN_SCHEMA`, `BlueprintPreviewRequestV1`, `BlueprintPlanningContextV1`, `BlueprintPlanV1`, `LoreCategoryPlan`, `BlueprintRecommendation<T>`, `parseBlueprintPreviewRequest(value)`, and `parseBlueprintPlan(value)`.
- Consumed by: Tasks 2–5.

- [ ] **Step 1: Write the failing contract tests**

Create fixtures with all control enums, one category, one mechanic pack, both assessments, estimates, findings, source revision, checksum, planner version, and timestamp. Assert:

```ts
expect(parseBlueprintPlan(validPlan)).toEqual({ ok: true, value: validPlan });
expect(parseBlueprintPlan({ ...validPlan, worldMode: { ...validPlan.worldMode, value: "linear" } })).toMatchObject({ ok: false });
expect(parseBlueprintPlan({ ...validPlan, categories: [{ ...validPlan.categories[0], targetRange: { min: 4, ideal: 2, max: 1 } }] })).toMatchObject({ ok: false });
expect(parseBlueprintPlan({ ...validPlan, artifactTargets: [{ value: "scenario_card", status: "proposed", reason: "", evidenceRefs: [] }] })).toMatchObject({ ok: false });
expect(parseBlueprintPlan({ ...validPlan, categories: [validPlan.categories[0], validPlan.categories[0]] })).toMatchObject({ ok: false });
expect(parseBlueprintPreviewRequest({ ...validRequest, apiKey: "forbidden" })).toMatchObject({ ok: false });
```

- [ ] **Step 2: Run the contract test and verify RED**

Run: `bun test tests/blueprint/contract.test.ts`  
Expected: FAIL because `src/contracts/blueprint.ts` does not exist.

- [ ] **Step 3: Implement the exact contract**

Use these central shapes:

```ts
export const BLUEPRINT_PLAN_SCHEMA = "lorebible.blueprint-plan/v1" as const;
export type ArtifactTarget = "individual_character" | "scenario_card" | "narrator_world" | "ensemble" | "full_world" | "full_world_package" | "world_book_primary";
export type BlueprintWorldMode = "arc" | "sandbox" | "hybrid";
export type BuildIntensity = "lean" | "rich" | "deluxe" | "obsessive";
export type BlueprintGenerationQuality = "fast" | "balanced" | "deep_craft" | "production";
export type RuntimeBudget = "efficient" | "balanced" | "expansive";

export interface BlueprintRecommendation<T> {
  value: T;
  status: "proposed";
  reason: string;
  evidenceRefs: string[];
}

export interface BlueprintPreviewRequestV1 {
  expectedRevision: number;
  context: BlueprintPlanningContextV1;
}

export interface BlueprintPlanV1 {
  schema: typeof BLUEPRINT_PLAN_SCHEMA;
  source: { projectId: string; projectRevision: number; inputSha256: string; plannerVersion: "1" };
  interfaceMode: "smart_auto";
  artifactTargets: BlueprintRecommendation<ArtifactTarget>[];
  worldMode: BlueprintRecommendation<BlueprintWorldMode>;
  buildIntensity: BlueprintRecommendation<BuildIntensity>;
  generationQuality: BlueprintRecommendation<BlueprintGenerationQuality>;
  runtimeBudget: BlueprintRecommendation<RuntimeBudget>;
  categories: LoreCategoryPlan[];
  mechanicPacks: MechanicPackRecommendation[];
  assessments: { ordinaryLife: BlueprintAssessment; worldAutonomy: BlueprintAssessment };
  inventory: { nodes: EstimateRange; modelCalls: EstimateRange; artifacts: string[] };
  findings: BlueprintFinding[];
  createdAt: string;
}
```

Validate recursively against credential-shaped keys, require finite nonnegative ascending ranges, unique IDs, known enums, nonempty reasons/evidence for recommendations, and safe bounded strings. Return `{ok:true,value}` or `{ok:false,issues}` with field paths; never throw raw parser internals through HTTP.

- [ ] **Step 4: Run the contract test and typecheck**

Run: `bun test tests/blueprint/contract.test.ts && bun run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add src/contracts/blueprint.ts tests/blueprint/contract.test.ts
git commit -m "feat: define blueprint planning contracts"
```

---

### Task 2: Sanitized SavedProjectV2 planning adapter

**Files:**
- Create: `src/lib/blueprint/planningContext.ts`
- Test: `tests/blueprint/planningContext.test.ts`

**Interfaces:**
- Consumes: `SavedLoreBibleProjectV2`, `BlueprintPlanningContextV1`.
- Produces: `createBlueprintPlanningContext(project: SavedLoreBibleProjectV2): BlueprintPlanningContextV1`.
- Consumed by: Task 5 client/App wiring.

- [ ] **Step 1: Write failing adapter tests**

Build a SavedProjectV2 containing SparkDNA, two takes with one selected, Physics constraints, Deep Craft settings, provenance, document prose, and a credential-shaped value inside an unrelated extension cast through the fixture. Assert:

```ts
const context = createBlueprintPlanningContext(project);
expect(context.selectedTake?.id).toBe(project.workflow.selectedTakeId);
expect(context.physics.mustAvoid).toBe(project.workflow.physics.mustAvoid);
expect(context.generationQuality).toBe("deep_craft");
expect(JSON.stringify(context)).not.toContain("provenance");
expect(JSON.stringify(context)).not.toContain("apiKey");
expect(JSON.stringify(context)).not.toContain("firstMessage");
expect(createBlueprintPlanningContext({ ...project, workflow: { ...project.workflow, selectedTakeId: "missing" } }).selectedTake).toBeNull();
```

- [ ] **Step 2: Run the adapter test and verify RED**

Run: `bun test tests/blueprint/planningContext.test.ts`  
Expected: FAIL because the adapter module does not exist.

- [ ] **Step 3: Implement explicit field picking**

Copy only canonical SparkDNA arrays/scalars, selected take summary fields, the named Physics fields, and the explicit quality mapping:

```ts
const QUALITY_MAP = {
  Fast: "fast",
  Balanced: "balanced",
  "Deep Craft": "deep_craft",
} as const;

export function createBlueprintPlanningContext(project: SavedLoreBibleProjectV2): BlueprintPlanningContextV1 {
  const selected = project.workflow.takes.find((take) => take.id === project.workflow.selectedTakeId) ?? null;
  return {
    spark: pickSpark(project.workflow.sparkParse),
    selectedTake: selected ? pickTake(selected) : null,
    physics: pickPhysics(project.workflow.physics),
    generationQuality: QUALITY_MAP[project.generation.settings.quality],
  };
}
```

Do not spread any source object. Missing SparkDNA fields remain null/empty according to the contract.

- [ ] **Step 4: Run adapter, persistence, and type tests**

Run: `bun test tests/blueprint/planningContext.test.ts tests/persistence/projectPersistence.test.ts tests/lib/projectWorkspace.test.ts && bun run typecheck`  
Expected: PASS with old save/restore behavior unchanged.

- [ ] **Step 5: Commit Task 2**

```powershell
git add src/lib/blueprint/planningContext.ts tests/blueprint/planningContext.test.ts
git commit -m "feat: sanitize blueprint planning context"
```

---

### Task 3: Evidence-backed deterministic planner

**Files:**
- Create: `src/lib/blueprint/signals.ts`
- Create: `src/lib/blueprint/planner.ts`
- Test: `tests/blueprint/planner.test.ts`
- Test fixtures: `tests/fixtures/blueprintPremises.ts`

**Interfaces:**
- Consumes: `{ graph: ProjectGraphV1; context: BlueprintPlanningContextV1 }` and `{ createdAt: string }`.
- Produces: `createBlueprintPlan(input, options): BlueprintPlanV1`.
- Internal: `collectBlueprintSignals(input): BlueprintSignal[]`, where each signal has `id`, `domain`, `concept`, `sourceRef`, and `weight`.
- Consumed by: Task 4 route.

- [ ] **Step 1: Write failing neutrality and contrast fixtures**

Encode six fixtures and assert exact category/pack outcomes:

```ts
expect(plan(cozyBakery).categoriesById.factions.status).toBe("omitted");
expect(plan(cozyBakery).categoriesById.magic_system.status).toBe("omitted");
expect(plan(familyVisit).categoriesById.relationships.detail).toBe("rich");
expect(plan(familyVisit).mechanicsById.social_ecosystem.status).toBe("recommended");
expect(plan(focusedRomance).inventory.nodes.max).toBeLessThanOrEqual(24);
expect(plan(warTornKingdom).categoriesById.factions.status).toBe("recommended");
expect(plan(scienceFictionCity).categoriesById.technology.status).toBe("recommended");
expect(plan(blankPremise).buildIntensity.value).toBe("lean");
expect(plan(mustAvoidMagic).categoriesById.magic_system.status).toBe("omitted");
```

Also assert that every recommended/required category and mechanic has evidence refs, no output reason contains copied secret/private/current fact text, `graph.extensions` has no effect, and the same input plus fixed `createdAt` is deeply equal.

- [ ] **Step 2: Run planner tests and verify RED**

Run: `bun test tests/blueprint/planner.test.ts`  
Expected: FAIL because planner and signal modules do not exist.

- [ ] **Step 3: Implement signal collection**

Define curated phrase families by domain with word-boundary matching. Normalize text with Unicode lowercase and whitespace folding. Collect from Spark premise/tone/genre/user-role/non-negotiables/opportunities, selected take, allowed Physics constraints, graph entity types, public/non-secret/non-current fact predicates, relationship count, and knowledge count.

Before positive matching, create an exclusion set from `physics.mustAvoid` and canonical player-agency boundaries. A prohibited concept removes the matching positive signal and creates evidence such as `constraint:mustAvoid:magic`; it never produces the prohibited text as a positive reason.

Never scan `graph.extensions`. Never place raw fact values in a `BlueprintSignal`.

- [ ] **Step 4: Implement conservative planning policy**

Use small named policy functions:

```ts
function recommendArtifactTargets(signals: BlueprintSignal[], graph: ProjectGraphV1): BlueprintRecommendation<ArtifactTarget>[];
function recommendWorldMode(signals: BlueprintSignal[]): BlueprintRecommendation<BlueprintWorldMode>;
function buildLoreMatrix(signals: BlueprintSignal[], graph: ProjectGraphV1): LoreCategoryPlan[];
function recommendMechanicPacks(signals: BlueprintSignal[], mode: BlueprintWorldMode): MechanicPackRecommendation[];
function assessCoverage(signals: BlueprintSignal[], mode: BlueprintWorldMode): BlueprintPlanV1["assessments"];
function estimateInventory(categories: LoreCategoryPlan[], targets: ArtifactTarget[], quality: BlueprintGenerationQuality): BlueprintPlanV1["inventory"];
```

Default a blank premise to a Lean Scenario Card proposal with `unknown` assessments and explicit insufficient-evidence findings. Emit supported categories plus the diagnostic omissions `factions`, `magic_system`, `secrets`, and `combat` when unsupported. Do not emit the entire category library.

Category ranges come from named category profiles selected by evidence strength and project scale. Quality changes call ranges only. Intensity changes category breadth/ranges only. Runtime budget stays `balanced` unless an explicit efficiency/expansive signal is provided.

- [ ] **Step 5: Run planner and graph validation tests**

Run: `bun test tests/blueprint/planner.test.ts tests/projectGraph/validation.test.ts tests/projectGraph/migrateSavedProjectV2.test.ts && bun run typecheck`  
Expected: PASS.

- [ ] **Step 6: Commit Task 3**

```powershell
git add src/lib/blueprint/signals.ts src/lib/blueprint/planner.ts tests/blueprint/planner.test.ts tests/fixtures/blueprintPremises.ts
git commit -m "feat: plan premise-adaptive blueprints"
```

---

### Task 4: Revision-checked Blueprint preview API

**Files:**
- Modify: `server/routes/projects.ts`
- Test: `tests/routes/projects.test.ts`

**Interfaces:**
- Consumes: `POST /api/projects/graph/:projectId/blueprint-preview` with `BlueprintPreviewRequestV1`.
- Produces: `{ plan: BlueprintPlanV1 }`, or safe `{ error: { code, message, expectedRevision?, actualRevision? } }`.

- [ ] **Step 1: Write failing API tests**

Extend the route harness to create a graph and post a valid sanitized request. Assert:

```ts
expect(response.status).toBe(200);
expect(body.plan.source).toMatchObject({ projectId: graph.project.id, projectRevision: 1 });
expect(JSON.stringify(body)).not.toContain("legacyDocumentId");
expect(JSON.stringify(body)).not.toContain("apiKey");
```

Post revision 9 and expect HTTP 409 `revision_conflict` with actual revision 1. Post a credential-shaped request and expect 422 `credential_rejected`. Post malformed ranges/types and expect 400 `invalid_blueprint_request`. Reload the graph after each rejected request and assert exact equality with the pre-request graph.

- [ ] **Step 2: Run route test and verify RED**

Run: `bun test tests/routes/projects.test.ts`  
Expected: FAIL with 404 for the missing Blueprint route.

- [ ] **Step 3: Implement the endpoint before the generic project-ID route**

Parse the request, load the authoritative graph, compare `expectedRevision`, and call the pure planner:

```ts
app.post("/api/projects/graph/:projectId/blueprint-preview", async (req, res) => {
  const parsed = parseBlueprintPreviewRequest(req.body);
  if (!parsed.ok) return res.status(parsed.credentialRejected ? 422 : 400).json({ error: safeBlueprintError(parsed) });
  const graph = await repository.load(req.params.projectId);
  if (!graph) return res.status(404).json({ error: { code: "missing", message: "Project was not found." } });
  if (graph.project.revision !== parsed.value.expectedRevision) return res.status(409).json({ error: revisionError(parsed.value.expectedRevision, graph.project.revision!) });
  return res.json({ plan: createBlueprintPlan({ graph, context: parsed.value.context }, { createdAt: new Date().toISOString() }) });
});
```

Do not persist the plan or mutate the graph. Route errors through safe domain messages without file paths or source payloads.

- [ ] **Step 4: Run route, planner, repository, and type tests**

Run: `bun test tests/routes/projects.test.ts tests/blueprint/planner.test.ts tests/projects/projectRepository.test.ts && bun run typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```powershell
git add server/routes/projects.ts tests/routes/projects.test.ts
git commit -m "feat: expose blueprint preview API"
```

---

### Task 5: Mobile Blueprint preview workflow

**Files:**
- Modify: `src/services/projectGraphService.ts`
- Create: `src/components/BlueprintPreviewPanel.tsx`
- Modify: `src/components/ProjectGraphPanel.tsx`
- Modify: `src/App.tsx`
- Test: `tests/client/projectGraphService.test.ts`
- Test: `tests/components/blueprintPreviewPanel.test.tsx`
- Modify: `tests/components/projectGraphPanel.test.tsx`

**Interfaces:**
- Adds: `previewBlueprint(projectId: string, request: BlueprintPreviewRequestV1, signal?: AbortSignal): Promise<BlueprintPlanV1>`.
- Adds Project Graph callback: `onPreviewBlueprint(): Promise<void>`.
- `BlueprintPreviewPanel` consumes `{ plan, onClose }`.

- [ ] **Step 1: Write failing service and component tests**

Assert the service posts only `{expectedRevision, context}`, forwards cancellation, returns the parsed plan, rejects credential-shaped response data, and preserves coded revision errors.

Render the panels server-side and assert:

```ts
expect(graphHtml).toContain("Preview Blueprint");
expect(graphHtml).toContain("Proposal only");
expect(previewHtml).toContain("Recommended build");
expect(previewHtml).toContain("Omitted with reason");
expect(previewHtml).toContain("Ordinary-life coverage");
expect(previewHtml).toContain("No runtime mechanic has been serialized");
expect(previewHtml).toContain("overflow-y-auto");
```

Test that a rejected preview promise leaves the prior `plan` prop rendered and that the launch button is disabled while busy.

- [ ] **Step 2: Run UI/service tests and verify RED**

Run: `bun test tests/client/projectGraphService.test.ts tests/components/projectGraphPanel.test.tsx tests/components/blueprintPreviewPanel.test.tsx`  
Expected: FAIL because the preview service, callback, and panel do not exist.

- [ ] **Step 3: Implement the service boundary**

Reuse the existing recursive response redaction and `ProjectGraphApiError`. Parse the returned plan before exposing it to React:

```ts
export async function previewBlueprint(projectId: string, request: BlueprintPreviewRequestV1, signal?: AbortSignal): Promise<BlueprintPlanV1> {
  const body = await json<{ plan: unknown }>(await fetch(`/api/projects/graph/${encodeURIComponent(projectId)}/blueprint-preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  }));
  const parsed = parseBlueprintPlan(body.plan);
  if (!parsed.ok) throw new ProjectGraphApiError("Blueprint response was invalid.", "invalid_blueprint_response", 502);
  return parsed.value;
}
```

- [ ] **Step 4: Implement App and Project Graph orchestration**

In App, derive the selected SavedProjectV2 through the prepared summary's `legacyDocumentId`; call `createBlueprintPlanningContext` locally; send expected active graph revision; preserve `blueprintPlan` on failure; clear it only when opening a different graph or accepting a newer graph revision. Use one `AbortController` for the active preview and cancel it on panel close/unmount.

Project Graph Beta shows a full-width mobile-safe `Preview Blueprint` button, busy label, proposal-only note, and actionable error. It does not imply the plan is saved.

- [ ] **Step 5: Implement the read-only preview panel**

Render semantic sections for recommended build, controls, artifact inventory, categories, omissions, mechanics, assessments, estimates, and findings. Reasons are visible without hover. Label node/call values as ranges and call counts as estimates. Do not show prices or duration.

Use `max-h-[94dvh] overflow-y-auto overscroll-contain`, stacked narrow-screen controls, sticky close header, and existing manuscript/rubric tokens. No toggle, checkbox, save, apply, or start-Forge control appears in M2.1.

- [ ] **Step 6: Run focused UI and lifecycle tests**

Run: `bun test tests/client/projectGraphService.test.ts tests/components/projectGraphPanel.test.tsx tests/components/blueprintPreviewPanel.test.tsx tests/components/vaultModal.test.tsx tests/client/sseStream.test.ts && bun run typecheck`  
Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```powershell
git add src/services/projectGraphService.ts src/components/BlueprintPreviewPanel.tsx src/components/ProjectGraphPanel.tsx src/App.tsx tests/client/projectGraphService.test.ts tests/components/blueprintPreviewPanel.test.tsx tests/components/projectGraphPanel.test.tsx
git commit -m "feat: add blueprint smart preview"
```

---

### Task 6: v0.41 release and evidence receipt

**Files:**
- Modify: `tests/contracts/version.test.ts`
- Modify: `tests/components/versionDisplay.test.tsx`
- Modify: `src/version.ts`
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/delivery-roadmap.md`
- Create: `docs/roadmap/m2-blueprint-planning-receipt.md`

**Interfaces:**
- Produces: visible v0.41, M2.1 receipt, and roadmap status retaining 9/17 complete with M2.2 next.

- [ ] **Step 1: Change version expectations and verify RED**

Set test expectations to `0.41` and `v0.41`.

Run: `bun test tests/contracts/version.test.ts tests/components/versionDisplay.test.tsx`  
Expected: FAIL because product/package versions remain 0.40.

- [ ] **Step 2: Update versions and release documentation**

Set `package.json` to `0.41.0` and `APP_VERSION` to `0.41`. Changelog and receipt must state:

- what Blueprint preview recommends and why;
- that it is proposal-only and non-persistent;
- that Physics and Forge are unchanged;
- exact fixture and structural evidence;
- rollback/preservation behavior;
- no model-quality, Lumiverse import, activation, price, or duration claim;
- M2 remains in progress, 9 of 17 complete and 8 remain;
- M2.2 editable/persisted Blueprint controls are next.

- [ ] **Step 3: Run fresh complete verification**

Run:

```powershell
bun test
bun run typecheck
bun run build
git diff --check
git status --short
```

Expected: all tests pass with zero failures; typecheck and build exit 0; diff check reports no whitespace errors. Record the exact test count and any build advisory in the receipt.

- [ ] **Step 4: Review scope against the spec**

Verify directly that no diff changes wizard stage numbering, `PhysicsStage`, `ForgeStage`, artifact serializers, provider gateways, connection storage, or V2 persistence schema. Confirm every recommendation carries evidence and every fixture assertion maps to the spec.

- [ ] **Step 5: Commit and push v0.41**

```powershell
git add package.json src/version.ts tests/contracts/version.test.ts tests/components/versionDisplay.test.tsx CHANGELOG.md docs/roadmap/delivery-roadmap.md docs/roadmap/m2-blueprint-planning-receipt.md
git commit -m "release: ship LoreBible v0.41"
git push origin test
```

- [ ] **Step 6: Verify published state**

Run:

```powershell
git status --short
git rev-parse HEAD
git rev-parse origin/test
```

Expected: clean worktree and identical hashes. Preserve the worktree for M2.2.

## Self-review record

- Spec sections 1–13 map to Tasks 1–6.
- Contract, adapter, planner, API, UI, preservation, evidence, versioning, and roadmap boundaries each have an explicit owner.
- Type names and function signatures are consistent between producer and consumer tasks.
- No placeholder implementation steps remain.
- M2.1 is independently testable and does not depend on implementing editable Blueprint controls.

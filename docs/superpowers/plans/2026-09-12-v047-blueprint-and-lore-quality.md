# v0.47 Blueprint Studio and Lore Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Stage 3 into a persistent, premise-adaptive Blueprint Studio and compile every lorebook through concise categorized titles plus a deterministic pre-export quality report.

**Architecture:** Keep the existing `BlueprintPlanV1` as an immutable recommendation and introduce a separately versioned `BlueprintSelectionV1` for accepted user decisions. Persist that selection through the existing V2 save/autosave path, use it to guide the compatibility Forge without replacing the manuscript model, then normalize and audit entries once in the canonical Lore Manifest before native and portable serialization.

**Tech Stack:** React 19, TypeScript, Vite, Bun tests, existing Express-compatible server routes, SavedProjectV2/localStorage persistence, canonical artifact IR and Lumiverse serializers.

**Spec:** `docs/superpowers/specs/2026-09-12-v047-blueprint-and-lore-quality-design.md`

## Global Constraints

- Preserve existing project data, accepted manuscript text, source IDs, native UIDs, connection profiles, and provider keys.
- Keep recommendation previews non-mutating. Only explicit acceptance or editing changes `BlueprintSelectionV1`.
- Never add creative filler to meet an entry target. Size presets are planning ranges, not quotas.
- Keep custom category identity separate from its display label.
- Never use lore content as a title fallback and never rewrite lore content merely to repair a title.
- Emit advanced activation settings only when an accepted mechanic pack and deterministic rule justify them.
- Treat deterministic checks as structural/simulated evidence, not observed Lumiverse runtime behavior.
- Use `apply_patch` for source edits. Run focused tests after each red/green step and commit each completed task.
- Preserve unrelated user changes and do not rewrite `server.ts` or the existing document model wholesale.

---

### Task 1: Add the canonical Blueprint selection contract

**Files:**
- Create: `src/contracts/blueprintSelection.ts`
- Create: `src/lib/blueprint/selection.ts`
- Test: `tests/blueprint/selectionContract.test.ts`
- Test: `tests/blueprint/selection.test.ts`

- [ ] **Step 1: Write failing parser tests**

Cover a valid selection, all three interface modes, custom categories, custom entry ranges, explicit omissions, locks, mechanic choices, execution preference, duplicate stable IDs, unknown fields, invalid ranges, accessor/cyclic input, and credential-shaped fields.

- [ ] **Step 2: Run the focused contract test and confirm red**

Run: `bun test tests/blueprint/selectionContract.test.ts`

Expected: failure because the selection contract does not exist.

- [ ] **Step 3: Implement the closed versioned contract**

Define:

```ts
export const BLUEPRINT_SELECTION_SCHEMA = "lorebible.blueprint-selection/v1" as const;
export type BlueprintInterfaceMode = "smart_auto" | "guided" | "expert";
export type LorebookScale = "compact" | "standard" | "large" | "massive" | "custom";
export type ForgeExecutionPreference = "continuous" | "step_by_step" | "single_request";

export interface BlueprintCategorySelection {
  id: string;
  label: string;
  purpose: string;
  justification: string;
  status: BlueprintCategoryStatus;
  detail: BlueprintDetail;
  targetRange: EstimateRange;
  likelyRuntimeRole: BlueprintRuntimeRole;
  candidateArchitectures: string[];
  userLocked: boolean;
  userExplanation: string;
  custom: boolean;
}

export interface BlueprintMechanicSelection {
  id: string;
  label: string;
  enabled: boolean;
  eligible: boolean;
  reason: string;
  architectureEffects: string[];
  runtimeRequirements: string[];
  compilerRules: string[];
  testFixtures: string[];
  gracefulFallback: string;
  userLocked: boolean;
}

export interface BlueprintSelectionV1 {
  schema: typeof BLUEPRINT_SELECTION_SCHEMA;
  projectId: string;
  sourceProjectRevision: number;
  sourceRecommendationFingerprint: string;
  interfaceMode: BlueprintInterfaceMode;
  artifactTargets: ArtifactTarget[];
  worldMode: BlueprintWorldMode;
  buildIntensity: BuildIntensity;
  generationQuality: BlueprintGenerationQuality;
  runtimeBudget: RuntimeBudget;
  lorebookScale: LorebookScale;
  lorebookRange: EstimateRange;
  principalCastRange: EstimateRange;
  rosterCastRange: EstimateRange;
  everydayLifeDetail: number;
  categories: BlueprintCategorySelection[];
  mechanicPacks: BlueprintMechanicSelection[];
  forgeExecutionPreference: ForgeExecutionPreference;
  lockedFields: string[];
  createdAt: string;
  updatedAt: string;
}
```

Export `parseBlueprintSelectionV1(value)` using the same defensive snapshot, closed-object, bounded-string, uniqueness, and credential rejection principles as `src/contracts/blueprint.ts`. Add immutable `LOREBOOK_SCALE_RANGES` with Compact 10/18/25, Standard 25/42/60, Large 60/90/120, and Massive 120/185/250.

- [ ] **Step 4: Run the contract test and confirm green**

Run: `bun test tests/blueprint/selectionContract.test.ts`

- [ ] **Step 5: Write failing selection lifecycle tests**

Test `createBlueprintSelection(plan, options)`, `reconcileBlueprintSelection(current, refreshedPlan)`, and `setLorebookScale(selection, scale, customRange?)`. Assert refreshed recommendations update unlocked values only, explicit omissions survive, category/mechanic locks survive, custom categories survive, and a preview never mutates the previous selection.

- [ ] **Step 6: Implement selection creation and reconciliation**

Create pure functions in `src/lib/blueprint/selection.ts`. Match categories and mechanics by stable ID; preserve locked/custom/explicitly omitted records; add new recommendations unlocked; remove stale unlocked recommendations only; deep-copy returned data.

- [ ] **Step 7: Run focused tests and commit**

Run: `bun test tests/blueprint/selectionContract.test.ts tests/blueprint/selection.test.ts`

Commit: `git commit -m "feat: add persistent blueprint selection contract"`

---

### Task 2: Make Blueprint state survive save, load, refresh, and legacy migration

**Files:**
- Modify: `src/lib/projectPersistence.ts`
- Modify: `src/lib/workspacePersistence.ts`
- Modify: `src/lib/projectWorkspace.ts`
- Modify: `src/types.ts`
- Test: `tests/persistence/projectPersistence.test.ts`
- Test: `tests/persistence/workspacePersistence.test.ts`
- Test: `tests/lib/projectWorkspace.test.ts`

- [ ] **Step 1: Write failing persistence tests**

Add fixtures proving `workflow.blueprintSelection` round-trips through SavedProjectV2 and active workspace autosave, and that projects without it still load unchanged. Test malformed selections are rejected without damaging the recoverable raw payload.

- [ ] **Step 2: Write failing Everyday-Life Detail compatibility tests**

Assert an existing `PhysicsConfig.mundanity` value becomes the Blueprint selection's `everydayLifeDetail` exactly and compatibility saves continue writing the same numeric `mundanity` value.

- [ ] **Step 3: Run focused tests and confirm red**

Run: `bun test tests/persistence/projectPersistence.test.ts tests/persistence/workspacePersistence.test.ts tests/lib/projectWorkspace.test.ts`

- [ ] **Step 4: Add optional Blueprint persistence**

Add `blueprintSelection?: BlueprintSelectionV1 | null` to `SavedLoreBibleProjectV2.workflow` and the active workspace snapshot. Validate it with `parseBlueprintSelectionV1`; retain the schema version at 2 because this is an optional backward-compatible field.

- [ ] **Step 5: Add lossless terminology migration**

Keep `PhysicsConfig.mundanity` as the compatibility storage field in v0.47. Add `getEverydayLifeDetail(physics)` and `withEverydayLifeDetail(physics, value)` in `src/lib/blueprint/selection.ts` so UI and Blueprint language change without data loss.

- [ ] **Step 6: Wire capture and restore helpers**

Update project workspace capture/restore inputs and results so the canonical selection is restored together with Stage 3 state and never cleared by a view-mode switch.

- [ ] **Step 7: Run focused tests and commit**

Run: `bun test tests/persistence/projectPersistence.test.ts tests/persistence/workspacePersistence.test.ts tests/lib/projectWorkspace.test.ts`

Commit: `git commit -m "feat: persist blueprint selections safely"`

---

### Task 3: Expand the deterministic planner for adaptive categories, scale, and mechanic packs

**Files:**
- Modify: `src/contracts/blueprint.ts`
- Create: `src/lib/blueprint/categoryCatalog.ts`
- Modify: `src/lib/blueprint/planner.ts`
- Test: `tests/blueprint/contract.test.ts`
- Test: `tests/blueprint/planner.test.ts`

- [ ] **Step 1: Add failing contract tests for richer recommendations**

Extend `BlueprintPlanV1` with recommended `lorebookScale`, `lorebookRange`, `principalCastRange`, and `rosterCastRange`. Extend mechanic recommendations with architecture effects, runtime requirements, compiler rules, test fixtures, and graceful fallback. Keep the parser closed and defensive.

- [ ] **Step 2: Add failing premise-adaptation fixtures**

Add cozy bakery, domestic romance, war-torn kingdom, investigation mystery, and large science-fiction city fixtures. Assert they receive meaningfully different categories and mechanics; cozy/domestic fixtures must not acquire factions, secrets, magic, religion, or ticking crises without evidence.

- [ ] **Step 3: Run focused tests and confirm red**

Run: `bun test tests/blueprint/contract.test.ts tests/blueprint/planner.test.ts`

- [ ] **Step 4: Implement the category and mechanic registries**

Create stable standard category definitions for NPCs, Relationships, Factions, World Rules, Locations, Items, Knowledge, Secrets, History, Pressures, Ordinary Life, Events, Rumors, Clues, Cultures, Species, Magic, Technology, Rituals, and Mechanics. Add definitions for the ten approved mechanic packs. Registries supply neutral labels and capability metadata, not premise-specific content.

- [ ] **Step 5: Implement evidence-based planning**

Update `createBlueprintPlan` so premise evidence selects or omits categories, recommends scale from supported coverage, distinguishes principal/roster ranges for Large/Massive, recommends only eligible packs, and preserves ordinary-life assessment. Scale changes adjust entry breadth rather than prose length.

- [ ] **Step 6: Run tests and commit**

Run: `bun test tests/blueprint/contract.test.ts tests/blueprint/planner.test.ts`

Commit: `git commit -m "feat: plan adaptive lore inventories and mechanics"`

---

### Task 4: Replace Stage 3's opaque controls with the Blueprint Studio

**Files:**
- Create: `src/components/BlueprintStudio.tsx`
- Create: `src/components/BlueprintCategoryCard.tsx`
- Create: `src/components/BlueprintMechanicCard.tsx`
- Modify: `src/components/PhysicsStage.tsx`
- Modify: `src/App.tsx`
- Test: `tests/components/blueprintStudio.test.tsx`
- Test: `tests/components/physicsStage.test.tsx`

- [ ] **Step 1: Write failing rendered-component tests**

Assert Smart Auto, Guided, and Expert render from one `BlueprintSelectionV1`; mode switching uses the same values; mobile controls are stacked and reachable; all inputs have labels; custom category add/rename/omit/lock works through callbacks; and advanced controls are collapsed by default on mobile.

- [ ] **Step 2: Add failing terminology tests**

Assert Stage 3 displays `Everyday-Life Detail` and its plain-language explanation, does not display `Mundanity`, and updates the same legacy numeric value through the compatibility helper.

- [ ] **Step 3: Run focused tests and confirm red**

Run: `bun test tests/components/blueprintStudio.test.tsx tests/components/physicsStage.test.tsx`

- [ ] **Step 4: Implement progressive disclosure**

Build `BlueprintStudio` as a controlled component. Smart Auto shows recommendation summaries and reasons; Guided exposes artifact/world/scale/cast/category/mechanic controls; Expert adds ranges, runtime intentions, locks, execution preference, and warnings. Use existing visual tokens and responsive classes; do not introduce a second modal scroll region.

- [ ] **Step 5: Integrate Stage 3 and preserve state**

In `App.tsx`, maintain `blueprintSelection` alongside `blueprintPlan`. Accepting a preview creates a selection; reanalysis calls `reconcileBlueprintSelection`; opening or switching views never resets it. Retain the rest of `PhysicsStage` as compatibility controls, with the Everyday-Life label and Blueprint-owned production controls.

- [ ] **Step 6: Add invalid-edit behavior**

Keep draft edits local until `parseBlueprintSelectionV1` succeeds. Show field-level errors and retain the last valid accepted selection on invalid edits or failed refresh.

- [ ] **Step 7: Run focused tests and commit**

Run: `bun test tests/components/blueprintStudio.test.tsx tests/components/physicsStage.test.tsx tests/blueprint/previewLifecycle.test.ts`

Commit: `git commit -m "feat: add adaptive blueprint studio to stage three"`

---

### Task 5: Store the accepted Blueprint as an explicit Project Graph decision

**Files:**
- Modify: `src/contracts/projectGraph.ts`
- Modify: `src/lib/projectGraph/commands.ts`
- Modify: `server/routes/projects.ts`
- Modify: `src/services/projectGraphService.ts`
- Modify: `src/App.tsx`
- Test: `tests/projectGraph/commands.test.ts`
- Test: `tests/server/projectGraphRoutes.test.ts`

- [ ] **Step 1: Write failing command and route tests**

Add an `accept_blueprint` command carrying a parsed `BlueprintSelectionV1`, expected graph revision, and a generated decision ID. Assert stale revision returns the existing conflict response, invalid selection returns 400, retrying the same command is idempotent, and preview remains non-mutating.

- [ ] **Step 2: Run focused tests and confirm red**

Run: `bun test tests/projectGraph/commands.test.ts tests/server/projectGraphRoutes.test.ts`

- [ ] **Step 3: Implement explicit decision ownership**

Add a Blueprint decision record under the graph's versioned decisions/artifact references rather than treating it as canon facts. Record selection schema, source fingerprint, source project revision, and saved-project document ID. Increment graph revision only on explicit acceptance or valid edit.

- [ ] **Step 4: Connect the UI acceptance action**

Call the new command after local validation. On network failure keep the valid local selection and show that graph synchronization is pending; never discard edits or pretend synchronization succeeded.

- [ ] **Step 5: Run tests and commit**

Run: `bun test tests/projectGraph/commands.test.ts tests/server/projectGraphRoutes.test.ts`

Commit: `git commit -m "feat: record accepted blueprints in project graph"`

---

### Task 6: Normalize concise categorized lore titles at the canonical manifest boundary

**Files:**
- Modify: `src/contracts/artifacts.ts`
- Create: `src/lib/artifacts/loreTitles.ts`
- Modify: `src/lib/artifacts/loreManifest.ts`
- Modify: `src/lib/projectGraph/artifactCompiler.ts`
- Modify: `server/generation/forge.ts`
- Test: `tests/artifacts/loreTitles.test.ts`
- Test: `tests/artifacts/loreManifest.test.ts`
- Test: `tests/artifacts/loreSerializers.test.ts`
- Test: `tests/server/forgeGeneration.test.ts`

- [ ] **Step 1: Write failing title normalization tests**

Cover every standard category plus a custom category, equivalent existing prefixes, mismatched prefixes, blank names, names copied from content, paragraph-like names, names over 48 semantic characters, stable fallback numbering, malicious brackets/control characters, and unchanged source/native IDs.

- [ ] **Step 2: Run focused title tests and confirm red**

Run: `bun test tests/artifacts/loreTitles.test.ts tests/artifacts/loreManifest.test.ts tests/artifacts/loreSerializers.test.ts`

- [ ] **Step 3: Expand the artifact category identity**

Replace the closed `LoreCategory`-only storage in `LoreEntryIR` with stable `categoryId: string` and `categoryLabel: string`, retaining a compatibility `category` field for the ten legacy IDs during v0.47. Custom category IDs must serialize as data and never become object keys or executable values.

- [ ] **Step 4: Implement canonical formatting**

Add:

```ts
export const MAX_LORE_SEMANTIC_NAME_LENGTH = 48;
export function formatLoreEntryTitle(input: {
  categoryId: string;
  categoryLabel: string;
  candidateName: unknown;
  content: string;
  ordinal: number;
}): { title: string; semanticName: string; finding?: ArtifactFinding };
```

Normalize the category label to a short printable noun phrase, strip one equivalent prefix, reject blank/content-derived/paragraph-like/oversized candidates, and use `[Category] Type N` with a major finding. Do not truncate content or derive a replacement from it.

- [ ] **Step 5: Require short names from generation**

Update Forge schema/prompt instructions so each generated lore entry has a distinct short `name` separate from prose content. Reject malformed structured output through the existing generation failure policy; do not silently synthesize creative content.

- [ ] **Step 6: Compile titles once and serialize identically**

Use `formatLoreEntryTitle` in document and graph compilers. Confirm both `serializeNativeLumiverseWorldBook` and `serializePortableCharacterBook` receive the same `entry.title`; do not add serializer-specific title logic.

- [ ] **Step 7: Run tests and commit**

Run: `bun test tests/artifacts/loreTitles.test.ts tests/artifacts/loreManifest.test.ts tests/artifacts/loreSerializers.test.ts tests/server/forgeGeneration.test.ts`

Commit: `git commit -m "feat: compile concise categorized lore titles"`

---

### Task 7: Add deterministic lore-quality and runtime-budget auditing

**Files:**
- Create: `src/contracts/loreQuality.ts`
- Create: `src/lib/artifacts/loreQualityAudit.ts`
- Modify: `src/contracts/artifacts.ts`
- Modify: `src/lib/artifacts/loreManifest.ts`
- Modify: `src/lib/projectGraph/artifactCompiler.ts`
- Test: `tests/artifacts/loreQualityAudit.test.ts`
- Test: `tests/artifacts/artifactCompiler.test.ts`

- [ ] **Step 1: Write failing report-contract tests**

Define and test `LoreQualityReportV1` with report schema, evidence boundary, severity counts, affected stable IDs, repair suggestion, title/coverage/activation summaries, and static/typical/crowded/maximum token estimates.

- [ ] **Step 2: Write failing audit fixtures**

Cover duplicate IDs; missing conditional keys; secret/public ownership; current-as-evergreen/constant; unsupported `{{user}}` feelings/actions/consent/backstory; recursion cycles/fan-out; exact and normalized near-duplicate content; shared broad keys; missing principal coverage; constant bloat; crowded-budget eviction; oversized entries; weak tests; and ordinary-life imbalance.

- [ ] **Step 3: Run focused tests and confirm red**

Run: `bun test tests/artifacts/loreQualityAudit.test.ts tests/artifacts/artifactCompiler.test.ts`

- [ ] **Step 4: Implement deterministic audit rules**

Implement `auditLoreManifest(manifest, context): LoreQualityReportV1`. Use normalized exact comparison plus deterministic word-shingle similarity for near duplicates; explicit common-key and shared-key thresholds for collisions; graph traversal for recursion; documented token estimates; and narrow agency patterns that report evidence without changing content.

- [ ] **Step 5: Implement conservative setting checks**

Report unjustified constant/vector/group/probability/cooldown/delay settings, uniform position/depth/priority, dense hubs or secrets with recursion enabled, and vector use without embedding dependency. Treat accepted Blueprint mechanic rules as the only source that can justify optional advanced settings.

- [ ] **Step 6: Attach reports without serializer invention**

Add `qualityReport` to `LoreManifest` compilation results and graph previews. Block `production ready` status only on unresolved blockers; majors remain visible warnings. Keep serialization structural and deterministic.

- [ ] **Step 7: Run tests and commit**

Run: `bun test tests/artifacts/loreQualityAudit.test.ts tests/artifacts/artifactCompiler.test.ts tests/artifacts/loreManifest.test.ts`

Commit: `git commit -m "feat: audit lore quality before export"`

---

### Task 8: Show the quality report and Blueprint influence before export

**Files:**
- Create: `src/components/LoreQualityPanel.tsx`
- Modify: `src/components/ExportModal.tsx`
- Modify: `src/lib/exportGenerators.ts`
- Modify: `src/App.tsx`
- Test: `tests/components/loreQualityPanel.test.tsx`
- Test: `tests/components/exportDrawer.test.tsx`
- Test: `tests/artifacts/exportGenerators.test.ts`

- [ ] **Step 1: Write failing UI tests**

Assert the export UI shows blocker/major/minor/note totals, title fallback count, category coverage, static/typical/crowded/maximum budget, affected entry IDs/titles, repair suggestions, and the deterministic-not-runtime evidence notice. Ensure the panel is usable at mobile widths without scrolling through the full entry list first.

- [ ] **Step 2: Write failing export-gate tests**

Assert unresolved blockers prevent the production-ready badge and final package action while still allowing report inspection and manuscript access. Majors produce a warning but do not silently disappear. Native and portable exports use the canonical manifest path.

- [ ] **Step 3: Run focused tests and confirm red**

Run: `bun test tests/components/loreQualityPanel.test.tsx tests/components/exportDrawer.test.tsx tests/artifacts/exportGenerators.test.ts`

- [ ] **Step 4: Implement the report panel**

Create a compact summary-first panel with expandable severity groups. Link findings by stable entry ID, explain why each rule matters, and show Blueprint scale versus actual compiled coverage. Do not label model opinion as a score or claim live activation success.

- [ ] **Step 5: Consolidate public lorebook export entry points**

Ensure current native World Book, Character Book, card, and package paths all call `compileLoreManifest` once and pass its result downstream. Remove or wrap any still-exposed legacy helper that independently invents comments or settings; preserve file formats and filenames.

- [ ] **Step 6: Run tests and commit**

Run: `bun test tests/components/loreQualityPanel.test.tsx tests/components/exportDrawer.test.tsx tests/artifacts/exportGenerators.test.ts tests/artifacts/loreSerializers.test.ts`

Commit: `git commit -m "feat: expose lore quality gates in publish"`

---

### Task 9: Verify mobile behavior, document the release, and publish v0.47

**Files:**
- Modify: `package.json`
- Modify: `src/version.ts`
- Modify: `server/version.ts`
- Modify: `scripts/start-lorebible.ps1`
- Modify: `scripts/start-lorebible-test.ps1`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `README.md`
- Test: `tests/contracts/version.test.ts`
- Test: `tests/components/versionDisplay.test.tsx`
- Test: `tests/launcher/launcher.test.ts`

- [ ] **Step 1: Run the entire automated suite before versioning**

Run: `bun test`

Expected: all tests pass. Fix regressions at their owning task rather than weakening assertions.

- [ ] **Step 2: Run static and production checks**

Run: `bun run typecheck`

Run: `bun run build`

Expected: both exit 0.

- [ ] **Step 3: Perform rendered mobile and desktop checks**

Start the current test-branch launcher, then inspect Stage 3 and Publish at representative mobile and desktop widths. Verify every model-independent Blueprint control is reachable, modal headers are not clipped, mode switching preserves values, custom ranges accept touch input, and the quality report appears before long entry details. Record this as rendered UI verification, not Lumiverse runtime verification.

- [ ] **Step 4: Bump every authoritative version surface to 0.47**

Update package, frontend/server version constants, launcher fingerprints, and version tests together. Confirm no `0.46` remains in authoritative runtime/version files.

- [ ] **Step 5: Update release documentation**

Add a v0.47 changelog entry describing Blueprint persistence, adaptive categories and size, mechanic packs, Everyday-Life terminology, categorized titles, quality gates, mobile behavior, and evidence limitations. Mark M2.2 complete in the roadmap and identify v0.48 as resumable Forge execution.

- [ ] **Step 6: Run final verification from a clean process**

Run: `bun test`

Run: `bun run typecheck`

Run: `bun run build`

Run: `git diff --check`

Run: `rg -n "TO.DO|FIX.ME|0\.46" docs/superpowers/plans/2026-09-12-v047-blueprint-and-lore-quality.md src server scripts package.json CHANGELOG.md ROADMAP.md README.md`

Expected: tests/typecheck/build/diff check pass; the unfinished-marker scan contains no incomplete plan language and no stale authoritative version.

- [ ] **Step 7: Commit and push the release**

Commit: `git commit -m "release: ship LoreBible v0.47"`

Push: `git push origin test`

- [ ] **Step 8: Report evidence precisely**

Report test counts, typecheck/build results, rendered viewport checks, commit hash, and pushed branch. Explicitly state that live Lumiverse import, Dry Run activation, diagnostics placement, vector behavior, and sticky/cooldown/delay runtime behavior remain unverified until performed in Lumiverse.

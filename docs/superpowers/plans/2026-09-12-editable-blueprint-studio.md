# Editable Blueprint Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship LoreBible v0.51 with an editable, mobile-first Blueprint Studio whose validated selections persist and control Forge execution preference.

**Architecture:** Keep `BlueprintPlanV1` immutable and use `BlueprintSelectionV1` as the sole editable authority. Pure selection helpers own mutations and invariants, the studio owns only a local draft, and `App.tsx` atomically commits a validated selection into the existing workspace/project persistence path. Existing Forge behavior consumes the saved execution preference; later graph-native and lore-compilation milestones consume the remaining planned fields.

**Tech Stack:** React 19, TypeScript, Tailwind utilities, Bun test runner, server-rendered component tests, existing SavedProjectV2 and Project Graph services.

**Spec:** `docs/superpowers/specs/2026-09-12-editable-blueprint-studio-design.md`

## Global Constraints

- Release target is `0.51` / package `0.51.0` on branch `test`.
- No second Blueprint persistence key or competing selection type.
- No provider credentials or hidden reasoning in Blueprint state.
- No unsupported mechanic may be described as serialized or runtime-active.
- Every production behavior begins with a test that is observed failing for the intended reason.
- Existing accepted work and saved selections survive validation, refresh, cancellation, and storage failures.
- The UI must remain usable at narrow Android viewport widths with sticky actions and no horizontal-scroll dependency.

---

### Task 1: Blueprint selection mutation boundary

**Files:**
- Modify: `src/contracts/blueprintSelection.ts`
- Modify: `src/lib/blueprint/selection.ts`
- Modify: `tests/blueprint/selection.test.ts`
- Modify: `tests/blueprint/selectionContract.test.ts`

**Interfaces:**
- Consumes: `BlueprintPlanV1`, `BlueprintSelectionV1`, `LorebookScale`, `EstimateRange`.
- Produces: `updateBlueprintField`, `updateBlueprintCategory`, `updateBlueprintMechanic`, `addBlueprintCategory`, `removeBlueprintCategory`, `validateBlueprintSelectionTransition`.

- [ ] **Step 1: Write failing contract tests for cross-field invariants**

Add assertions that an empty artifact target list, enabled ineligible mechanic, omitted required category, blank custom label, and duplicate locked field fail parsing with field-specific issues.

```ts
expect(parseBlueprintSelectionV1({ ...validSelection, artifactTargets: [] })).toMatchObject({ ok: false });
expect(parseBlueprintSelectionV1({ ...validSelection, mechanicPacks: [{ ...validSelection.mechanicPacks[0], enabled: true, eligible: false }] })).toMatchObject({ ok: false });
expect(parseBlueprintSelectionV1({ ...validSelection, categories: [{ ...validSelection.categories[0], status: "required" }, { ...validSelection.categories[0], id: "required-2", status: "omitted" }] })).toMatchObject({ ok: false });
```

- [ ] **Step 2: Run the contract tests and confirm RED**

Run: `bun test tests/blueprint/selectionContract.test.ts`  
Expected: the new cross-field assertions fail because the parser currently checks shapes but not these invariants.

- [ ] **Step 3: Add cross-field validation**

Extend `parseBlueprintSelectionV1` after shape validation to reject the invalid combinations, return precise paths, and preserve the existing closed-schema/credential checks.

- [ ] **Step 4: Write failing immutable-mutation tests**

Test that category and mechanic changes set `userLocked`, preserve the input object, reject forbidden transitions, create collision-safe `custom:<slug>` IDs, and remove custom categories only.

```ts
const changed = updateBlueprintCategory(selection, "relationships", { status: "omitted" }, now);
expect(changed.categories.find(item => item.id === "relationships")).toMatchObject({ status: "omitted", userLocked: true });
expect(selection.categories.find(item => item.id === "relationships")?.status).not.toBe("omitted");
expect(() => updateBlueprintMechanic(selection, ineligibleId, true, now)).toThrow("ineligible");
```

- [ ] **Step 5: Run mutation tests and confirm RED**

Run: `bun test tests/blueprint/selection.test.ts`  
Expected: import/export failures because the mutation helpers do not exist.

- [ ] **Step 6: Implement minimal pure helpers**

Use `structuredClone`, update `updatedAt`, maintain `lockedFields`, and validate returned selections before returning. Custom defaults are optional/standard/mixed, `{min:1, ideal:3, max:6}`, locked, and carry the user explanation.

- [ ] **Step 7: Run focused tests and confirm GREEN**

Run: `bun test tests/blueprint/selection.test.ts tests/blueprint/selectionContract.test.ts`

- [ ] **Step 8: Commit**

```powershell
git add src/contracts/blueprintSelection.ts src/lib/blueprint/selection.ts tests/blueprint/selection.test.ts tests/blueprint/selectionContract.test.ts
git commit -m "feat: add blueprint selection mutations"
```

### Task 2: Mobile Blueprint Studio shell and primary controls

**Files:**
- Create: `src/components/blueprint/BlueprintPrimaryControls.tsx`
- Create: `src/components/BlueprintStudio.tsx`
- Modify: `tests/components/blueprintPreviewPanel.test.tsx`

**Interfaces:**
- Consumes: `plan: BlueprintPlanV1`, `initialSelection: BlueprintSelectionV1`.
- Produces: `<BlueprintStudio plan initialSelection onSave onCancel />`, where `onSave(selection)` receives one validated detached selection.

- [ ] **Step 1: Replace the read-only component test with failing editor tests**

Render the studio and assert Smart/Guided/Expert tabs, editable labeled primary fields, recommendation rationale, an unsaved local draft, one `overflow-y-auto` body, sticky header/footer, safe-area footer padding, Save/Cancel actions, and no Start Forge action.

```tsx
const html = renderToString(<BlueprintStudio plan={plan} initialSelection={selection} onSave={()=>{}} onCancel={()=>{}} />);
for (const text of ["Smart Auto", "Guided", "Expert", "Save Blueprint", "Cancel", "Ordinary-life coverage", "Forge execution"]) expect(html).toContain(text);
expect(html).toContain("sticky bottom-0");
expect(html).not.toContain("Start Forge");
```

- [ ] **Step 2: Run the component test and confirm RED**

Run: `bun test tests/components/blueprintPreviewPanel.test.tsx`  
Expected: missing-module or missing-control failure.

- [ ] **Step 3: Implement the studio draft shell and primary controls**

Use `useState(() => structuredClone(initialSelection))`. Render compact Smart summary; Guided selects for artifact targets, world mode, intensity, quality, runtime, scale, ordinary-life coverage, and Forge preference; Expert reuses Guided plus exact range controls. Keep recommendation reasons adjacent to controls.

- [ ] **Step 4: Validate before Save**

Call `parseBlueprintSelectionV1(draft)`. If invalid, retain the draft and render the returned issues; otherwise call `onSave(structuredClone(parsed.value))` once.

- [ ] **Step 5: Run the component test and confirm GREEN**

Run: `bun test tests/components/blueprintPreviewPanel.test.tsx`

- [ ] **Step 6: Commit**

```powershell
git add src/components/blueprint/BlueprintPrimaryControls.tsx src/components/BlueprintStudio.tsx tests/components/blueprintPreviewPanel.test.tsx
git commit -m "feat: add mobile blueprint studio shell"
```

### Task 3: Category and mechanic editors

**Files:**
- Create: `src/components/blueprint/BlueprintCategoryEditor.tsx`
- Create: `src/components/blueprint/BlueprintMechanicEditor.tsx`
- Modify: `src/components/BlueprintStudio.tsx`
- Modify: `tests/components/blueprintPreviewPanel.test.tsx`

**Interfaces:**
- Consumes: category/mechanic selection arrays and immutable update callbacks.
- Produces: expandable category/mechanic cards with recommendation evidence, valid controls, lock state, and custom-category actions.

- [ ] **Step 1: Add failing rendered-behavior tests**

Assert that required categories disable omission, ineligible mechanics disable enabling, omitted categories remain visible, custom-category controls exist, mechanic runtime requirements/fallbacks are expandable, and the disclaimer says mechanic intent is planned rather than active.

- [ ] **Step 2: Run the component test and confirm RED**

Run: `bun test tests/components/blueprintPreviewPanel.test.tsx`

- [ ] **Step 3: Implement category editor**

Render collapsed `details` cards. Guided exposes include/status, detail, range summary, and lock. Expert exposes min/ideal/max and runtime-role/architecture planning metadata. Add custom-category name/explanation fields and Add action; only custom cards expose Remove.

- [ ] **Step 4: Implement mechanic editor**

Render enabled/disabled and lock controls. Disable ineligible packs with their reason. Expanded details show architecture effects, runtime requirements, compiler rules, test fixtures, and graceful fallback. Include the explicit not-yet-active notice.

- [ ] **Step 5: Run the component test and confirm GREEN**

Run: `bun test tests/components/blueprintPreviewPanel.test.tsx`

- [ ] **Step 6: Commit**

```powershell
git add src/components/blueprint src/components/BlueprintStudio.tsx tests/components/blueprintPreviewPanel.test.tsx
git commit -m "feat: edit blueprint categories and mechanics"
```

### Task 4: Application commit, refresh, and persistence integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/lib/projectWorkspace.ts` if a narrow state adapter is required
- Modify: `tests/lib/projectWorkspace.test.ts`
- Create: `tests/lib/blueprintStudioLifecycle.test.ts`

**Interfaces:**
- Consumes: current `blueprintPlan`, current `blueprintSelection`, `createBlueprintSelection`, `reconcileBlueprintSelection`.
- Produces: `openBlueprintDraft(plan, savedSelection)` and `commitBlueprintDraft(selection)` lifecycle semantics used by `App.tsx`.

- [ ] **Step 1: Write failing lifecycle tests**

Prove first open creates a selection, reopen uses the exact saved selection, refreshed recommendations reconcile locks/custom items, cancel returns the old selection, and save returns one validated detached selection.

- [ ] **Step 2: Run lifecycle and persistence tests and confirm RED**

Run: `bun test tests/lib/blueprintStudioLifecycle.test.ts tests/lib/projectWorkspace.test.ts`

- [ ] **Step 3: Implement a small pure lifecycle helper**

Create only the adapter necessary to choose create-versus-reconcile and validate a committed draft. Do not place React state or storage inside the helper.

- [ ] **Step 4: Wire `App.tsx`**

Replace `BlueprintPreviewPanel` with `BlueprintStudio`. On preview success, create/reconcile the selection. On Save, set `blueprintSelection`, synchronize ordinary-life detail to `physics.mundanity`, synchronize the supported Forge execution preference, and close. On Cancel, close without changing the saved value.

- [ ] **Step 5: Verify existing persistence uses the committed selection**

Extend round-trip fixtures for modified top-level fields, an omission, custom category, mechanic override, and Forge preference through SavedProjectV2 and active workspace capture/restore.

- [ ] **Step 6: Run focused tests and confirm GREEN**

Run: `bun test tests/lib/blueprintStudioLifecycle.test.ts tests/lib/projectWorkspace.test.ts tests/persistence/workspacePersistence.test.ts tests/persistence/projectPersistence.test.ts`

- [ ] **Step 7: Commit**

```powershell
git add src/App.tsx src/lib/projectWorkspace.ts src/lib/blueprint tests/lib/blueprintStudioLifecycle.test.ts tests/lib/projectWorkspace.test.ts
git commit -m "feat: persist accepted blueprint decisions"
```

### Task 5: Forge preference handoff and Stage 3 cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/PhysicsStage.tsx`
- Modify: `tests/components/physicsStage.test.tsx`
- Modify: `tests/client/geminiService.test.ts`

**Interfaces:**
- Consumes: `BlueprintSelectionV1.forgeExecutionPreference`.
- Produces: existing `streamForgeDocument(... executionMode)` request using the accepted preference.

- [ ] **Step 1: Write failing handoff tests**

Assert the accepted `step_by_step` selection produces `executionMode: "step_by_step"`, and that Stage 3 directs users to Blueprint for planning instead of exposing a conflicting independent selector once a Blueprint selection exists.

- [ ] **Step 2: Run Forge/Physics tests and confirm RED**

Run: `bun test tests/components/physicsStage.test.tsx tests/client/geminiService.test.ts`

- [ ] **Step 3: Wire preference as the canonical value**

Derive Forge execution mode from `blueprintSelection?.forgeExecutionPreference`, with the legacy component state as migration fallback. Preserve current support for `continuous` and `step_by_step`; only send `single_request` where the service/server path supports it.

- [ ] **Step 4: Remove or clearly subordinate duplicate Stage 3 controls**

When Blueprint selection exists, show its saved preference and an **Edit Blueprint** route instead of two independently editable values. Legacy projects without Blueprint retain the current controls.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `bun test tests/components/physicsStage.test.tsx tests/client/geminiService.test.ts tests/components/projectGraphPanel.test.tsx`

- [ ] **Step 6: Commit**

```powershell
git add src/App.tsx src/components/PhysicsStage.tsx tests/components/physicsStage.test.tsx tests/client/geminiService.test.ts
git commit -m "feat: apply blueprint forge preference"
```

### Task 6: Release documentation and version 0.51

**Files:**
- Modify: `src/version.ts`
- Modify: `package.json`
- Modify: `tests/contracts/version.test.ts`
- Modify: `tests/components/versionDisplay.test.tsx`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/README.md`
- Modify: `docs/roadmap/delivery-roadmap.md`
- Modify: `docs/roadmap/production-studio-blueprint.md`

**Interfaces:**
- Produces: consistent `0.51` display/package release and truthful M2.2 milestone status.

- [ ] **Step 1: Write the failing version expectation**

Change version tests to expect `0.51` and `0.51.0`, then run them before changing production metadata.

- [ ] **Step 2: Run version tests and confirm RED**

Run: `bun test tests/contracts/version.test.ts tests/components/versionDisplay.test.tsx`

- [ ] **Step 3: Bump version metadata**

Set `APP_VERSION = "0.51"` and package version `0.51.0`.

- [ ] **Step 4: Update changelog and roadmap**

Document what changed, why, mobile/persistence behavior, unsupported-yet boundary, validation evidence, and live-runtime limitations. Mark M2.2 complete only after every acceptance gate passes; update the count consistently if M2.2 is one of the 17 tracked items.

- [ ] **Step 5: Run version tests and confirm GREEN**

Run: `bun test tests/contracts/version.test.ts tests/components/versionDisplay.test.tsx`

- [ ] **Step 6: Commit**

```powershell
git add src/version.ts package.json tests/contracts/version.test.ts tests/components/versionDisplay.test.tsx CHANGELOG.md docs/roadmap
git commit -m "docs: release editable blueprint studio v0.51"
```

### Task 7: Full verification, review, and push

**Files:**
- Review all files changed by Tasks 1–6.

**Interfaces:**
- Produces: evidence-backed v0.51 test-branch release.

- [ ] **Step 1: Run focused Blueprint and persistence suites**

Run: `bun test tests/blueprint tests/components/blueprintPreviewPanel.test.tsx tests/lib/blueprintStudioLifecycle.test.ts tests/lib/projectWorkspace.test.ts tests/persistence`

- [ ] **Step 2: Run the complete automated suite**

Run: `bun test`  
Expected: zero failures.

- [ ] **Step 3: Run static and production checks**

Run: `bun run typecheck`  
Run: `npm.cmd run build`  
Expected: both exit zero; report any bundle-size warning separately from failures.

- [ ] **Step 4: Review the diff and repository state**

Run: `git diff --check`  
Run: `git status --short`  
Confirm no credentials, generated provider output, unrelated user changes, or untracked implementation files remain.

- [ ] **Step 5: Perform proportional rendered verification**

Open the current test server only if needed, inspect Blueprint at desktop and narrow mobile widths, and verify sticky Save/Cancel reachability, expandable cards, no clipped controls, and exact save/reopen behavior. Label this browser observation separately from automated evidence.

- [ ] **Step 6: Push the tested branch**

```powershell
git push origin test
```

- [ ] **Step 7: Report outcome and next roadmap item**

Report the version, commit(s), exact test/build evidence, live-provider/runtime boundary, what/why, updated milestone count, and M3.1 as the next planned slice.


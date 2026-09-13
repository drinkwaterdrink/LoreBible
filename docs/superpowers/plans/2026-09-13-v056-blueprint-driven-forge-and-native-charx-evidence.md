# Blueprint-Driven Forge and Native CHARX Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the accepted Blueprint lore-library target visibly adjustable on mobile and materially control Forge coverage, while recording the verified native Lumiverse attached-World-Book envelope supplied by the user.

**Architecture:** Keep `BlueprintSelectionV1` as the single source of build-size intent. A small pure server module validates and projects the selection into a bounded Forge brief containing total authored-lore tokens, entry targets, category allocations, cast ranges, and ordinary-life coverage; the brief is added to every Forge batch and to the durable input fingerprint. The native CHARX sample becomes a sanitized structural fixture proving that `lumiverse_modules.json.world_books[0]` carries the same full-fidelity book as the standalone Lumiverse JSON, excluding export timestamps. This slice records evidence but does not yet claim every undocumented enum mapping or switch production serialization to the new envelope.

**Tech Stack:** TypeScript, React, Express, Bun tests, existing Blueprint and Forge contracts.

**Spec:** `docs/superpowers/specs/2026-09-12-editable-blueprint-studio-design.md`

## Global Constraints

- Work only on `test` and preserve accepted content, saved projects, provider profiles, and Forge checkpoints.
- Library size and runtime activation budget remain independent.
- Accept authored-lore targets from 2,000 through 40,000 estimated tokens without padding.
- A changed Blueprint selection must not resume a build created for a different selection.
- Smart Auto remains usable without exposing expert controls.
- Do not claim runtime-observed or certified Lumiverse behavior from static fixtures.
- Do not invent selective-logic enum meanings not exercised by the supplied native export.
- Increase the visible version by exactly 0.01 only after the completed slice passes its release gate.

---

### Task 1: Native attached-World-Book evidence fixture

**Files:**
- Create: `tests/fixtures/lumiverseNativeCharxWorldBook.ts`
- Create: `tests/artifacts/lumiverseCharxEvidence.test.ts`
- Modify: `docs/roadmap/capability-evidence.md`

**Interfaces:**
- Produces: `NATIVE_CHARX_WORLD_BOOK_MODULE_FIXTURE`, a harmless typed fixture shaped as `{version: 1, world_books: LumiverseWorldBookV1[]}`.
- Proves: the native module book and standalone book are behaviorally identical after normalizing `exported_at` only.

- [x] **Step 1: Write the failing evidence test**

```ts
test("native CHARX module preserves the full standalone World Book", () => {
  const comparison = compareLumiverseBooks(
    NATIVE_STANDALONE_WORLD_BOOK_FIXTURE,
    NATIVE_CHARX_WORLD_BOOK_MODULE_FIXTURE.world_books[0],
  );
  expect(comparison).toEqual({ equal: true, ignored: ["exported_at"] });
});
```

- [x] **Step 2: Run the test to verify RED**

Run: `bun test tests/artifacts/lumiverseCharxEvidence.test.ts`

Expected: FAIL because the fixture/comparator does not exist.

- [x] **Step 3: Add the minimal sanitized fixture and comparator**

Preserve every observed native entry property and value type. Replace user placeholder strings with neutral fixture labels while retaining setting combinations. Normalize only the top-level export timestamp.

- [x] **Step 4: Run the focused evidence test**

Run: `bun test tests/artifacts/lumiverseCharxEvidence.test.ts`

Expected: PASS and no claim beyond `static_validated`.

### Task 2: Forge build brief projection

**Files:**
- Create: `server/generation/forgeBlueprintBrief.ts`
- Create: `tests/generation/forgeBlueprintBrief.test.ts`
- Modify: `server/generation/forgeProjectCoordinator.ts`

**Interfaces:**
- Consumes: `BlueprintSelectionV1 | null | undefined`.
- Produces: `createForgeBlueprintBrief(selection): ForgeBlueprintBrief | null` and `formatForgeBlueprintBrief(brief): string`.
- Extends: `ForgeCreativeSource` with optional `blueprintSelection` so selection changes alter the durable fingerprint.

- [x] **Step 1: Write failing budget and differentiation tests**

```ts
test("projects a 40k massive library independently from an 8k runtime budget", () => {
  expect(createForgeBlueprintBrief(selection)).toMatchObject({
    libraryTargetTokens: 40_000,
    runtimeBudget: { mode: "custom", tokens: 8_000 },
  });
});

test("different accepted library targets produce different Forge fingerprints", () => {
  expect(createForgeInputFingerprint(compact)).not.toBe(createForgeInputFingerprint(massive));
});
```

- [x] **Step 2: Run the focused tests to verify RED**

Run: `bun test tests/generation/forgeBlueprintBrief.test.ts tests/generation/forgeProjectCoordinator.test.ts`

Expected: FAIL because Blueprint size is not consumed by Forge.

- [x] **Step 3: Implement the pure projection**

The brief includes interface mode, build intensity, generation quality, library target/max tokens, runtime recommendation, lorebook entry range, principal/roster cast ranges, enabled category targets, mechanic packs, and ordinary-life detail. Invalid or absent input produces an explicit validation error at the request boundary; legacy requests with no selection retain current behavior.

- [x] **Step 4: Run focused projection and fingerprint tests**

Run: `bun test tests/generation/forgeBlueprintBrief.test.ts tests/generation/forgeProjectCoordinator.test.ts`

Expected: PASS.

### Task 3: Pass the accepted Blueprint through live Forge

**Files:**
- Modify: `src/services/geminiService.ts`
- Modify: `src/App.tsx`
- Modify: `server.ts`
- Modify: `tests/components/forgeStage.test.tsx`
- Modify: `tests/generation/forgeBatches.test.ts`

**Interfaces:**
- Client request adds `blueprintSelection?: BlueprintSelectionV1`.
- `/api/forge` validates the selection once and adds `formatForgeBlueprintBrief(...)` to each batch prompt.
- Durable preparation fingerprints the same accepted selection used for generation.

- [x] **Step 1: Write failing request and prompt-boundary tests**

Assert that a saved 32k selection reaches `/api/forge`, appears once in the batch context, preserves a separate 8k runtime recommendation, includes category target ranges, and does not alter requests without a Blueprint.

- [x] **Step 2: Run the focused tests to verify RED**

Run: `bun test tests/components/forgeStage.test.tsx tests/generation/forgeBatches.test.ts`

Expected: FAIL because Forge currently receives only the execution mode.

- [x] **Step 3: Implement the minimal request and prompt wiring**

Pass the accepted selection from `App.tsx`; validate it with the existing contract; include a concise `ACCEPTED PRODUCTION BLUEPRINT` block. Tell the model to distribute depth through useful focused entries and category coverage, never paragraph padding, and to preserve omitted categories as empty arrays where the legacy schema requires them.

- [x] **Step 4: Run focused request and generation tests**

Run: `bun test tests/components/forgeStage.test.tsx tests/generation/forgeBatches.test.ts tests/generation/forgeProjectCoordinator.test.ts`

Expected: PASS.

### Task 4: Mobile lore-library size control

**Files:**
- Modify: `src/components/blueprint/BlueprintPrimaryControls.tsx`
- Create or modify: `tests/components/blueprintPrimaryControls.test.tsx`
- Modify: `src/lib/blueprint/selection.ts`
- Modify: `tests/blueprint/selection.test.ts`

**Interfaces:**
- Produces: a 2k–40k slider in Guided/Expert modes with a live `~N tokens` label and estimated entry range.
- Preserves: Auto/Compact/Standard/Large/Massive presets and Expert exact entry-range editing.

- [x] **Step 1: Write failing mobile control tests**

Assert that Custom exposes one touch-friendly token slider, changing it updates target/max coherently, the current token value is visible, and the estimated entry range is shown without changing runtime budget.

- [x] **Step 2: Run the component tests to verify RED**

Run: `bun test tests/components/blueprintPrimaryControls.test.tsx tests/blueprint/selection.test.ts`

Expected: FAIL because Custom currently exposes two numeric boxes and no live estimate.

- [x] **Step 3: Implement the responsive slider**

Use `min=2000`, `max=40000`, `step=1000`, a minimum 44px touch target, and visible explanatory copy. Update the existing entry-range estimate from the selected token target without changing user-locked Expert ranges.

- [x] **Step 4: Run the component and persistence suites**

Run: `bun test tests/components/blueprintPrimaryControls.test.tsx tests/blueprint/selection.test.ts tests/blueprint/selectionContract.test.ts tests/projects/projectRepository.test.ts`

Expected: PASS.

### Task 5: Release bookkeeping and verification

**Files:**
- Modify: `package.json`
- Modify: `src/version.ts`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/delivery-roadmap.md`
- Modify: `docs/roadmap/production-studio-blueprint.md`
- Modify: version tests

**Interfaces:**
- Produces: an honest v0.56 release record describing Blueprint-driven Forge and static native-CHARX evidence.

- [x] **Step 1: Update documentation and version surfaces**

Record that native module location and same-book parity are structurally observed, while missing enum variants and live import/round-trip behavior remain unverified. Keep M3.2 in progress.

- [x] **Step 2: Run the release gate**

Run:

```sh
bun test
bun run typecheck
npm.cmd run build
git diff --check
```

Expected: all commands exit successfully; the existing Vite chunk-size advisory may remain documented.

- [x] **Step 3: Review the complete diff**

Confirm no secret values, source-drive paths, raw user artifacts, or invented Lumiverse enum mappings entered the repository.

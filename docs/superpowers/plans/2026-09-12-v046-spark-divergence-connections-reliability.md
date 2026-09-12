# v0.46 Spark, Divergence, and Connections Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v0.46 with genuinely generated on-demand premise examples, preserved full-board Divergence history, and a mobile Connections model picker that never hides the first result.

**Architecture:** Add a focused premise-generation contract/service/route, introduce board-level Divergence snapshots without altering per-card lineage, and isolate model-list scroll reset behavior behind a small hook/helper. App state remains the current V2 workflow authority, with backward-compatible optional fields for board history.

**Tech Stack:** React 19, TypeScript 5.8, Express 4, existing text-model gateway and SSE contracts, Bun 1.3.14 tests, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-09-12-blueprint-reliability-and-resumable-forge-design.md`

## Global Constraints

- Continuous Forge remains unchanged in v0.46.
- No model request fires automatically when Stage 1 opens.
- Failed or cancelled premise generation preserves the previous premise cards.
- Reroll-all history uses board snapshots and never matches unrelated takes by array index.
- Existing SavedProjectV2 documents remain readable without destructive migration.
- Provider failures remain truthful; no deterministic prose is presented as generated success.
- Mobile action controls remain reachable without scrolling through the model catalog.
- Ship as app version 0.46 and retain the original M0-M9 roadmap ordering.

---

## File structure

### New files

- `src/contracts/premiseSuggestions.ts` — versioned four-card response contract and runtime validation.
- `src/lib/divergenceBoards.ts` — immutable board creation, append, selection, and legacy migration helpers.
- `src/lib/modelListScroll.ts` — deterministic scroll-reset trigger calculation used by the modal.
- `server/routes/premiseSuggestions.ts` — dependency-injected Express route for premise generation.
- `tests/contracts/premiseSuggestions.test.ts` — response validation and rejection fixtures.
- `tests/lib/divergenceBoards.test.ts` — board history and migration behavior.
- `tests/lib/modelListScroll.test.ts` — reset-key behavior without a browser dependency.
- `tests/routes/premiseSuggestions.test.ts` — route failure/success contract using an injected gateway fixture where supported by the server harness.

### Modified files

- `server.ts` — register the bounded `/api/premise-suggestions` route with the existing gateway.
- `src/services/geminiService.ts` — expose `generatePremiseSuggestionsApi`.
- `src/components/SparkStage.tsx` — render initial starters separately and expose the on-demand generation action.
- `src/App.tsx` — own premise-generation activity and Divergence board-history state.
- `src/types.ts` — add `DivergenceBoardGeneration` and optional persistence-facing workflow types.
- `src/lib/projectPersistence.ts` — accept/save optional board history and migrate legacy takes to one board.
- `src/components/DivergenceStage.tsx` — add full-board navigation independent of per-card versions.
- `src/components/SettingsModal.tsx` — bind/reset the bounded model-results scroller.
- `tests/client/geminiService.test.ts` — request, cancellation, and structured-failure coverage.
- `tests/components/sparkStage.test.tsx` — button, quota copy, progress, and prior-results rendering.
- `tests/components/divergenceStage.test.tsx` — board navigation controls.
- `tests/components/settingsModal.test.tsx` — scroll-container semantics and reset binding.
- `tests/persistence/projectPersistence.test.ts` — legacy and board-history round trips.
- `src/version.ts`, `package.json`, launcher scripts, `CHANGELOG.md`, `docs/roadmap/README.md`, `docs/roadmap/delivery-roadmap.md` — v0.46 release bookkeeping.

---

### Task 1: Premise suggestion contract and client boundary

**Files:**
- Create: `src/contracts/premiseSuggestions.ts`
- Create: `tests/contracts/premiseSuggestions.test.ts`
- Modify: `src/services/geminiService.ts`
- Modify: `tests/client/geminiService.test.ts`

**Interfaces:**
- Produces: `PremiseSuggestion`, `PremiseSuggestionSet`, `parsePremiseSuggestionSet(value: unknown): PremiseSuggestionSet`.
- Produces: `generatePremiseSuggestionsApi(settings, options): Promise<PremiseSuggestionSet>` where `options` contains `signal?: AbortSignal` and `onEvent?: (event: GenerationProgressEvent) => void`.

- [ ] **Step 1: Write failing contract tests**

```ts
test("accepts exactly four distinct premise suggestions", () => {
  const result = parsePremiseSuggestionSet({
    schemaVersion: 1,
    suggestions: ["a", "b", "c", "d"].map((id) => ({
      id,
      title: `Title ${id}`,
      premise: `Premise ${id}`,
      category: "Original",
    })),
  });
  expect(result.suggestions).toHaveLength(4);
});

test("rejects duplicate or incomplete suggestions", () => {
  expect(() => parsePremiseSuggestionSet({ schemaVersion: 1, suggestions: [] })).toThrow();
});
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `bun test tests/contracts/premiseSuggestions.test.ts`

Expected: FAIL because the contract module does not exist.

- [ ] **Step 3: Implement the minimal versioned validator**

```ts
export interface PremiseSuggestion {
  id: string;
  title: string;
  premise: string;
  category: string;
  inspirationNote?: string;
}

export interface PremiseSuggestionSet {
  schemaVersion: 1;
  suggestions: [PremiseSuggestion, PremiseSuggestion, PremiseSuggestion, PremiseSuggestion];
}
```

Validate non-empty trimmed strings, exactly four cards, unique IDs, and unique normalized premises. Return normalized data without adding creative fallback values.

- [ ] **Step 4: Write failing client tests**

Mock `fetch` and assert that `generatePremiseSuggestionsApi`:

```ts
expect(request.url).toBe("/api/premise-suggestions");
expect(request.body.settings.modelSelection).toEqual({ profileId: "p1", modelId: "m1" });
expect(request.signal).toBe(controller.signal);
```

Also return a structured HTTP failure and assert the existing `GenerationFailure` recovery details survive.

- [ ] **Step 5: Run the client tests and verify they fail**

Run: `bun test tests/client/geminiService.test.ts`

Expected: FAIL because `generatePremiseSuggestionsApi` is not exported.

- [ ] **Step 6: Implement the client call through the existing SSE consumer**

Use `POST /api/premise-suggestions`, pass only `settings`, forward progress/usage/reasoning/provider-activity events, validate the terminal result with `parsePremiseSuggestionSet`, and preserve abort semantics.

- [ ] **Step 7: Run focused tests and commit**

Run: `bun test tests/contracts/premiseSuggestions.test.ts tests/client/geminiService.test.ts`

Expected: PASS.

Commit:

```powershell
git add src/contracts/premiseSuggestions.ts src/services/geminiService.ts tests/contracts/premiseSuggestions.test.ts tests/client/geminiService.test.ts
git commit -m "feat: add premise suggestion contract"
```

---

### Task 2: Truthful premise-generation route

**Files:**
- Modify: `server.ts`
- Create: `server/routes/premiseSuggestions.ts`
- Create: `tests/routes/premiseSuggestions.test.ts`

**Interfaces:**
- Consumes: `parsePremiseSuggestionSet` and the selected gateway resolution used by existing generation routes.
- Produces: `registerPremiseSuggestionRoutes(app, dependencies)` and `POST /api/premise-suggestions`, an SSE operation whose terminal result is a `PremiseSuggestionSet`.

- [ ] **Step 1: Write failing route tests**

Cover:

```ts
test("requires a selected configured model", async () => {
  const response = await fetch(`${url}/api/premise-suggestions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ settings: { modelSelection: null } }),
  });
  expect(response.status).toBe(401);
});
```

Add a gateway fixture returning four cards and assert one terminal `done` event. Add invalid-output and provider-error fixtures and assert they emit truthful `error` terminal events with no suggestion set.

- [ ] **Step 2: Run the route test and verify it fails**

Run: `bun test tests/routes/premiseSuggestions.test.ts`

Expected: FAIL with route-not-found behavior.

- [ ] **Step 3: Implement the bounded route**

The prompt must request four original, structurally different roleplay premises; preserve user agency; avoid mandatory genre elements; use concise titles and one-to-three-sentence premises; and never quote the fixed starter vault. Use the selected text-model gateway and the same terminal-event discipline as Divergence.

The route module receives gateway resolution/generation dependencies so tests do not import and start the full application server. It validates the provider response before emitting `done`. Missing credentials, rate limits, cancellation, timeout, and invalid structure terminate truthfully through the existing generation-failure mapper.

- [ ] **Step 4: Run route and SSE lifecycle tests**

Run: `bun test tests/routes/premiseSuggestions.test.ts tests/client/sseStream.test.ts`

Expected: PASS with exactly one terminal event per operation.

- [ ] **Step 5: Commit**

```powershell
git add server.ts server/routes/premiseSuggestions.ts tests/routes/premiseSuggestions.test.ts
git commit -m "feat: generate fresh premise suggestions"
```

---

### Task 3: Stage 1 generated-premise experience

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SparkStage.tsx`
- Modify: `tests/components/sparkStage.test.tsx`

**Interfaces:**
- Consumes: `generatePremiseSuggestionsApi` and existing `GenerationActivityProps`.
- Produces: `SparkStage` props `premiseSuggestions`, `onGeneratePremiseSuggestions`, and `premiseGenerationActivity`.

- [ ] **Step 1: Write failing component tests**

Assert that the server-rendered stage:

```ts
expect(html).toContain("Generate Fresh Premises");
expect(html).toContain("Uses one model request");
expect(html).not.toContain("Roll Fresh Sparks");
```

Render supplied generated cards and assert their titles and premises appear. Render an active activity and assert cancel/progress controls appear without replacing the prior cards.

- [ ] **Step 2: Run the component test and verify it fails**

Run: `bun test tests/components/sparkStage.test.tsx`

Expected: FAIL because the old fixed-vault UI is still rendered.

- [ ] **Step 3: Implement App-owned generation state**

Add `premiseSuggestions` and premise `GenerationActivityState` in `App.tsx`. The handler starts one request only after the button press, forwards activity events, replaces cards only after a validated successful result, and retains prior cards on failure or cancellation.

- [ ] **Step 4: Replace misleading Spark UI behavior**

Remove the timed `generateNovelSparks(4)` reroll from `SparkStage`. Show neutral starters until the first successful generated set, label generated results clearly, and wire cancellation through the existing activity component. Keep `Collide` explicitly offline.

- [ ] **Step 5: Run focused tests and commit**

Run: `bun test tests/components/sparkStage.test.tsx tests/client/geminiService.test.ts`

Expected: PASS.

Commit:

```powershell
git add src/App.tsx src/components/SparkStage.tsx tests/components/sparkStage.test.tsx
git commit -m "feat: add on-demand fresh premises"
```

---

### Task 4: Full-board Divergence history

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/divergenceBoards.ts`
- Create: `tests/lib/divergenceBoards.test.ts`
- Modify: `src/lib/projectPersistence.ts`
- Modify: `tests/persistence/projectPersistence.test.ts`

**Interfaces:**
- Produces: `DivergenceBoardGeneration` with `id`, `createdAt`, `operation`, and `takes`.
- Produces: `createDivergenceBoard`, `appendDivergenceBoard`, `migrateLegacyDivergenceBoards`, and `selectDivergenceBoard`.

- [ ] **Step 1: Write failing board-history tests**

```ts
test("appends reroll-all as an immutable board", () => {
  const first = createDivergenceBoard([take("a"), take("b")], "initial", now);
  const result = appendDivergenceBoard([first], [take("c"), take("d")], "reroll_all", now);
  expect(result.boards.map((board) => board.takes.map((item) => item.id))).toEqual([["a", "b"], ["c", "d"]]);
  expect(result.activeBoardIndex).toBe(1);
});
```

Verify old takes are not mutated and new take roots contain no array-index parentage. Verify legacy takes migrate into exactly one board while keeping IDs and per-card versions.

- [ ] **Step 2: Run tests and verify they fail**

Run: `bun test tests/lib/divergenceBoards.test.ts`

Expected: FAIL because the board helpers do not exist.

- [ ] **Step 3: Implement immutable board helpers**

Use injected `now` and ID creation functions in tests. `appendDivergenceBoard` calls the existing `initializeDivergenceBoard` for new roots, copies the boards array, and returns the new active index.

- [ ] **Step 4: Add optional V2 workflow persistence**

Extend workflow with:

```ts
divergenceBoards?: DivergenceBoardGeneration[];
activeDivergenceBoardId?: string | null;
```

Validation accepts old projects without these fields. Load migration creates one board from `workflow.takes`; save writes both compatibility `takes` and the new board fields.

- [ ] **Step 5: Run board and persistence tests**

Run: `bun test tests/lib/divergenceBoards.test.ts tests/persistence/projectPersistence.test.ts`

Expected: PASS, including an unchanged legacy fixture.

- [ ] **Step 6: Commit**

```powershell
git add src/types.ts src/lib/divergenceBoards.ts src/lib/projectPersistence.ts tests/lib/divergenceBoards.test.ts tests/persistence/projectPersistence.test.ts
git commit -m "feat: preserve divergence board history"
```

---

### Task 5: Divergence board navigation and App integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/DivergenceStage.tsx`
- Modify: `tests/components/divergenceStage.test.tsx`

**Interfaces:**
- Consumes: board helpers from Task 4.
- Produces: `DivergenceStage` props `boardIndex`, `boardCount`, and `onSwitchBoard`.

- [ ] **Step 1: Write failing UI tests**

Render two-board props and assert:

```ts
expect(html).toContain("Board 2 of 2");
expect(html).toContain('aria-label="Previous angle board"');
expect(html).toContain('aria-label="Next angle board"');
```

Verify one-board state disables navigation and existing per-card version copy still renders.

- [ ] **Step 2: Run tests and verify they fail**

Run: `bun test tests/components/divergenceStage.test.tsx`

Expected: FAIL because board props and controls do not exist.

- [ ] **Step 3: Integrate board state in App**

Initial generation creates the first board. Reroll-all appends only after success. Board navigation swaps the visible `takes` snapshot and clears a selected take if its ID is not in that board. Single reroll/steer updates only the active board's take array. Failure and cancellation make no board mutation.

- [ ] **Step 4: Add accessible navigation UI**

Place compact full-board history controls next to **Reroll All Angles**, explicitly distinct from each card's `Version N of M` controls. On mobile, controls wrap and remain touch-safe.

- [ ] **Step 5: Run focused lineage, component, and persistence tests**

Run: `bun test tests/lib/divergenceLineage.test.ts tests/lib/divergenceBoards.test.ts tests/components/divergenceStage.test.tsx tests/persistence/projectPersistence.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/App.tsx src/components/DivergenceStage.tsx tests/components/divergenceStage.test.tsx
git commit -m "feat: navigate divergence board generations"
```

---

### Task 6: Mobile model-list scroll reset and clipping prevention

**Files:**
- Create: `src/lib/modelListScroll.ts`
- Create: `tests/lib/modelListScroll.test.ts`
- Modify: `src/components/SettingsModal.tsx`
- Modify: `tests/components/settingsModal.test.tsx`

**Interfaces:**
- Produces: `createModelListResetKey(profileId, sort, search, subscriptionOnly): string`.
- Consumes: a `useRef<HTMLDivElement>` bound to `data-connections-model-list`.

- [ ] **Step 1: Write failing reset-key tests**

```ts
test("changes reset identity for every result-set control", () => {
  const base = createModelListResetKey("p1", "alphabetical", "", false);
  expect(createModelListResetKey("p2", "alphabetical", "", false)).not.toBe(base);
  expect(createModelListResetKey("p1", "newest", "", false)).not.toBe(base);
  expect(createModelListResetKey("p1", "alphabetical", "gemini", false)).not.toBe(base);
  expect(createModelListResetKey("p1", "alphabetical", "", true)).not.toBe(base);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `bun test tests/lib/modelListScroll.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement reset identity and bind the list ref**

Add a `modelListRef`; derive the reset key; and use a layout effect to set `scrollTop = 0` after the rendered result set changes. Do not reset when only a favorite button changes unless that favorite changes ordering and therefore the displayed result order.

- [ ] **Step 4: Prevent partial top-row rendering**

Make each row a stable scroll snap start and set the results container to `scroll-pt-0`. Keep search/sort outside the scroller, retain the fixed actions, and add an accessible `aria-label="Available models"`. Preserve the desktop grid.

- [ ] **Step 5: Extend component tests**

Assert the model list has the accessible label, bounded-scroller data marker, and complete-row scroll classes. Keep the existing Save/Test/Diagnostics assertions.

- [ ] **Step 6: Run focused tests and commit**

Run: `bun test tests/lib/modelListScroll.test.ts tests/components/settingsModal.test.tsx`

Expected: PASS.

Commit:

```powershell
git add src/lib/modelListScroll.ts src/components/SettingsModal.tsx tests/lib/modelListScroll.test.ts tests/components/settingsModal.test.tsx
git commit -m "fix: prevent clipped mobile model results"
```

---

### Task 7: v0.46 release bookkeeping and complete verification

**Files:**
- Modify: `src/version.ts`
- Modify: `package.json`
- Modify: `scripts/Start-LoreBible-Test.ps1`
- Modify: `scripts/Start-LoreBible.ps1`
- Modify: `tests/components/versionDisplay.test.tsx`
- Modify: `tests/contracts/version.test.ts`
- Modify: `tests/launcher/launcher.test.ts`
- Modify: `CHANGELOG.md`
- Modify: `docs/roadmap/README.md`
- Modify: `docs/roadmap/delivery-roadmap.md`

**Interfaces:**
- Produces: consistent visible/build/launcher version `0.46.0` and roadmap evidence.

- [ ] **Step 1: Write failing version expectations**

Change exact expectations from `0.45.0`/`v0.45` to `0.46.0`/`v0.46`, then run:

`bun test tests/contracts/version.test.ts tests/components/versionDisplay.test.tsx tests/launcher/launcher.test.ts`

Expected: FAIL against the old version.

- [ ] **Step 2: Update all release version surfaces**

Set package, UI, and both launcher expected-version values to 0.46.0. Do not change dependency versions.

- [ ] **Step 3: Update changelog and roadmap evidence**

Document what changed, why, tests performed, live-provider limitations, and v0.47 as the next slice. Correct the stale `docs/roadmap/README.md` progress summary. Keep the ordered count at 9 of 17 because v0.46 fixes M0/P4 obligations but does not complete M2.

- [ ] **Step 4: Run all deterministic gates**

Run:

```powershell
bun test
bun run typecheck
bun run build
git diff --check
```

Expected: all commands pass.

- [ ] **Step 5: Perform rendered responsive QA**

The flow under test is: open LoreBible -> open Connections -> choose a populated profile -> change sort/search -> first full model row is visible and fixed actions remain reachable; then Stage 1 -> Generate Fresh Premises -> prior cards remain during activity; then Stage 2 -> Reroll All -> navigate to the previous full board.

Check desktop and a representative Android viewport. Record page identity, nonblank content, framework-overlay absence, console health, screenshot evidence, and interaction proof. Do not make paid live calls unless explicitly authorized; a mocked/local route may prove UI lifecycle while real provider behavior remains unverified.

- [ ] **Step 6: Commit the release**

```powershell
git add src/version.ts package.json scripts/Start-LoreBible-Test.ps1 scripts/Start-LoreBible.ps1 tests/components/versionDisplay.test.tsx tests/contracts/version.test.ts tests/launcher/launcher.test.ts CHANGELOG.md docs/roadmap/README.md docs/roadmap/delivery-roadmap.md
git commit -m "release: ship LoreBible v0.46"
```

- [ ] **Step 7: Push the test branch after final verification**

Run: `git push origin test`

Expected: `origin/test` advances to the verified v0.46 release commit.
